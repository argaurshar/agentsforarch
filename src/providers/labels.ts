import type { GenerateRequest } from './types';

// Shared output-label logic so every provider (Nano Banana Pro, Magnific, …)
// labels its outputs identically — switching providers never changes the labels.

const STYLE_LABELS: Record<string, string> = {
  photoreal: 'Photoreal',
  isometric: 'Isometric',
  clay: 'Clay model',
  line: 'Line drawing',
  watercolour: 'Watercolour',
  rendered: 'Rendered',
  shaded: 'Shaded',
  standard: 'Axonometric',
  section: 'Section axonometric',
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
  if (req.feature === 'axonometric') {
    const viewpoints = req.options.viewpoints?.length ? req.options.viewpoints : ['NE'];
    const section = req.options.style === 'section';
    return viewpoints.map((vp) => `${vp} axonometric${section ? ' — section' : ''}`);
  }
  if (req.feature === 'elevation') {
    const faces = req.options.viewpoints?.length ? req.options.viewpoints : [undefined];
    const styleLabel = prettyStyle(req.options.style, 'Rendered');
    return faces.map((face) => (face ? `${face} elevation — ${styleLabel}` : `${styleLabel} elevation`));
  }
  const variations = Math.max(1, req.options.variations ?? 1);
  const styleLabel = prettyStyle(req.options.style, 'Render');
  return Array.from({ length: variations }, (_, i) => `${styleLabel} — variation ${i + 1}`);
}
