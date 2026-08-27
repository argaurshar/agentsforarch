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
