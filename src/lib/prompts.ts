// Auto-generated default prompts, tuned for Google's Nano Banana Pro
// (Gemini 3 Pro Image) architectural image editing. Each prompt describes the
// transformation while insisting the model PRESERVE the input geometry — the
// key move for image-to-image edits. Users can edit these in the UI, but they
// never have to write one from scratch.

const RENDER_PROMPTS: Record<string, string> = {
  photoreal:
    'Transform this architectural sketch or plan into a photorealistic exterior render. ' +
    'Preserve the exact geometry, proportions, massing and composition of the original drawing. ' +
    'Materials: board-formed concrete, warm oak slats, matte black steel, floor-to-ceiling low-iron glazing. ' +
    'Lighting: golden-hour sun, soft directional shadows, subtle ambient occlusion, gentle reflections on glass, clear sky. ' +
    'Physically based rendering, high dynamic range, crisp material detail, professional architectural visualization, ' +
    '24mm architectural lens, eye-level view, ultra-detailed.',
  clay:
    'Turn this architectural sketch into a clean clay / white-model massing render. ' +
    'Preserve the exact geometry and proportions of the original. ' +
    'Uniform matte off-white clay material with no textures, soft neutral studio lighting, ' +
    'gentle ambient occlusion in the recesses, subtle contact shadows on a plain light-grey ground, ' +
    'monochrome architectural massing study aesthetic.',
  line:
    'Convert this sketch into a precise black-and-white architectural line drawing. ' +
    'Preserve every edge, opening and proportion. ' +
    'Clean consistent line weights, crisp hidden-line-removed linework, pure white background, ' +
    'no shading and no colour, technical hand-drafted ink presentation aesthetic.',
  watercolour:
    'Render this architectural sketch as an elegant architectural watercolour illustration. ' +
    'Preserve the geometry and composition. ' +
    'Soft translucent washes, loose confident edges, warm muted palette, subtle paper texture, ' +
    'gently graded skies, hand-painted presentation illustration, light and airy.',
};

export function renderPrompt(style: string): string {
  return RENDER_PROMPTS[style] ?? RENDER_PROMPTS.photoreal;
}

const ELEVATION_STYLE_CLAUSE: Record<string, string> = {
  line: 'Precise consistent line weights, hidden-line-removed monochrome technical drafting linework, no shading.',
  rendered:
    'Fully rendered materials and colour with soft frontal daylight, subtle shadows and material texture — a presentation elevation.',
  shaded:
    'Greyscale shaded elevation with soft tonal shadows describing depth and relief, restrained material hatching.',
};

export function elevationPrompt(face: string, style: string): string {
  const clause = ELEVATION_STYLE_CLAUSE[style] ?? ELEVATION_STYLE_CLAUSE.rendered;
  return (
    `Produce a clean, orthographic ${face.toLowerCase()} elevation of the building shown, as a flat frontal ` +
    'architectural drawing. Maintain accurate proportions and align every element to a true vertical and ' +
    'horizontal grid with no perspective. Neutral white background. ' +
    clause
  );
}

export function axonometricPrompt(section: boolean): string {
  const base =
    'Generate an architectural axonometric (parallel-projection, roughly 30-degree isometric) view of the ' +
    'building from the elevation shown. Preserve façade details, openings and proportions with no perspective ' +
    'distortion. Present it on a clean neutral background with a soft drop shadow, as a professional ' +
    'presentation drawing.';
  if (!section) return base;
  return (
    `${base} Cut it as a section-axonometric: slice through the volume to reveal interior floor plates, ` +
    'structure and rooms, with solid poché-filled cut surfaces.'
  );
}
