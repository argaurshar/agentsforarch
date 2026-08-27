// Prompt builders for the Visualization category.
//
// Plans & Drawings fights perspective creeping IN. This category fights CHANGE
// creeping in. Every tool here takes a finished or near-finished image and
// alters exactly one property of it — the light, the facade material, the
// people, the glass, the resolution — while the building itself must survive
// untouched. Handed a render and asked for "golden hour", a model will happily
// return a beautiful golden-hour picture of a slightly different building, and
// the difference is easy to miss until a client spots it.
//
// So `onlyChange()` is the spine: read the image, lock everything except one
// named thing, change that, then compare. Wireframe to Render is the single
// exception — it genuinely creates — and it carries its own geometry lock
// instead.

import { LIGHTING, MATERIAL_PRESETS, MOODS, SEASONS } from '../scene';
import { NO_TEXT } from './clauses';
import type {
  LightingKey,
  MaterialsKey,
  MoodKey,
  SceneOptions,
  SeasonKey,
} from '../../store/generation';

/**
 * The category's shared discipline, parameterised by the one thing that IS
 * allowed to change.
 *
 * Stated three times on purpose — as a read, as a lock, and as a closing
 * comparison. The single instruction doing the most work is the last one,
 * because it gives the model something to check its own output against rather
 * than a rule to remember while generating.
 */
export function onlyChange(what: string): { read: string; lock: string; check: string } {
  return {
    read:
      'STEP 1 — READ THE IMAGE FIRST. Before you change anything, note the building’s exact massing and outline, the ' +
      'position, size and shape of every window, door and opening, the roof form, the camera position, the lens, the ' +
      'crop, and what sits in the foreground and the background.',
    // Deliberately does NOT enumerate materials. It used to, and four of the six
    // tools that share this lock change a material in some sense — the study
    // re-clads, the glass tool retouches glazing, the upscaler resolves texture,
    // the refiner fixes tiling. Listing materials here contradicted all four,
    // and a carve-out afterwards is not a fix: the lock has to only name things
    // that are genuinely fixed for every caller. Tools whose materials really
    // are fixed say so themselves, below.
    lock:
      `STEP 2 — LOCK EVERYTHING EXCEPT ${what}. This is not a re-render and not a redesign. The building, its geometry, ` +
      'its openings and its proportions come through completely unchanged, and so do the camera position, the focal ' +
      'length, the composition and the crop. Do not move, add, remove, widen, narrow or reshape any part of the ' +
      'building. Do not shift the viewpoint, not even slightly.',
    check:
      `Before you finish, compare your output against the input everywhere except ${what}. A moved window, a different ` +
      'roofline, an extra storey, a shifted camera or a re-cropped frame is a mistake, not an improvement — redo it.',
  };
}

const PHOTO_FINISH =
  'Photorealistic architectural photograph, physically based lighting, natural colour grade, ultra-detailed, no ' +
  'over-sharpening and no HDR halos.';

// --- Wireframe / model → render ---------------------------------------------

/**
 * Untextured geometry → a finished render.
 *
 * The one tool here that creates rather than preserves — but the geometry is
 * still fixed input. A wireframe or clay viewport gives the model very little
 * to hold onto, which is exactly when it starts "improving" the massing and
 * adding windows that make the elevation look more balanced.
 */
export function buildWireframeRenderPrompt(a: SceneOptions & { keepBackground: boolean }): string {
  const material =
    a.materials === 'custom'
      ? a.customMaterials.trim() || MATERIAL_PRESETS.studio.clause
      : MATERIAL_PRESETS[a.materials].clause;
  const parts: string[] = [
    'You are producing a finished photorealistic architectural render from the untextured 3D model shown in the input — ' +
      'a wireframe, clay or shaded viewport.',
    'STEP 1 — READ THE MODEL FIRST. Count the storeys. Trace the outline and note every set-back, overhang, recess and ' +
      'change of plane. Note the roof form, and the position, size and proportion of every window, door and opening.',
    'STEP 2 — LOCK THE GEOMETRY. The model is the design; you are only giving it materials, light and context. Build ' +
      'exactly the volume shown: the same massing, the same outline, the same roof, the same number of storeys. Every ' +
      'opening stays exactly where the model puts it, at the same size and proportion. Do NOT add a window, remove one, ' +
      'move one, or resize one to make the elevation look better balanced, and do not add a storey, a wing, a canopy or ' +
      'a balcony that is not modelled.',
    `STEP 3 — ONLY THEN RENDER IT. Materials: ${material}.`,
    `Light it with ${LIGHTING[a.lighting].clause}.`,
  ];
  if (a.season !== 'none') parts.push(SEASONS[a.season].clause + '.');
  if (a.mood !== 'none') parts.push(`Overall mood: ${MOODS[a.mood].clause}.`);
  parts.push(
    a.keepBackground
      ? 'Keep whatever background the viewport shows — do not invent a new setting around the building.'
      : 'Place it in a plausible, restrained setting with ground, planting and a sky appropriate to the light above.',
    a.entourage
      ? 'Include a few people at correct scale for a sense of size, naturally occupied and not looking at the camera.'
      : 'No people.',
    PHOTO_FINISH,
    'Before you finish, compare your render against the model opening by opening and plane by plane. If the massing or ' +
      'any opening has changed, rebuild it — matching the model matters more than any styling instruction above.',
    NO_TEXT,
  );
  return parts.join(' ');
}

// --- Render refinement ------------------------------------------------------

export type RefineLevel = 'polish' | 'finish';

/**
 * A draft render → the same image, produced properly.
 *
 * Deliberately NOT the app's Refine mode, which applies a requested CHANGE. This
 * one changes nothing by design: same view, same design, same light — just
 * resolved where the draft is soft, mushy or wrong. The failure is that "improve
 * this render" reads to a model as "render something better", and it returns a
 * different, nicer building.
 */
export function buildRenderRefinePrompt(a: {
  level: RefineLevel;
  fixPeople: boolean;
  fixMaterials: boolean;
}): string {
  const lock = onlyChange('the quality of the rendering itself');
  const parts: string[] = [
    'You are re-rendering this architectural image at higher production quality. The design, the view and the lighting ' +
      'are already decided and are not yours to change — you are resolving execution, not making a new picture.',
    lock.read,
    lock.lock,
    a.level === 'polish'
      ? 'STEP 3 — ONLY THEN POLISH IT. Clean up what is soft or mushy: sharpen edges that should be crisp, resolve ' +
        'blurred detail, remove compression artefacts and noise, and correct any obviously wrong perspective on a small ' +
        'element. Keep the existing look; do not restyle it.'
      : 'STEP 3 — ONLY THEN FINISH IT. Bring it to portfolio standard: true material detail at close range, correct ' +
        'contact shadows and ambient occlusion where surfaces meet, believable reflections and refraction in glass, ' +
        'clean crisp edges on frames and reveals, and a natural photographic colour response. Keep the existing design, ' +
        'view, light direction and mood exactly.',
  ];
  if (a.fixMaterials) {
    parts.push(
      'Fix the materials specifically: no visibly repeating or tiled texture, no stretched or smeared mapping, correct ' +
        'scale of brick courses, boards, panels and paving relative to the building, and joints that line up.',
    );
  }
  if (a.fixPeople) {
    parts.push(
      'Fix the people specifically: correct anatomy and proportion, plausible hands and faces, feet properly in contact ' +
        'with the ground with matching shadows, clothing appropriate to the light and season. Keep them in the same ' +
        'positions and poses — do not add or remove anyone.',
    );
  }
  parts.push(PHOTO_FINISH, lock.check, NO_TEXT);
  return parts.join(' ');
}

// --- Atmosphere & light -----------------------------------------------------

/**
 * Re-light a finished render (Notion #10 lighting, #38 seasons).
 *
 * The scene axes already in the app set light BEFORE generating; this applies
 * the same vocabulary to an image that already exists. Same words, opposite
 * direction — which is why it is a separate tool rather than a setting.
 */
export function buildAtmospherePrompt(a: {
  lighting: LightingKey;
  season: SeasonKey;
  mood: MoodKey;
  keepPeople: boolean;
}): string {
  const lock = onlyChange('the light, the sky and the season');
  const parts: string[] = [
    'You are re-lighting the architectural image in the input. The building and the view are finished and fixed; you ' +
      'are changing only the conditions it is photographed under.',
    lock.read,
    lock.lock,
    'Every material on the building also stays exactly as it is — you are changing the conditions, not the specification. ' +
      'A brick wall is the same brick under a different sun.',
    `STEP 3 — ONLY THEN RE-LIGHT IT. Light the scene with ${LIGHTING[a.lighting].clause}. Recompute everything that ` +
      'follows from that light: the direction, length and softness of every shadow, the colour temperature across the ' +
      'whole image, the brightness and colour of the sky, how the glazing reads, and which windows are lit from within.',
  ];
  if (a.season !== 'none') {
    parts.push(
      `Change the season to match: ${SEASONS[a.season].clause}. Planting, ground and any visible weather follow the ` +
        'season — but the planting stays in the same places at the same sizes, and no tree, hedge or bed appears or ' +
        'disappears.',
    );
  }
  if (a.mood !== 'none') parts.push(`Overall mood: ${MOODS[a.mood].clause}.`);
  parts.push(
    a.keepPeople
      ? 'Keep the people and vehicles exactly where they are; only their lighting and shadows change.'
      : 'Remove the people and vehicles, leaving the architecture and the setting.',
    PHOTO_FINISH,
    lock.check,
    NO_TEXT,
  );
  return parts.join(' ');
}

// --- Facade material study --------------------------------------------------

export type MaterialScope = 'whole' | 'named';

/**
 * The same building in a different material.
 *
 * A client-facing comparison tool, so the ONLY useful output is one where
 * nothing but the material moved. The specific trap is that changing a facade
 * material tempts the model to re-proportion the openings to suit it — brick
 * wants smaller punched windows, curtain walling wants bigger ones — which
 * quietly turns a material study into a redesign.
 */
export function buildFacadeMaterialPrompt(a: {
  materials: MaterialsKey;
  customMaterials: string;
  scope: MaterialScope;
  target: string;
}): string {
  const material =
    a.materials === 'custom'
      ? a.customMaterials.trim() || 'a material of your choosing appropriate to the building'
      : MATERIAL_PRESETS[a.materials].clause;
  const where = a.target.trim();
  const subject = a.scope === 'named' && where ? where : 'the facade';
  const lock = onlyChange(`the material of ${subject}`);

  return [
    `You are producing a material study of the building in the input: the same building, the same view, ${subject} in a ` +
      'different material.',
    lock.read,
    lock.lock,
    `STEP 3 — ONLY THEN CHANGE THE MATERIAL. Re-clad ${subject} in ${material}. Show the material honestly at this ` +
      'distance: its real module and coursing, its joints and shadow gaps, its texture and how it catches the existing ' +
      'light. Where it meets a window, a corner, the ground or the roof, detail that junction the way the material ' +
      'actually behaves.',
    'CRITICAL — every window and door stays exactly the size, shape and position it is in the input. A new material ' +
      'does not get new openings: do not make the windows smaller because the material suits punched openings, do not ' +
      'make them larger because it suits glazing, and do not add or remove a single one.',
    'The rest of the building, the setting, the planting, the people and the light are untouched.',
    PHOTO_FINISH,
    lock.check,
    NO_TEXT,
  ].join(' ');
}

// --- Add human scale --------------------------------------------------------

export type EntourageDensity = 'few' | 'some' | 'busy';
export type EntourageSetting = 'residential' | 'commercial' | 'civic';

const DENSITY_CLAUSE: Record<EntourageDensity, string> = {
  few: 'two or three figures only — enough to read the scale, not enough to populate the scene',
  some: 'six to ten figures in small natural groups, with gaps between them',
  busy: 'a well-populated scene, fifteen or more figures, with overlapping groups and movement',
};

const SETTING_CLAUSE: Record<EntourageSetting, string> = {
  residential: 'residents and visitors: a family, someone arriving home, a person with a dog, children',
  commercial: 'workers and customers: people walking with purpose, someone on a phone, a pair talking, a cyclist',
  civic: 'a public mix: all ages, people sitting and standing, someone photographing, a group pausing',
};

/**
 * Figures, vehicles and planting for scale (Notion #39).
 *
 * Two failures, and they need different instructions. Scale: figures sized by
 * eye come out subtly wrong and make the building read as a model, so the prompt
 * names door height as the measure. Uncanniness: the classic render giveaway is
 * a row of people facing the camera, so the prompt says what they are doing
 * instead of what they look like.
 */
export function buildHumanScalePrompt(a: {
  density: EntourageDensity;
  setting: EntourageSetting;
  vehicles: boolean;
  planting: boolean;
}): string {
  const lock = onlyChange('the people, vehicles and planting');
  const parts: string[] = [
    'You are adding life and human scale to the finished architectural render in the input.',
    lock.read,
    lock.lock,
    'Every material and surface on the building stays exactly as it is; you are adding to the scene, not touching the ' +
      'architecture.',
    `STEP 3 — ONLY THEN ADD PEOPLE. Add ${DENSITY_CLAUSE[a.density]}: ${SETTING_CLAUSE[a.setting]}.`,
    // Scale by measurement, not by eye.
    'Scale every figure against the architecture, not by eye: a standing adult is a little shorter than a standard ' +
      'door opening and about a third of a typical storey height. Figures further away are correspondingly smaller and ' +
      'their feet sit higher in the frame. Every figure has both feet properly in contact with the ground, with a ' +
      'contact shadow matching the direction and softness of the existing light.',
    // What they are doing, rather than what they look like.
    'They are occupied and unaware of the camera: walking, talking, carrying something, sitting, looking at the ' +
      'building. Nobody poses, nobody faces the lens, nobody stands in a line. Anyone moving is slightly motion-blurred ' +
      'the way a real photograph at this exposure would render them. Clothing suits the season and light already in ' +
      'the image.',
  ];
  if (a.vehicles) {
    parts.push(
      'Add one or two vehicles in the places a vehicle would actually be — parked at a kerb, on a drive, at a drop-off ' +
        '— at correct scale against the building, never blocking the main view of the facade.',
    );
  }
  if (a.planting) {
    parts.push(
      'Add planting appropriate to the setting and season: street trees, hedging, beds or pots, at believable mature ' +
        'sizes, placed where planting would go rather than scattered.',
    );
  }
  parts.push(
    'The building itself gains nothing and loses nothing.',
    PHOTO_FINISH,
    lock.check,
    NO_TEXT,
  );
  return parts.join(' ');
}

// --- Multi-view sheet -------------------------------------------------------

export type SheetLayout = '2x2' | '1x3' | '2x3';

const LAYOUT_CLAUSE: Record<SheetLayout, string> = {
  '2x2': 'a clean two-by-two grid of four equal panels',
  '1x3': 'a single row of three equal panels',
  '2x3': 'a two-row grid of six equal panels',
};

export const SHEET_VIEWS = ['front', 'threequarter', 'side', 'aerial', 'detail', 'entrance'] as const;
export type SheetView = (typeof SHEET_VIEWS)[number];

const VIEW_CLAUSE: Record<SheetView, string> = {
  front: 'a straight-on view of the main facade',
  threequarter: 'a three-quarter view from the front corner',
  side: 'a view of the flank, showing the building’s depth',
  aerial: 'a raised three-quarter aerial showing the roof and the footprint in its setting',
  detail: 'a close view of the entrance and its material junctions',
  entrance: 'an eye-level view from where a visitor would approach',
};

/**
 * One building, several views, one sheet (Notion #11, #26, #35).
 *
 * The hard part is not the layout — it is CONSISTENCY. Asked for four views, an
 * image model will cheerfully produce four different buildings that share a
 * style, because each panel is generated with only weak reference to the others.
 * The prompt states the constraint before the layout and repeats it as the
 * closing check, and the tool carries a visible accuracy warning, because this
 * is the one tool here that can fail in a way that looks entirely plausible.
 */
export function buildMultiViewPrompt(a: { views: SheetView[]; layout: SheetLayout }): string {
  const chosen = a.views.length ? a.views : (['front', 'threequarter', 'side', 'aerial'] as SheetView[]);
  const list = chosen.map((v, i) => `Panel ${i + 1}: ${VIEW_CLAUSE[v]}`).join('. ');
  return [
    'You are producing a single presentation sheet showing the building from the input image in several views at once.',
    // The constraint before the task, because it is the one that gets lost.
    'CRITICAL, ABOVE EVERYTHING ELSE — every panel shows THE SAME BUILDING. Identical massing, identical outline, ' +
      'identical roof form, identical materials and colours, identical window pattern, identical storey heights. Work ' +
      'out the building as one three-dimensional object first, then draw each panel as a different camera on that one ' +
      'object. Four views of four similar buildings is a complete failure of this task, however good each one looks.',
    `Compose ${LAYOUT_CLAUSE[a.layout]} on a clean white sheet with even margins and consistent gutters. ${list}.`,
    'Every panel is lit identically — the same time of day, the same sun direction relative to the building, the same ' +
      'sky and the same colour grade — so the sheet reads as one set rather than a collection.',
    'Photorealistic architectural photography throughout, ultra-detailed, consistent across the panels.',
    'Before you finish, compare the panels against each other: count the storeys in each, count the windows on the ' +
      'facade in each, and check the roof form and the materials. If any panel disagrees with the others, rebuild it.',
    NO_TEXT,
  ].join(' ');
}

// --- Reflection control -----------------------------------------------------

export type ReflectionMode = 'transparent' | 'balanced' | 'mirror';

const REFLECTION_CLAUSE: Record<ReflectionMode, string> = {
  transparent:
    'Make the glazing read as clear and largely transparent: the interiors are visible through it — floor plates, ' +
    'ceilings, lighting, furniture and the occasional person — with only a faint sheen on the surface. This is the ' +
    '"lights on at dusk" reading that makes a building look occupied',
  balanced:
    'Give the glazing a believable balance: partly transparent so the interior reads faintly, partly reflective so ' +
    'the sky and surroundings register, varying naturally panel by panel with the angle of each pane',
  mirror:
    'Make the glazing strongly reflective: it mirrors the sky and the surroundings, and the interior is barely ' +
    'visible. Reflections are geometrically correct for each pane’s angle and break at every mullion',
};

/**
 * What the glass is doing (Notion's reflection workflows).
 *
 * A small tool that solves a specific recurring argument. The instruction that
 * matters is that reflections break at mullions and vary pane by pane — a single
 * continuous mirrored sheet across a mullioned facade is the tell that gives an
 * AI render away instantly.
 */
export function buildReflectionPrompt(a: { mode: ReflectionMode; reflect: string }): string {
  const lock = onlyChange('what the glazing is doing');
  const what = a.reflect.trim();
  return [
    'You are adjusting the glazing in the architectural image in the input.',
    lock.read,
    lock.lock,
    `STEP 3 — ONLY THEN ADJUST THE GLASS. ${REFLECTION_CLAUSE[a.mode]}.` +
      (what ? ` What it reflects: ${what}.` : ''),
    'Treat each pane separately. Reflections break at every mullion, transom and frame, and change from pane to pane ' +
      'with the angle each one presents — a single continuous mirrored sheet running across a mullioned facade is ' +
      'wrong and reads as fake immediately.',
    'The frames, mullions, transoms, reveals and every opening keep exactly the size, shape and position they have in ' +
      'the input. The rest of the building and the light are untouched.',
    PHOTO_FINISH,
    lock.check,
    NO_TEXT,
  ].join(' ');
}

// --- Upscale for print ------------------------------------------------------

/**
 * The same image, bigger, with real detail rather than interpolation.
 *
 * The whole value is that NOTHING is reinterpreted. An upscaler that invents a
 * more interesting balcony has destroyed the image for its actual purpose, which
 * is that a client already approved this one and it now has to go on a board at
 * A1.
 */
export function buildUpscalePrompt(a: { sharpen: boolean }): string {
  const lock = onlyChange('the amount of fine detail resolved');
  return [
    'You are producing a high-resolution print master of the architectural image in the input.',
    lock.read,
    lock.lock,
    'STEP 3 — ONLY THEN RESOLVE IT. Render the same image at much higher fidelity: real material texture where the ' +
      'input only suggests it, crisp edges on frames, reveals and mullions, legible detail in the middle distance, and ' +
      'clean gradients in the sky and on flat surfaces. Remove compression artefacts, banding and noise.',
    // The rule that makes an upscaler useful rather than merely impressive.
    'CRITICAL — resolve detail, do not invent it. Every element in the output is the same element that is in the ' +
      'input, only better resolved. Do not add an architectural feature, a plant, a person, a vehicle or a reflection ' +
      'that is not already there, and do not make an existing one more interesting. This image has been approved as it ' +
      'is; your job is to make it printable, not better.',
    a.sharpen
      ? 'Finish with restrained output sharpening suitable for large-format print — no halos, no crunchy edges.'
      : 'No output sharpening; leave the result naturally soft where the input is soft.',
    PHOTO_FINISH,
    lock.check,
    NO_TEXT,
  ].join(' ');
}

// --- Watercolour ------------------------------------------------------------

export type WatercolourPalette = 'warm' | 'cool' | 'muted' | 'monochrome';

const PALETTE_CLAUSE: Record<WatercolourPalette, string> = {
  warm: 'a warm palette — ochres, siennas, soft terracotta and warm greys, with a low warm sun in the washes',
  cool: 'a cool palette — soft blues, blue-greys and pale greens, with a high even northern light',
  muted: 'a muted palette — desaturated earth tones and greys, a single quiet accent colour and nothing louder',
  monochrome: 'a monochrome palette — a single ink colour in graded washes from pale tint to deep shadow, no other hue',
};

/**
 * Any drawing or render → the same thing painted in watercolour.
 *
 * The tension this prompt exists to resolve: a watercolour is *loose*, and this
 * category's whole discipline is that nothing about the building may move. Told
 * to be loose, a model loosens the architecture — walls drift, a window blurs
 * into two, a roofline softens into a different pitch. So looseness is assigned
 * explicitly to the paint and explicitly denied to the geometry, and the drawing
 * underneath is described as drafted first and painted second, which is how the
 * medium actually works.
 */
export function buildWatercolourPrompt(a: {
  palette: WatercolourPalette;
  loose: boolean;
  keepLines: boolean;
}): string {
  const only = onlyChange('the medium it is painted in');
  return [
    'Repaint the architectural image in the input as an original architectural watercolour illustration.',
    only.read,
    only.lock,
    'STEP 3 — ONLY THEN CHANGE THE MEDIUM. Paint it the way an architect paints: the drawing is drafted accurately ' +
      'first and the paint is laid over it, so the geometry is precise underneath and only the paint is free.',
    `Palette: ${PALETTE_CLAUSE[a.palette]}.`,
    a.loose
      ? 'Work loosely: broad confident washes, edges allowed to bleed and break, visible brush marks, pigment pooling ' +
          'and granulating, generous untouched paper left as highlight.'
      : 'Work in controlled washes: even graded tones, edges kept crisp where an edge is architectural, restrained ' +
          'blooming, a small number of deliberate layers.',
    a.keepLines
      ? 'Keep an ink line over the paint: fine confident pen work on the architectural edges, drawn slightly loose and ' +
          'not perfectly registered to the wash.'
      : 'No ink outline — the form is described by the washes and their edges alone.',
    'Real watercolour behaviour throughout: visible cold-press paper texture and tooth, soft graded sky, reflected ' +
      'colour in the shadows, a few dry-brush passages. It must read as paint on paper, not as a photograph with a ' +
      'filter over it.',
    'CRITICAL — looseness is a property of the paint, not of the building. However freely the washes are handled, ' +
      'every wall, roofline, window and opening stays exactly where the input puts it, at exactly the size the input ' +
      'gives it. Do not let a soft edge become a different edge.',
    only.check,
    NO_TEXT,
  ].join(' ');
}
