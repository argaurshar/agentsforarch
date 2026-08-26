import { featureDef } from '../features/registry';
import { outputLabels } from './labels';
import type { GenerateRequest } from './types';

// Provider-neutral pieces of the generate flow. Both engines (Gemini and
// kie.ai) expand a request into the same per-image jobs and share the same
// abort-aware pacing, so switching engines never changes batch semantics.

export interface Inline {
  mimeType: string;
  data: string;
}

export function inlineFromDataUrl(dataUrl: string): Inline {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error('The input image could not be read (expected a base64 data URL).');
  return { mimeType: match[1], data: match[2] };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Resolve any image the app holds to inline base64.
 *
 * Not every stored image is a dataURL: when kie.ai's CDN blocks a browser fetch
 * it falls back to returning the REMOTE result URL so the paid-for image is not
 * lost. Feeding that straight to `inlineFromDataUrl` threw, and because a
 * reference image is resolved once for the whole batch, one such image killed
 * every job in the run — after the user had already paid.
 */
export async function toInline(url: string, signal?: AbortSignal): Promise<Inline> {
  if (url.startsWith('data:')) return inlineFromDataUrl(url);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Could not read that image (it may have expired — download it and re-upload).');
  return inlineFromDataUrl(await blobToDataUrl(await res.blob()));
}

/** Expand a request into one prompt+label per output image. */
export function jobsFor(req: GenerateRequest, base: string): { label: string; prompt: string }[] {
  const labels = outputLabels(req);
  // A refine is always a single edit of one existing output.
  if (req.options.refine) {
    return [{ label: labels[0] ?? 'Refined', prompt: base }];
  }
  // Compare-styles batch: one job per design language, same base prompt.
  const variants = req.options.styleVariants;
  if (variants?.length) {
    const kind = req.feature === 'interior' ? 'Design style' : 'Architectural style';
    return variants.map((v, i) => ({
      label: labels[i],
      prompt: `${base}\n\n${kind}: ${v.clause}.`,
    }));
  }
  // Per-feature batch expansion lives on the tool's registry entry — including
  // its prompt clauses, which used to sit right here. Prompt text inside the
  // transport layer was a layering violation, and the if-chain it lived in fell
  // THROUGH for any feature it didn't name, quietly giving a new tool the
  // render "variations" behaviour instead of its own.
  const custom = featureDef(req.feature).jobsFor?.(req, base, labels);
  if (custom) return custom;

  const variations = Math.max(1, req.options.variations ?? 1);
  return Array.from({ length: variations }, (_, i) => ({
    label: labels[i],
    prompt: variations > 1 ? `${base}\n\nAlternative composition ${i + 1}.` : base,
  }));
}

/** Sleep that resolves early (does not reject) when the signal aborts. */
export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (!ms || signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done);
  });
}

/** The neutral fallback instruction when a feature sends no prompt. */
export const FALLBACK_PROMPT =
  'Reimagine this architectural input as a polished presentation image while preserving its geometry and proportions.';
