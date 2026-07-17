// Prompt builder, tuned for Google's Nano Banana Pro (Gemini 3 Pro Image)
// architectural image editing. Each prompt describes the transformation while
// insisting the model PRESERVE the input geometry — the key move for
// image-to-image edits. The builders assemble a prompt from one-click scene
// choices (src/lib/scene.ts) so architects never write a prompt for a basic
// change; the UI textarea still lets them edit the result.

import type { RefineChipKey } from './refine';
import { REFINE_CHIPS } from './refine';
import { CONTEXTS, LIGHTING, MOODS, SEASONS, archStyleClause, defaultScene, materialsClause } from './scene';
import type { SceneOptions } from '../store/generation';

// --- Render -----------------------------------------------------------------

const CLAY_PROMPT =
  'Turn this architectural sketch into a clean clay / white-model massing render. ' +
  'Preserve the exact geometry and proportions of the original. ' +
  'Uniform matte off-white clay material with no textures, soft neutral studio lighting, ' +
  'gentle ambient occlusion in the recesses, subtle contact shadows on a plain light-grey ground, ' +
  'monochrome architectural massing study aesthetic.';

const LINE_PROMPT =
  'Convert this sketch into a precise black-and-white architectural line drawing. ' +
  'Preserve every edge, opening and proportion. ' +
  'Clean consistent line weights, crisp hidden-line-removed linework, pure white background, ' +
  'no shading and no colour, technical hand-drafted ink presentation aesthetic.';

const WATERCOLOUR_PROMPT =
  'Render this architectural sketch as an elegant architectural watercolour illustration. ' +
  'Preserve the geometry and composition. ' +
  'Soft translucent washes, loose confident edges, warm muted palette, subtle paper texture, ' +
  'gently graded skies, hand-painted presentation illustration, light and airy.';

export type RenderStyleKey = 'photoreal' | 'isometric' | 'clay' | 'line' | 'watercolour';

/**
 * 2D plan → 3D isometric "dollhouse" cutaway. The model extrudes the plan into
 * a roofless, open-topped volume seen at a strict 45° isometric angle so the
 * full interior is visible — the reference output architects asked for. The
 * geometry-preservation clauses keep the exact plan layout intact.
 */
function buildIsometricPrompt(a: SceneOptions): string {
  const parts: string[] = [
    "Transform this 2D architectural floor plan into a 3D isometric 'dollhouse' cutaway view.",
    'Extrude the walls upward to show verticality, apply realistic flooring and wall-surface textures, and render every piece of furniture, joinery and fixture in three dimensions.',
    'Use a strict 45-degree isometric camera angle looking down into the plan, with parallel projection and no perspective distortion.',
    'Maintain the exact room layout, wall positions, door and window openings and overall proportions of the original plan — do not move, add or remove rooms.',
    'Do not add a ceiling or roof: leave the rooms open from above so the whole interior is visible from the top.',
  ];
  const arch = archStyleClause(a);
  if (arch) parts.push(`Architectural style: ${arch}.`);
  if (MOODS[a.mood].clause) parts.push(`Mood: ${MOODS[a.mood].clause}.`);
  parts.push(
    'Clean neutral studio background, soft even ambient lighting, a subtle contact shadow beneath the model, ' +
      'professional architectural presentation render, ultra-detailed.',
  );
  return parts.join(' ');
}

/** Assemble a render prompt from the style + scene choices. */
export function buildRenderPrompt(a: { style: string } & SceneOptions): string {
  if (a.style === 'clay') return CLAY_PROMPT;
  if (a.style === 'line') return LINE_PROMPT;
  if (a.style === 'watercolour') return WATERCOLOUR_PROMPT;
  if (a.style === 'isometric') return buildIsometricPrompt(a);

  const interior = a.setting === 'interior';
  const parts: string[] = [
    `Transform this architectural sketch or plan into a photorealistic ${interior ? 'interior' : 'exterior'} render.`,
    'Preserve the exact geometry, proportions, massing and composition of the original drawing.',
  ];
  const arch = archStyleClause(a);
  if (arch) parts.push(`Architectural style: ${arch}.`);
  const materials = materialsClause(a);
  if (materials) parts.push(`Materials: ${materials}.`);
  parts.push(`Lighting: ${LIGHTING[a.lighting].clause}.`);
  if (interior) {
    parts.push("Interior view — preserve the room's layout, openings and proportions.");
  } else if (CONTEXTS[a.context].clause) {
    parts.push(`Context: ${CONTEXTS[a.context].clause}.`);
  }
  if (SEASONS[a.season].clause) parts.push(`Season: ${SEASONS[a.season].clause}.`);
  if (MOODS[a.mood].clause) parts.push(`Mood: ${MOODS[a.mood].clause}.`);
  parts.push(a.entourage ? 'Include a few softly rendered people for scale.' : 'No people.');
  parts.push(
    'Physically based rendering, high dynamic range, crisp material detail, professional architectural ' +
      'visualization, 24mm architectural lens, eye-level view, ultra-detailed.',
  );
  return parts.join(' ');
}

// --- Elevation --------------------------------------------------------------

const ELEVATION_STYLE_CLAUSE: Record<string, string> = {
  line: 'Precise consistent line weights, hidden-line-removed monochrome technical drafting linework, no shading.',
  rendered:
    'Fully rendered materials and colour with soft frontal daylight, subtle shadows and material texture — a presentation elevation.',
  shaded:
    'Greyscale shaded elevation with soft tonal shadows describing depth and relief, restrained material hatching.',
};

type ElevationSceneArgs = Pick<SceneOptions, 'materials' | 'customMaterials' | 'lighting' | 'mood'>;

/** `face === null` yields a face-neutral base (the all-faces batch appends the per-face clause). */
export function buildElevationPrompt(a: { face: 'Front' | 'Side' | 'Rear' | null; style: string } & ElevationSceneArgs): string {
  const faceClause =
    a.face === null
      ? 'elevation'
      : a.face === 'Front'
        ? 'front elevation, viewed straight-on'
        : a.face === 'Rear'
          ? 'rear elevation, viewed straight-on from behind'
          : "side elevation, a true orthographic view of the building's flank";
  const styleClause = ELEVATION_STYLE_CLAUSE[a.style] ?? ELEVATION_STYLE_CLAUSE.rendered;

  const parts: string[] = [
    `Produce a clean, orthographic ${faceClause} of the building shown, as a flat architectural drawing.`,
    'Maintain accurate proportions and align every element to a true vertical and horizontal grid with no perspective. Neutral white background.',
  ];
  if (a.style === 'rendered') {
    parts.push(`Lighting: ${LIGHTING[a.lighting].clause}.`);
  }
  parts.push(styleClause);
  if (MOODS[a.mood].clause) parts.push(`${MOODS[a.mood].clause}.`);
  return parts.join(' ');
}

// --- Axonometric ------------------------------------------------------------

export type AxonStyleKey = 'realistic' | 'lineart' | 'bw';

/**
 * The critical move: a flat elevation must be REBUILT as a 3D volume and rotated
 * to a corner view, not reproduced front-on. Without this the model just returns
 * the input elevation lightly cleaned up (the reported bug). The viewpoint
 * (NE/NW/SE/SW) is appended per-image by the provider and reinforces the corner.
 *
 * This is a pure conversion of an already-rendered image, so it never introduces
 * or restyles materials — the realistic style preserves the input's materials,
 * colours and textures exactly.
 */
export function buildAxonometricPrompt(a: { section: boolean; style: string }): string {
  const parts: string[] = [
    'Rebuild the building shown in this elevation as a three-dimensional massing model and present it as an architectural axonometric view.',
    'Rotate to a three-quarter corner viewpoint seen from slightly above, so the front face, the returning side wall and the roof are all clearly visible and the building reads with genuine depth and volume — do NOT reproduce a flat, front-on elevation.',
    'Use parallel (axonometric / isometric) projection at roughly a 30–45 degree angle with no perspective distortion. Infer a sensible building depth and roof form from the elevation, and keep the façade details, openings and proportions consistent with it.',
  ];
  if (a.style === 'lineart') {
    parts.push(
      'Draw it as a clean colour line-art axonometric illustration: crisp confident outlines with light flat colour fills and minimal shading, centred on a plain white background.',
    );
  } else if (a.style === 'bw') {
    parts.push(
      'Draw it as a pure black-and-white line axonometric: consistent hidden-line-removed technical linework, no colour and no shading, centred on a plain white background.',
    );
  } else {
    parts.push(
      'Preserve the exact materials, colours and textures shown in the input image — do not change, add or restyle any material. ' +
        'Render it as a realistic three-dimensional presentation model with soft natural daylight and gentle contact shadows, on a clean neutral background with a soft drop shadow.',
    );
  }
  if (a.section) {
    parts.push(
      'Additionally cut it as a section-axonometric: slice through the volume to reveal interior floor plates, structure ' +
        'and rooms, with solid poché-filled cut surfaces.',
    );
  }
  return parts.join(' ');
}

// --- Refine -----------------------------------------------------------------

/** Turn the refine chips + free text into an edit instruction (P2). */
export function buildRefinePrompt(a: { chips: string[]; freeText: string }): string {
  const changes = a.chips
    .map((c) => REFINE_CHIPS.find((r) => r.key === (c as RefineChipKey))?.clause)
    .filter((c): c is string => Boolean(c));
  const free = a.freeText.trim();
  if (free) changes.push(free);
  const list = changes.length ? changes.join('; ') : 'subtly improve the image';
  return (
    'Edit this image. Keep the composition, geometry, camera angle and proportions exactly as shown. ' +
    `Apply only these changes: ${list}.`
  );
}

// --- Legacy wrappers (default scene) ----------------------------------------
// Used by generation.ts for the initial suggested prompt; the feature screens
// call the builders above directly with live scene choices.

export function renderPrompt(style: string): string {
  return buildRenderPrompt({ style, ...defaultScene() });
}

export function elevationPrompt(face: string, style: string): string {
  const { materials, customMaterials, lighting, mood } = defaultScene();
  const f = face === 'All' ? null : (face as 'Front' | 'Side' | 'Rear');
  return buildElevationPrompt({ face: f, style, materials, customMaterials, lighting, mood });
}

export function axonometricPrompt(section: boolean, style = 'realistic'): string {
  return buildAxonometricPrompt({ section, style });
}
