// Generation options and their per-engine normalisation.
//
// A LEAF module: it deliberately does not import `FeatureKind`, so the feature
// registry can name `GenerateOptions` without depending on `providers/types.ts`,
// which depends on the registry.

/**
 * Every ratio the app may ask for. Previously `aspectRatio?: string`, which meant
 * an illegal value was only discovered as a runtime 400 — after the request was
 * already in flight. ~10 of the planned tools pin a specific ratio, so this is
 * about to matter a lot more than it did with two call sites.
 */
export const ASPECT_RATIOS = ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export type Resolution = '1K' | '2K' | '4K';

/** One primary input plus references. The old hard cap was 2 images, total. */
export const MAX_INPUT_IMAGES = 4;
export const MAX_REFERENCE_IMAGES = 2;

export interface GenerateOptions {
  style?: string;
  viewpoints?: string[]; // axonometric viewpoints, or elevation faces for the all-faces batch
  variations?: number; // how many outputs, default 1
  section?: boolean; // axonometric: also cut a section-axonometric
  /** Style references / mood boards, sent AFTER the inputs. */
  referenceImages?: string[];
  styleVariants?: { label: string; clause: string }[]; // compare-styles batch
  refine?: boolean; // an iterative refine of an existing output
  aspectRatio?: AspectRatio;
  /** kie.ai hardcoded '1K'; the print-upscale tool needs to exceed it. */
  resolution?: Resolution;
  /**
   * Let the model look facts up with Google Search before it draws. Only the
   * tools that STATE facts set it (dates, places, real buildings). Gemini only:
   * kie.ai has no equivalent, so the kie provider ignores it and those tools
   * say so through `engineSupportsGrounding()` rather than silently degrading.
   */
  grounding?: boolean;
  /**
   * Reframe & Extend: pad the first input to this ratio before sending, and
   * (with keepOriginal) paste its pixels back over the result. Applied by
   * `runFeature`, never by a provider — it is canvas work, not transport.
   */
  reframe?: { ratio: AspectRatio; anchor: 'centre' | 'top' | 'bottom'; keepOriginal: boolean };
  /** Construction Phasing: one output per named stage, same camera. */
  stages?: string[];
}

const GEMINI_ACCEPTS = new Set<AspectRatio>(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']);

/**
 * Gemini rejects 'auto' outright and only accepts the fixed set above.
 * `undefined` means omit `imageConfig` entirely, which makes an edit follow the
 * input image's own ratio — measured behaviour, not an assumption.
 */
export function geminiAspect(a: AspectRatio | undefined): string | undefined {
  return !a || a === 'auto' || !GEMINI_ACCEPTS.has(a) ? undefined : a;
}

/** kie.ai accepts 'auto' and follows the input image with it. */
export function kieAspect(a: AspectRatio | undefined): string {
  return a ?? 'auto';
}

/**
 * The supported ratio closest to a width × height — compared in log space, so
 * 2:1 is as far from 1:1 as 1:2 is.
 */
export function nearestAspect(w: number, h: number): AspectRatio | undefined {
  if (!(w > 0 && h > 0)) return undefined;
  const r = Math.log(w / h);
  let best: AspectRatio | undefined;
  let gap = Infinity;
  for (const a of GEMINI_ACCEPTS) {
    const [x, y] = a.split(':').map(Number);
    const d = Math.abs(Math.log(x / y) - r);
    if (d < gap) {
      gap = d;
      best = a;
    }
  }
  return best;
}

/**
 * Width and height read straight from a PNG or JPEG data URL's header — no
 * DOM, so it works in the browser and in the Node harness alike. Null for
 * anything else (a remote URL, WebP, a damaged header).
 */
export function dataUrlSize(url: string): { w: number; h: number } | null {
  const comma = url.indexOf(',');
  if (!url.startsWith('data:') || comma < 0) return null;
  // The headers live in the first few KB; decode only that much.
  const b64 = url.slice(comma + 1, comma + 1 + 87384).replace(/[^A-Za-z0-9+/]/g, '');
  let bin: string;
  try {
    bin = atob(b64.slice(0, b64.length - (b64.length % 4)));
  } catch {
    return null;
  }
  const at = (i: number) => bin.charCodeAt(i);
  const u16 = (i: number) => (at(i) << 8) | at(i + 1);
  if (bin.startsWith('\x89PNG')) {
    return { w: ((at(16) << 24) | (at(17) << 16) | u16(18)) >>> 0, h: ((at(20) << 24) | (at(21) << 16) | u16(22)) >>> 0 };
  }
  if (at(0) === 0xff && at(1) === 0xd8) {
    let i = 2;
    while (i + 9 < bin.length) {
      if (at(i) !== 0xff) {
        i += 1;
        continue;
      }
      const m = at(i + 1);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: u16(i + 7), h: u16(i + 5) };
      i += 2 + u16(i + 2);
    }
  }
  return null;
}

/**
 * The ratio to ask for when a request carries more than one image.
 *
 * Measured live (build plan Phase 0): with two images and no imageConfig,
 * Gemini sizes the output from the LAST image, not the first. A portrait room
 * plus a square painting came back square (O3); a 3:2 massing plus a wide
 * reference came back wide (X1) — the input reframed to the reference's shape.
 * So a multi-image request with no pinned ratio is pinned to the FIRST image,
 * the one the prompt calls the design.
 */
export function effectiveAspect(requested: AspectRatio | undefined, inputImages: string[]): AspectRatio | undefined {
  if (requested) return requested;
  if (inputImages.length < 2) return undefined;
  const size = dataUrlSize(inputImages[0]);
  return size ? nearestAspect(size.w, size.h) : undefined;
}
