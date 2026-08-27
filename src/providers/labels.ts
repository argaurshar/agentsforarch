import { featureDef } from '../features/registry';
import type { GenerateRequest } from './types';

// Shared output-label logic so every provider (Nano Banana Pro, Magnific, …)
// labels its outputs identically — switching providers never changes the labels.

const STYLE_LABELS: Record<string, string> = {
  photoreal: 'Photoreal',
  isometric: 'Isometric',
  plan2d: 'Furnished plan',
  clay: 'Clay model',
  line: 'Line drawing',
  watercolour: 'Watercolour',
  rendered: 'Rendered',
  shaded: 'Shaded',
  standard: 'Axonometric',
  section: 'Section axonometric',
  realistic: 'Realistic',
  lineart: 'Line art',
  bw: 'Black & white',
  restyle: 'Restyled interior',
  stage: 'Staged interior',
  renovate: 'Renovated interior',
};

export function prettyStyle(style: string | undefined, fallback: string): string {
  if (!style) return fallback;
  return STYLE_LABELS[style] ?? style.charAt(0).toUpperCase() + style.slice(1);
}

/** One label per output image the request will produce, in order. */
export function outputLabels(req: GenerateRequest): string[] {
  if (req.options.refine) {
    return [`${prettyStyle(req.options.style, 'Image')} — refined`];
  }
  if (req.options.styleVariants?.length) {
    return req.options.styleVariants.map((v) => v.label);
  }
  // Per-feature labelling lives on the tool's registry entry. The old if-chain
  // here fell THROUGH for any feature it didn't name, silently labelling a new
  // tool's outputs "Render — variation 1".
  const custom = featureDef(req.feature).labelsFor?.(req, prettyStyle);
  if (custom) return custom;
  const variations = Math.max(1, req.options.variations ?? 1);
  const styleLabel = prettyStyle(req.options.style, 'Render');
  return Array.from({ length: variations }, (_, i) => `${styleLabel} — variation ${i + 1}`);
}
