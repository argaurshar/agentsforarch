// Prompt builder, tuned for Google's Nano Banana Pro (Gemini 3 Pro Image)
// architectural image editing. Each prompt describes the transformation while
// insisting the model PRESERVE the input geometry — the key move for
// image-to-image edits. The builders assemble a prompt from one-click scene
// choices (src/lib/scene.ts) so architects never write a prompt for a basic
// change; the UI textarea still lets them edit the result.

import {
  FOOTPRINT_CHECK,
  FOOTPRINT_LOCK,
  FOOTPRINT_READ,
  NO_NEW_DRAPERY,
  NO_TEXT,
  SHELL_CHECK,
  SHELL_LOCK,
  SHELL_READ,
  STYLE_REF_CLAUSE,
} from './prompt/clauses';
import { ALL_REFINE_CHIPS } from './refine';
import {
  CONTEXTS,
  LIGHTING,
  MOODS,
  SEASONS,
  archStyleClause,
  elevationThemeClause,
  interiorThemeClause,
  materialsClause,
} from './scene';
import type { ElevationThemeKey, InteriorMode, InteriorThemeKey, RoomTypeKey, SceneOptions } from '../store/generation';

// --- Render -----------------------------------------------------------------

// Shared exclusion clause (skill: state what to leave out as plainly as what to
// include). Nano Banana happily copies a plan's text labels or invents captions
// unless told not to — the most common "prompt not working" complaint.
const CLAY_PROMPT =
  'Turn this architectural sketch into a clean clay / white-model massing render. ' +
  'Preserve the exact geometry and proportions of the original. ' +
  'Uniform matte off-white clay material with no textures, soft neutral studio lighting, ' +
  'gentle ambient occlusion in the recesses, subtle contact shadows on a plain light-grey ground, ' +
  'monochrome architectural massing study aesthetic. ' +
  NO_TEXT;

const LINE_PROMPT =
  'Convert this sketch into a precise black-and-white architectural line drawing. ' +
  'Preserve every edge, opening and proportion. ' +
  'Clean consistent line weights, crisp hidden-line-removed linework, pure white background, ' +
  'no shading and no colour, technical hand-drafted ink presentation aesthetic.';

// Style unions live with the settings that carry them (store/generation.ts).
// This file used to declare its own copy, which had already drifted: it was
// missing 'plan2d', a style the builder below actually handles.
export type { RenderStyleKey } from '../store/generation';
import type { AxonSource } from '../store/generation';

/**
 * 2D plan → 3D isometric cutaway. Staged deliberately: read the plan, lock the
 * geometry, and only then build in 3D — the same "understand it first, then
 * draw" structure that fixed the elevation feature's side/rear faces. Invention
 * (materials, furniture, lighting) is subordinated behind the geometry so it
 * competes with it as little as possible.
 */
function buildIsometricPrompt(a: SceneOptions): string {
  const parts: string[] = [
    'You are converting an existing architectural floor plan into a 3D isometric cutaway view. The plan’s geometry is ' +
      'fixed survey data, not a starting suggestion — the output must be the SAME building, seen in three dimensions.',
    FOOTPRINT_READ,
    FOOTPRINT_LOCK,
    'STEP 3 — ONLY THEN BUILD IT IN 3D. Extrude the walls to a consistent storey height and apply realistic floor and ' +
      'wall finishes. Every furniture, joinery and fixture symbol drawn on the plan is GEOMETRY, NOT ANNOTATION: replace ' +
      'each symbol with the real object it represents — a bed symbol becomes a bed, a hob and sink become a fitted ' +
      'kitchen run, a WC and basin become the real fixtures, a hatched rectangle becomes a wardrobe — each in the same ' +
      'position, at the same size and in the same orientation as the symbol. Add no furniture that is not drawn on the ' +
      'plan, and omit none that is.',
    'Camera: a strict 45-degree isometric view in parallel projection, looking down into the plan, with no perspective ' +
      'distortion. Leave the model open from above — no roof, no ceiling — so the whole interior is visible.',
    'Remove only the plan’s typed text, room-name labels and dimension strings. The finished image contains no text or numbers anywhere.',
  ];
  const arch = archStyleClause(a);
  if (arch) parts.push(`Architectural style: ${arch}.`);
  if (MOODS[a.mood].clause) parts.push(`Mood: ${MOODS[a.mood].clause}.`);
  parts.push(
    'Clean neutral studio background, soft even ambient lighting, a subtle contact shadow beneath the model, ' +
      'professional architectural presentation render, ultra-detailed.',
    FOOTPRINT_CHECK,
    NO_TEXT,
  );
  return parts.join(' ');
}

/**
 * 2D plan → fully furnished, coloured top-down marketing plan. Unlike the
 * isometric, this stays strictly flat: no extrusion, no perspective — the
 * brochure staple for residential projects.
 */
function buildFurnishedPlanPrompt(a: SceneOptions): string {
  // The flat mode carried a character-for-character copy of the isometric's old
  // interior-only preservation clause, so it had the identical footprint blind
  // spot. It gets the same staged treatment.
  const parts: string[] = [
    'You are rendering an existing architectural floor plan as a beautifully finished, fully furnished top-down 2D ' +
      'presentation plan. The plan’s geometry is fixed survey data — the output must be the SAME plan, drawn better.',
    FOOTPRINT_READ,
    FOOTPRINT_LOCK,
    'Keep the view strictly top-down orthographic — flat, with no perspective and no 3D extrusion of the walls.',
    'Render realistic flooring materials per room, and every furniture and fixture symbol as the real object it ' +
      'represents drawn in clean top view — each in the same position, at the same size and in the same orientation as ' +
      'the symbol. Add nothing that is not drawn, omit nothing that is. Soft subtle drop shadows for depth, and a crisp ' +
      'white background around the plan.',
    'Re-set the room names as small, clean, minimal sans-serif labels; drop the dimension strings and annotation marks.',
  ];
  const arch = archStyleClause(a);
  if (arch) parts.push(`Architectural style: ${arch}.`);
  if (MOODS[a.mood].clause) parts.push(`Mood: ${MOODS[a.mood].clause}.`);
  parts.push(
    'Professional architectural presentation graphics, ultra-detailed, print quality. No watermark or signature.',
    FOOTPRINT_CHECK,
  );
  return parts.join(' ');
}

/** Assemble a render prompt from the style + scene choices (+ optional style reference). */
export function buildRenderPrompt(a: { style: string; useStyleRef?: boolean } & SceneOptions): string {
  const base = renderBase(a);
  return a.useStyleRef ? `${base} ${STYLE_REF_CLAUSE}` : base;
}

function renderBase(a: { style: string } & SceneOptions): string {
  if (a.style === 'clay') return CLAY_PROMPT;
  if (a.style === 'line') return LINE_PROMPT;
  if (a.style === 'isometric') return buildIsometricPrompt(a);
  if (a.style === 'plan2d') return buildFurnishedPlanPrompt(a);

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
    'As if shot on a 24mm tilt-shift architectural lens at eye level, verticals kept true. ' +
      'Physically based rendering, high dynamic range, crisp material detail, natural colour grade, ' +
      'professional architectural visualization that reads as a photograph, ultra-detailed. ' +
      'No warped or bowed glazing, no lens flare, no oversaturation.',
    NO_TEXT,
  );
  return parts.join(' ');
}

// --- Elevation --------------------------------------------------------------

const ELEVATION_STYLE_CLAUSE: Record<string, string> = {
  line: 'Precise consistent line weights, hidden-line-removed monochrome technical drafting linework, no shading.',
  rendered:
    'Render it with photorealistic materials, colour, depth and relief — soft frontal daylight, subtle cast shadows and rich material texture, a realistic 3D-rendered presentation elevation.',
  shaded:
    'Greyscale shaded elevation with soft tonal shadows describing depth and relief, restrained material hatching.',
};

type ElevationSceneArgs = Pick<SceneOptions, 'materials' | 'customMaterials' | 'lighting' | 'mood'>;

interface ElevationStyleArgs {
  theme?: ElevationThemeKey; // design language (ignored when a mood board / style reference drives the render)
  useMoodboard?: boolean; // a reference mood-board image is attached to the request
  useStyleRef?: boolean; // a pooled image is attached as a style reference (reference-chaining)
}

/** `face === null` yields a face-neutral base (the all-faces batch appends the per-face clause). */
export function buildElevationPrompt(
  a: { face: 'Front' | 'Side' | 'Rear' | null; style: string } & ElevationSceneArgs & ElevationStyleArgs,
): string {
  // The face is a noun phrase; the viewing direction is its own sentence so the
  // opening line stays grammatical for every face (and for the all-faces base).
  const faceNoun = a.face === null ? 'elevation' : `${a.face.toLowerCase()} elevation`;
  const styleClause = ELEVATION_STYLE_CLAUSE[a.style] ?? ELEVATION_STYLE_CLAUSE.rendered;

  // Side and rear must be RECONSTRUCTED, so their openings demand a 3D read of
  // the building first and forbid redrawing the input face — with a front-on
  // input the model otherwise just returns the front again (verified live).
  const parts: string[] =
    a.face === 'Side' || a.face === 'Rear'
      ? [
          'The input image shows one face of a building. Your task is NOT to draw that face.',
          'First understand the building as a three-dimensional volume: infer its depth (front-to-back), its roof form and its materials from the face shown.',
          a.face === 'Side'
            ? "Then draw ONLY the building's RIGHT SIDE face — the flank you would see standing to the right of the building, looking at it at 90 degrees to the input face — as a clean, flat orthographic architectural elevation. This side face is a DIFFERENT drawing from the input: its width is the building's front-to-back depth, it has no entry door and no garage door, and it shows fewer, smaller windows appropriate to a private flank, with the same material palette and roof lines carried around the corner."
            : "Then draw ONLY the building's REAR face — the back of the building, directly opposite the input face, viewed straight-on from behind — as a clean, flat orthographic architectural elevation. This rear face is a DIFFERENT drawing from the input: no entry door and no garage door, typically larger glazing opening to the garden, with the same material palette and roof lines carried around the building.",
          'Perfectly flat and straight-on, aligned to a true vertical and horizontal grid with no perspective. Neutral white background.',
        ]
      : [
          `Produce a clean orthographic ${faceNoun} of the building shown in the input image, as a flat architectural drawing.`,
          'Viewed perfectly straight-on.',
          'Maintain accurate proportions and align every element to a true vertical and horizontal grid with no perspective. Neutral white background.',
        ];
  if (a.style === 'rendered') {
    // Lighting is applied as façade illumination only — the drawing itself must
    // stay flat, so the scene clause must not pull the model into a 3D view.
    parts.push(
      `Light the façade with ${LIGHTING[a.lighting].clause} — applied purely as illumination and shadow across the flat elevation, never tilting it into perspective.`,
    );
  }
  parts.push(styleClause);
  // A rendered elevation can be driven by a design theme OR a reference mood board
  // (mutually exclusive). The mood board is attached to the request as a second image.
  if (a.style === 'rendered') {
    if (a.useMoodboard) {
      parts.push(
        'Restyle the elevation to match the design language, materials, colour palette, textures and overall mood of the attached reference mood-board image, ' +
          'while keeping the exact geometry, proportions, openings and layout of the elevation unchanged.',
      );
    } else if (a.useStyleRef) {
      parts.push(
        'Restyle the elevation to match the design language, materials, colour palette, textures and overall mood of the attached reference image, ' +
          'while keeping the exact geometry, proportions, openings and layout of the elevation unchanged.',
      );
    } else if (a.theme && elevationThemeClause(a.theme)) {
      parts.push(`Design theme: ${elevationThemeClause(a.theme)}.`);
    }
  }
  if (MOODS[a.mood].clause) parts.push(`${MOODS[a.mood].clause}.`);
  parts.push(NO_TEXT);
  return parts.join(' ');
}

// --- Interior design --------------------------------------------------------

const ROOM_TYPE_LABEL: Record<RoomTypeKey, string> = {
  living: 'living room',
  bedroom: 'bedroom',
  kitchen: 'kitchen',
  bathroom: 'bathroom',
  dining: 'dining room',
  office: 'home office / study',
};

interface InteriorPromptArgs {
  mode: InteriorMode;
  roomType: RoomTypeKey;
  theme: InteriorThemeKey;
  useMoodboard?: boolean; // a reference mood-board image is attached to the request
  useStyleRef?: boolean; // a pooled image is attached as a style reference (reference-chaining)
  mood: SceneOptions['mood'];
}

/**
 * Room photo → restyled / staged / renovated interior. Each mode is staged the
 * same way the plan and elevation features are: read the room, lock what is not
 * yours to change, and only then design — so the output reads as the client’s own
 * room redesigned, not a room that resembles it.
 */
export function buildInteriorPrompt(a: InteriorPromptArgs): string {
  const room = ROOM_TYPE_LABEL[a.roomType];
  const parts: string[] = [];
  if (a.mode === 'stage') {
    parts.push(
      `You are virtually staging a real, existing ${room}. The photo shows the room empty or barely furnished. Your job ` +
        'is to place furniture and décor into it — nothing else. You are not redesigning the room, renovating it or ' +
        'rebuilding it.',
      SHELL_READ,
      SHELL_LOCK,
      NO_NEW_DRAPERY,
      'Also leave the existing surfaces alone: keep the wall colour and finish, the flooring, the ceiling and the ' +
        'skirtings as they are.',
      `STEP 3 — ONLY THEN FURNISH IT. Into that unchanged shell, place free-standing furniture, rugs, floor and table ` +
        `lamps, cushions, throws, plants, books, ceramics, framed art hung flat against an existing wall and styling ` +
        `accessories, arranged as a professional stylist would for a ${room}. Every single thing you add must be an ` +
        'object that could be carried back out of the room again — nothing built, fitted, mounted into a wall or cut ' +
        'into the shell.',
    );
  } else if (a.mode === 'renovate') {
    parts.push(
      `Renovate this ${room}.`,
      SHELL_READ,
      'STEP 2 — LOCK THE SHELL. You may replace the finishes — flooring, wall treatment, ceiling design, joinery, door ' +
        'leaves, fittings and fixtures — and refurnish the space completely. You may NOT change the room’s shape or its ' +
        'openings: keep every wall, window and door exactly where it is and exactly the size it is, add no window or ' +
        'opening that is not in the photo, remove none that is, and keep the ceiling height, the camera position and the ' +
        'crop as shown.',
      'STEP 3 — ONLY THEN RENOVATE. Redesign the finishes and furnishings within that fixed shell.',
    );
  } else {
    parts.push(
      `Redesign the interior of this ${room}.`,
      SHELL_READ,
      SHELL_LOCK,
      NO_NEW_DRAPERY,
      'STEP 3 — ONLY THEN RESTYLE. Inside that unchanged shell, replace the furniture, textiles, colours, surface ' +
        'finishes and décor to match the new style. Recolouring or re-finishing a wall or floor is fine; moving, adding ' +
        'or removing one is not.',
    );
  }
  if (a.useMoodboard) {
    parts.push(
      'Style it to match the design language, furniture character, materials, colour palette, textures and overall mood of the attached reference mood-board image.',
    );
  } else if (a.useStyleRef) {
    parts.push(
      'Style it to match the design language, furniture character, materials, colour palette, textures and overall mood of the attached reference image.',
    );
  } else if (interiorThemeClause(a.theme)) {
    parts.push(`Design style: ${interiorThemeClause(a.theme)}.`);
  }
  if (MOODS[a.mood].clause) parts.push(`Mood: ${MOODS[a.mood].clause}.`);
  parts.push(
    'Photorealistic interior render, physically based lighting, soft natural light from the existing windows, ' +
      'crisp material detail, natural colour grade, reads as a photograph, ultra-detailed.',
    SHELL_CHECK,
    NO_TEXT,
  );
  return parts.join(' ');
}

// --- Material & mood board (Feature 05) --------------------------------------

/**
 * Any image → a professional flat-lay material & mood board extracting the
 * input's design DNA. This board deliberately CONTAINS text (its labels), so it
 * gets a spell-correctly instruction instead of the shared no-text guard.
 * Live-validated on Nano Banana Pro against a studio reference board.
 */
export function buildMoodboardPrompt(): string {
  return [
    'You are an architecture and interior design stylist. Study the attached image — a render, sketch or photo of a designed space — and extract its design DNA: the exact materials, colour palette, fabrics, textures, furniture character and overall mood.',
    "Then compose a single professional flat-lay MATERIAL & MOOD BOARD that presents that DNA, in the style of a high-end design studio's client presentation board:",
    'A warm off-white studio background, viewed top-down as a styled flat-lay with soft realistic drop shadows.',
    'Overlapping physical material samples in the centre — wood boards, stone or terrazzo tiles, fabric and linen swatches, a metal finish sample, woven textures — each drawn from the actual materials visible in the input image.',
    "A few isolated 3D furniture suggestions matching the input's style (a sofa or an accent chair, a small console or side table), one framed artwork suggestion, and a plant sprig or leaf for life.",
    'Elegant small serif labels with thin underline rules naming each element and its material (e.g. "SOFA SUGGESTION — Bouclé Fabric in Warm Beige", "FLOORING — Natural Oak"), placed beside the elements they describe.',
    'A "COLOR PALETTE" row of five plain solid colour dots sampled from the input image, with any names set beside or below the dots — never inside them.',
    'A "MATERIAL PALETTE" strip of five labelled rectangular swatches: wall colour, flooring, primary fabric, curtain, metal.',
    'A closing "VIBE" line naming the mood of the input space in three to five words.',
    'Typography: refined serif with letter-spaced small caps, generous whitespace — a page from a luxury design deck. Photorealistic samples, ultra-detailed. The only text on the board are these labels — spell every word correctly.',
  ].join(' ');
}

// --- Axonometric ------------------------------------------------------------

export type { AxonStyleKey } from '../store/generation';

/**
 * An elevation OR a 3D model → an axonometric drawing.
 *
 * These are two different jobs wearing one name, and the difference is the
 * whole prompt. From an elevation the depth is NOT in the image, so it has to
 * be invented and the tool is partly guessing. From a modelled viewport the
 * depth IS in the image, and inventing one is the failure — the job there is a
 * change of projection, not a reconstruction.
 *
 * Which is why `source` branches the read and the lock rather than adding a
 * sentence. Telling a model to "infer a sensible depth" when the input already
 * shows the depth is an instruction to ignore its own input.
 */
export function buildAxonometricPrompt(a: { section: boolean; style: string; source: AxonSource }): string {
  const parts: string[] =
    a.source === 'model'
      ? [
          'Convert the three-dimensional model shown in the input — a SketchUp, Revit, Rhino or other viewport ' +
            'screenshot, or a 3D render — into an architectural axonometric drawing.',
          'STEP 1 — READ THE MODEL FIRST. The depth, the roof form and the returning walls are all present in this ' +
            'image. Trace the footprint and note the depth front-to-back, every set-back, overhang and change of ' +
            'plane, the roof form and pitch, and the position, size and proportion of every opening on every visible ' +
            'face.',
          'STEP 2 — LOCK THE GEOMETRY. The model is the design. Do not invent a depth, a roof pitch, a set-back, a ' +
            'storey or an opening: read them off the image and reproduce them. Nothing is added to balance an ' +
            'elevation, and nothing modelled is left out.',
          'STEP 3 — CHANGE THE PROJECTION, NOT THE BUILDING. If the viewport is in perspective, flatten it: edges that ' +
            'converge become parallel and distant parts stop shrinking. Keep a three-quarter corner viewpoint from ' +
            'slightly above, so the front face, the returning side wall and the roof all read — do NOT reproduce a ' +
            'flat, front-on elevation.',
        ]
      : [
          'Rebuild the building shown in this elevation as a three-dimensional massing model and present it as an ' +
            'architectural axonometric view.',
          'STEP 1 — READ THE ELEVATION FIRST. Note the outline of the face, the roof profile, the storey lines, and ' +
            'the position, size and proportion of every opening. An elevation shows one face only: the depth ' +
            'front-to-back is not in the image.',
          'STEP 2 — INFER THE DEPTH, AND ONLY THE DEPTH. Choose a plausible depth and roof form for the building type ' +
            'and build the returning walls from it. The face you were given is not yours to change: same outline, ' +
            'same openings, same proportions, same materials. Everything you invent sits behind it.',
          'STEP 3 — ROTATE. Present it from a three-quarter corner viewpoint seen from slightly above, so the front ' +
            'face, the returning side wall and the roof are all clearly visible and the building reads with genuine ' +
            'depth and volume — do NOT reproduce a flat, front-on elevation.',
        ];
  parts.push(
    'Use parallel (axonometric / isometric) projection at roughly a 30–45 degree angle, with no perspective ' +
      'distortion and no vanishing point.',
  );
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
  parts.push('Keep the whole model centred and fully inside the frame.', NO_TEXT);
  return parts.join(' ');
}

// --- Refine -----------------------------------------------------------------

/** Turn the refine chips + free text into an edit instruction (P2). */
export function buildRefinePrompt(a: { chips: string[]; freeText: string }): string {
  const changes = a.chips
    .map((c) => ALL_REFINE_CHIPS.find((r) => r.key === c)?.clause)
    .filter((c): c is string => Boolean(c));
  const free = a.freeText.trim();
  if (free) changes.push(free);
  const list = changes.length ? changes.join('; ') : 'subtly improve the image';
  return (
    'Edit this image. Keep the composition, geometry, camera angle and proportions exactly as shown, and keep every ' +
    'window, door, opening and wall exactly where and as it is — add none, remove none, resize none. ' +
    `Apply only these changes: ${list}. ` +
    NO_TEXT
  );
}
