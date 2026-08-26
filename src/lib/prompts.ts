// Prompt builder, tuned for Google's Nano Banana Pro (Gemini 3 Pro Image)
// architectural image editing. Each prompt describes the transformation while
// insisting the model PRESERVE the input geometry — the key move for
// image-to-image edits. The builders assemble a prompt from one-click scene
// choices (src/lib/scene.ts) so architects never write a prompt for a basic
// change; the UI textarea still lets them edit the result.

import { ALL_REFINE_CHIPS } from './refine';
import {
  CONTEXTS,
  LIGHTING,
  MOODS,
  SEASONS,
  archStyleClause,
  defaultScene,
  elevationThemeClause,
  interiorThemeClause,
  materialsClause,
} from './scene';
import type { ElevationThemeKey, InteriorMode, InteriorThemeKey, RoomTypeKey, SceneOptions } from '../store/generation';

// --- Render -----------------------------------------------------------------

// Shared exclusion clause (skill: state what to leave out as plainly as what to
// include). Nano Banana happily copies a plan's text labels or invents captions
// unless told not to — the most common "prompt not working" complaint.
const NO_TEXT = 'Do not add any watermark, signature, caption or stray text to the image.';

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

const WATERCOLOUR_PROMPT =
  'Render this architectural sketch as an elegant architectural watercolour illustration. ' +
  'Preserve the geometry and composition. ' +
  'Soft translucent washes, loose confident edges, warm muted palette, subtle paper texture, ' +
  'gently graded skies, hand-painted presentation illustration, light and airy. ' +
  NO_TEXT;

// Style unions live with the settings that carry them (store/generation.ts).
// This file used to declare its own copy, which had already drifted: it was
// missing 'plan2d', a style the builder below actually handles.
export type { RenderStyleKey } from '../store/generation';

// Reference-chaining: when a pooled image is picked as a style reference it rides
// alongside the input as a second image, and this clause tells the model to match
// its visual language so a whole set shares one palette/materials/mood.
const STYLE_REF_CLAUSE =
  'Match the overall material palette, colours, textures, finish and mood of the attached reference image so this output belongs to the same visual family — while keeping this drawing’s exact geometry, layout, viewpoint and composition unchanged.';

// The footprint contract. The model does not trace a drawing — it forms an
// understanding of it and redraws from scratch, so wherever the instructions are
// silent it falls back on its prior, and its prior for "floor plan" is a
// rectangle. The old wording protected the INTERIOR only (rooms, walls, openings)
// and never once named the building's outline, so an L-shape or a bay window —
// exactly the features that contradict the prior hardest — got squared off.
// Naming each irregularity, and forbidding the observed failure explicitly, is
// what gives the model something to arbitrate with.
const FOOTPRINT_READ =
  'STEP 1 — READ THE PLAN FIRST. Before drawing anything, trace the outer perimeter and note whether it is a plain ' +
  'rectangle or irregular: L-shaped, T-shaped, U-shaped, stepped, chamfered, or carrying an angled or curved bay window. ' +
  'Count the rooms. Note each room’s position relative to the others, and the position of every door and window in every wall.';

const FOOTPRINT_LOCK =
  'STEP 2 — LOCK THE GEOMETRY. Reproduce that exact footprint. Seen from directly above, the outer wall silhouette of ' +
  'your output must be identical in shape to the outline of the input plan — every corner, every set-back, every angled ' +
  'or splayed wall, every bay window. Do NOT simplify an irregular footprint into a rectangle or a plain box. Keep the ' +
  'same number of rooms, in the same relative positions, at the same relative sizes. Keep every internal wall, door ' +
  'opening and window opening exactly where the plan puts it. Do not rotate or mirror the plan.';

const FOOTPRINT_CHECK =
  'Before you finish, compare your output’s outer outline against the input plan’s outline. If they are not the same ' +
  'shape, rebuild the geometry — matching the plan’s footprint, room count and room positions matters more than any ' +
  'styling instruction above.';

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
  if (a.style === 'watercolour') return WATERCOLOUR_PROMPT;
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

// The architecture lock for the interior tab. The previous wording asserted a
// general "walls, windows, doors … must not change" and then, in the same
// sentence, asked for "curtains" — a direct contradiction. The model resolved it
// the only way it could: it hung drapery on blank walls, which reads as windows
// that were never there (the reported bug). Three moves fix it — read the
// openings before touching anything, enumerate the specific alterations that are
// forbidden rather than asserting a soft blanket rule, and never name a
// wall-mounted element in the additive list.
const SHELL_READ =
  'STEP 1 — READ THE ROOM FIRST. Before you change anything, count the windows, doors and openings in this photo and ' +
  'note exactly where each one sits, how wide and how tall it is, and what frames it. Note which walls are blank. Note ' +
  'where the walls meet, where the ceiling and floor lines run, and where the camera is standing.';

const SHELL_LOCK =
  'STEP 2 — LOCK THE SHELL. The room’s architecture is fixed input, not part of what you are designing. Do NOT add, ' +
  'remove, move, widen, narrow, raise, lower or reshape any window, door, doorway, arch, opening, glazed panel or ' +
  'skylight, and do NOT change its frame, mullions or glazing. A wall that is blank in the photo stays blank — never ' +
  'place a window, a glazed panel, a curtain, a blind, a drape or a fake opening on it. Keep every wall exactly where it ' +
  'is: add and remove no partitions, columns, beams, niches, coves, ledges, panelling or built-in joinery. Keep the ' +
  'ceiling height, the ceiling and floor lines, the camera position, the lens and the crop exactly as shown, and leave ' +
  'whatever is visible outside the windows unchanged.';

// Window treatments are the specific trap: they are the one "soft furnishing"
// that is read as architecture, because a curtain implies the window behind it.
const NO_NEW_DRAPERY =
  'Treat window treatments as architecture, not as décor: if a window has no curtain, blind or shade in the input photo, ' +
  'leave it bare. Only restyle a curtain or blind that is already there.';

const SHELL_CHECK =
  'Before you finish, compare your output against the input photo opening by opening. If any window or door has appeared, ' +
  'vanished, moved or changed size, or if a wall that was blank now carries a window, a glazed panel or a curtain, ' +
  'rebuild it — matching the room’s existing architecture matters more than any styling instruction above.';

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

export function interiorPrompt(): string {
  return buildInteriorPrompt({ mode: 'restyle', roomType: 'living', theme: 'contemporary', mood: 'none' });
}
