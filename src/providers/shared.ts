import { outputLabels } from './labels';
import type { GenerateRequest } from './types';

// Provider-neutral pieces of the generate flow. Both engines (Gemini and
// kie.ai) expand a request into the same per-image jobs and share the same
// abort-aware pacing, so switching engines never changes batch semantics.

const VIEWPOINT_FULL: Record<string, string> = {
  NE: 'north-east',
  NW: 'north-west',
  SE: 'south-east',
  SW: 'south-west',
};

export function inlineFromDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error('The input image could not be read (expected a base64 data URL).');
  return { mimeType: match[1], data: match[2] };
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
  if (req.feature === 'axonometric') {
    const viewpoints = req.options.viewpoints?.length ? req.options.viewpoints : ['NE'];
    return viewpoints.map((vp, i) => ({
      label: labels[i],
      prompt: `${base}\n\nViewpoint: ${VIEWPOINT_FULL[vp] ?? vp} axonometric.`,
    }));
  }
  if (req.feature === 'elevation') {
    // The "all faces" batch expands to one job per requested face. Side and
    // rear must be RECONSTRUCTED — with a front-on input the model otherwise
    // just redraws the front face again (verified live), so those clauses
    // forbid it explicitly and say how to infer the unseen face.
    const FACE_CLAUSE: Record<string, string> = {
      front: 'the front elevation — the face shown in the input image, viewed straight-on with no perspective',
      side:
        'NOT the face shown in the input image. First understand the building as a three-dimensional volume — infer its depth (front-to-back), its roof form and its materials from the face shown. ' +
        "Then draw ONLY the building's RIGHT SIDE face — the flank you would see standing to the right of the building, looking at it at 90 degrees to the input face. " +
        'This side face is a DIFFERENT drawing from the input: its width is the building’s front-to-back depth, it has no entry door and no garage door, and it shows fewer, smaller windows appropriate to a private flank, ' +
        'with the same material palette and roof lines carried around the corner',
      rear:
        'NOT the face shown in the input image. First understand the building as a three-dimensional volume — infer its depth, roof form and materials from the face shown. ' +
        'Then draw ONLY the building’s REAR face — the back of the building, directly opposite the input face, viewed straight-on from behind. ' +
        'This rear face is a DIFFERENT drawing from the input: no entry door and no garage door, typically larger glazing opening to the garden, ' +
        'with the same material palette and roof lines carried around the building',
    };
    const faces = req.options.viewpoints?.length ? req.options.viewpoints : null;
    if (faces && faces.length > 1) {
      return faces.map((face, i) => ({
        label: labels[i],
        prompt: `${base}\n\nFace: ${FACE_CLAUSE[face.toLowerCase()] ?? `the ${face.toLowerCase()} elevation, viewed straight-on with no perspective`}.`,
      }));
    }
    return [{ label: labels[0], prompt: base }];
  }
  // render
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
