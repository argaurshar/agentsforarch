// Prompt builders for the Diagrams & Boards category.
//
// These outputs EXPLAIN a building rather than depict one, which inverts the
// usual rule: text is required, not forbidden. That makes spelling the live
// risk — a diagram whose labels read "STRUCTRAL" is unusable in front of a
// client — so every builder here ends by insisting on correct spelling rather
// than by suppressing text.
//
// The other shared risk is that an explanatory overlay gradually eats the
// drawing underneath it. The base has to stay legible, so each builder states
// what the substrate is and orders it preserved before describing the overlay.

import { NO_TEXT } from './clauses';
// Imported, not re-declared — the rule drawings.ts states and prompts.ts
// records the cost of: a prompt module's private copy of a settings union
// drifted, and structural typing hid it until something far away stopped
// assigning. These files kept four such copies.
import type {
  ArchitectTimelineSettings,
  BlueprintEvolutionSettings,
  RedPenFocus,
  RedPenSettings,
  AnnotationSubject,
  ExplodeAxis,
  MagazineSettings,
  MarketingBoardSettings,
  ProgramOrientation,
  SystemsCutawaySettings,
} from '../../store/generation';

export type { AnnotationSubject, ExplodeAxis, ProgramOrientation };

// --- Annotation sketch ------------------------------------------------------

const SUBJECT_CLAUSE: Record<AnnotationSubject, string> = {
  circulation: 'how people move through and around the building — entry, routes, cores and thresholds',
  ventilation: 'how air moves through the building — where it enters cool, where it rises, where it leaves',
  sun: 'how the sun works on the building — path, angle of incidence, what is shaded and what is exposed',
  program: 'what happens where — the functional zones and how they stack or adjoin',
  structure: 'how the building stands up — the load path from roof to ground',
  // Reached only when the user picks "Something else" and types nothing. It has
  // to read as a complete instruction on its own: the previous wording promised
  // a description ("the concept described below") that nothing ever supplied.
  custom: 'the single idea this drawing exists to communicate, read from the image itself',
};

/**
 * A render or drawing → the same image with an explanatory overlay.
 *
 * The failure is that "annotate this" reads as "redraw this with annotations",
 * and the base image comes back subtly different — a moved window, a changed
 * roofline — which destroys the comparison the annotation exists to support.
 * So the base is locked first, and the overlay is described as sitting ON it.
 */
export function buildAnnotationPrompt(a: {
  subject: AnnotationSubject;
  custom: string;
  labels: boolean;
}): string {
  const what = a.subject === 'custom' ? a.custom.trim() || SUBJECT_CLAUSE.custom : SUBJECT_CLAUSE[a.subject];
  return [
    'You are turning the architectural image in the input into an explanatory diagram by drawing over it.',
    'STEP 1 — READ THE IMAGE FIRST. Note the building’s massing and outline, every opening, the camera position, the ' +
      'lens and the crop, and what is in the foreground and background.',
    'STEP 2 — LOCK THE BASE IMAGE. The image underneath comes through completely unchanged: same geometry, same ' +
      'openings, same materials, same light, same camera. You are drawing ON it, not redrawing it. Desaturate it ' +
      'slightly so the overlay reads clearly against it — that is the only change permitted to the base.',
    `STEP 3 — ONLY THEN ANNOTATE. Explain ${what}. Draw bold, clean vector arrows, flow lines and highlight zones in a ` +
      'small set of distinct flat colours, placed accurately over the parts of the building they refer to. Arrows ' +
      'follow real paths and point in the direction of real movement.',
    'Keep the overlay economical: a diagram with six clear marks explains more than one with thirty. Nothing should ' +
      'obscure the part of the building it is explaining.',
    a.labels
      ? 'Add short annotation labels in a clean sans-serif with thin leader lines to what they name. Include a small ' +
          'keyed legend if more than one colour is used. Spell every word correctly and keep every label legible.'
      : NO_TEXT,
    'Before you finish, compare the base image against the input, ignoring the overlay. Any difference in the building ' +
      'itself is a mistake — redo it.',
  ].join(' ');
}

// --- Program diagram --------------------------------------------------------

/**
 * A building → its floors separated and labelled by what they do.
 *
 * The single hardest instruction is that the separated slabs must remain the
 * SAME building: same facade rhythm, same balconies, same proportions. A model
 * asked to "explode" a building will happily generate a stack of generic slabs
 * that share a colour scheme, which explains nothing about the project.
 */
export function buildProgramDiagramPrompt(a: { levels: string; orientation: ProgramOrientation }): string {
  // The field is a textarea, so this arrives newline-separated. Interpolated
  // raw it put hard line breaks mid-sentence in the prompt — and in the prompt
  // snapshot, whose one-entry-per-block parser they broke.
  const levels = a.levels
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(', ');
  return [
    'Produce a clean architectural PROGRAM BREAKDOWN of the building shown in the input: its floors separated from one ' +
      'another and labelled with what each one is for.',
    'STEP 1 — READ THE BUILDING FIRST. Count the storeys. Note the facade rhythm, the balconies and projections, the ' +
      'roof form, and the proportions of the whole volume.',
    'STEP 2 — SEPARATE, DO NOT REDESIGN. Every separated floor is a slice of THAT building: it keeps the same facade ' +
      'proportions, the same window and balcony pattern, and the same structural rhythm as the corresponding storey in ' +
      'the input. A stack of generic slabs that merely share a style is a failure of this task.',
    a.orientation === 'vertical'
      ? 'Arrange the floors separated vertically, evenly spaced and perfectly aligned on a shared vertical axis, in ' +
          'their real order with the ground floor at the bottom.'
      : 'Arrange the floors as an exploded isometric stack, offset along a consistent axis so each floor plate is ' +
          'visible, in their real order with the ground floor at the bottom.',
    levels
      ? `Take the program as given, bottom to top: ${levels}. These are BANDS, not storeys: a band may cover several ` +
          'floors, so group the consecutive storeys that share a use and label the group once with the name supplied. ' +
          'Use every name given, in the order given, and add none of your own.'
      : 'Infer a plausible program from the building type and label each floor accordingly — parking or retail at the ' +
          'base, primary accommodation above, shared or amenity space at the top.',
    'Annotation: place each floor’s name in a small clean sans-serif inside a minimal frame, connected to its slab by ' +
      'a thin precise leader line. Strict alignment, no overlap, high readability. Spell every word correctly.',
    'Light neutral background, soft ambient lighting, no dramatic shadows. Minimal and instructional — an architectural ' +
      'explainer for a client presentation. No people, no clutter, no context.',
    'Before you finish, account for every storey in the input: each one belongs to exactly one separated band, no ' +
      'storey is dropped and none is invented. If a band’s facade does not match the storeys it covers, rebuild it.',
  ].join(' ');
}

// --- Exploded axonometric ---------------------------------------------------

/**
 * A building or room → its components pulled apart along one axis.
 *
 * Distinct from the program diagram: that separates FLOORS and labels their
 * use; this separates CONSTRUCTION LAYERS and shows how the thing goes
 * together. Both explode; they answer different questions.
 */
export function buildExplodedAxonPrompt(a: { axis: ExplodeAxis; labels: boolean }): string {
  return [
    'Deconstruct the building shown in the input into an EXPLODED AXONOMETRIC diagram showing how it is assembled.',
    'STEP 1 — READ IT FIRST. Identify the distinct layers: roof and its structure, floor plates, the structural frame ' +
      'or load-bearing walls, the facade or envelope, and the ground and foundation.',
    a.axis === 'vertical'
      ? 'STEP 2 — EXPLODE UPWARD. Separate those layers along a single vertical axis, evenly spaced, each one directly ' +
          'above the one it sits on, so the assembly reads bottom to top.'
      : // Live run 08 with this branch selected returned essentially the vertical
        // stack: "outward" alone was too weak to displace the default. It now
        // says what NOT to do, and gives the direction a concrete description.
        'STEP 2 — EXPLODE OUTWARD, NOT UPWARD. Peel the layers apart SIDEWAYS along a consistent diagonal, each one ' +
          'offset down-and-to-the-left of the one behind it, as though the building were being unpacked towards the ' +
          'viewer. This is explicitly NOT a vertical stack: do not place the layers one directly above another, and do ' +
          'not separate them along a vertical axis. The horizontal offset between neighbouring layers must be at least ' +
          'as large as the vertical one, so each layer is fully visible and the order of assembly is legible.',
    'Draw it in true axonometric projection: parallel lines stay parallel, no vanishing point, no foreshortening, seen ' +
      'from a three-quarter viewpoint above.',
    // ROOF FORM used to be missing from this list — footprint, proportions,
    // materials and openings were locked, the roof was not. Live run 08 returned
    // a flat overhanging roof as a hipped, pitched one while every other layer
    // stayed faithful. The roof is the layer most exposed here, because
    // exploding a building means redrawing each layer standalone and a roof
    // drawn standalone reverts to the commonest roof the model knows.
    'Every separated layer belongs to THIS building — the same footprint, the same proportions, the same storey count, ' +
      'the same materials and the same openings as the input.',
    'The ROOF LAYER IS THE ONE THAT DRIFTS, so read it off the input before you draw it: its pitch or its flatness, ' +
      'its overhang or its lack of one, its parapets, its fascias and how it steps. A flat roof stays flat and keeps ' +
      'its overhangs. Do not give this building a pitched, hipped or gabled roof unless the input already has one.',
    // The guide lines have to run along whichever axis the layers were pulled
    // apart on. Pinned vertical, they contradicted the diagonal explode: either
    // the model reverted to a vertical stack or it drew leaders joining nothing.
    a.axis === 'vertical'
      ? 'Add thin vertical guide lines between the layers, running along the explode axis so the eye reassembles them.'
      : 'Add thin guide lines between the layers, running along the same diagonal as the explode so the eye ' +
          'reassembles them.',
    'Keep the original materials and design character rather than reducing everything to grey: this is a presentation ' +
      'diagram, not an engineering drawing.',
    a.labels
      ? 'Label each layer with a small clean sans-serif caption on a thin leader line — "Roof structure", "Floor ' +
          'plates", "Structural frame", "Facade", "Ground". Spell every word correctly.'
      : NO_TEXT,
    'Clean white background, soft even lighting, no cast shadows between the layers.',
  ].join(' ');
}

// --- Systems cutaway (guide #19, #51) ---------------------------------------

const SYSTEM: Record<SystemsCutawaySettings['system'], { intro: string; show: string; labels: string; check: string }> = {
  climate: {
    intro: 'how it works with the climate',
    show:
      'STEP 3 — SHOW THE SYSTEM with bold, flat, colour-coded arrows over the cut. Sun: from ONE side only — the ' +
      'equator side — the summer sun at a high angle and the winter sun at a low angle, as yellow rays reaching the glazing, showing what the overhangs shade and ' +
      'what they let in. Air: blue arrows for cool air entering low on the windward side, turning red as warm air ' +
      'rises through the section and leaves through high-level openings or the roof. Keep the building in muted tones ' +
      'so the arrows are the focal point.',
    labels: 'SUMMER SUN, WINTER SUN, COOL AIR IN, HOT AIR OUT',
    check:
      'Do warm-air arrows rise and leave high, and cool-air arrows enter low? Is the summer sun steeper than the winter ' +
      'sun, and do both come from the same side?',
  },
  green: {
    intro: 'how its planting is kept alive',
    show:
      'STEP 3 — SHOW THE SYSTEM. Cut through the balconies, planters and roof garden to reveal the soil substrate, the ' +
      'drainage layer, the root systems and the hidden irrigation pipes. Show rainwater collected from the roof, stored ' +
      'in tanks and pumped back up to the planting, with blue flow arrows. Draw it as a scientific illustration in a ' +
      'palette of greens and concrete grey ONLY — the facade’s own colours and patterns are redrawn in grey — so the ' +
      'living parts and the structure read apart.',
    labels: 'SOIL SUBSTRATE, DRAINAGE LAYER, ROOTS, IRRIGATION, RAINWATER TANK',
    check: 'Are the roots in the soil, and does the water run from the roof to the tank and back to the planting?',
  },
};

/**
 * A building → the same building sliced open in perspective, showing how one
 * system works: passive climate, or the planting's soil and water.
 *
 * Different from Annotation, which draws arrows ON the unchanged image: this
 * CUTS the building, so the interior it reveals has to be invented — the
 * accuracy note says so. The physics is put in the CHECK, because wrong-way
 * arrows (warm air sinking, a winter sun steeper than summer's) are the classic
 * mistake and the one a client spots.
 */
export function buildSystemsCutawayPrompt(a: SystemsCutawaySettings): string {
  const sys = SYSTEM[a.system];
  return [
    `You are turning the building in the input into a sectional perspective cutaway that explains ${sys.intro} — a ` +
      'sustainability diagram for a client presentation.',
    'STEP 1 — READ THE BUILDING FIRST. Note its massing, storeys, roof form, openings, balconies and materials, and the ' +
      'camera angle.',
    'STEP 2 — CUT IT OPEN. Same building, same camera — but slice away the nearest part along a vertical cut plane so ' +
      'the inside is revealed: floor slabs, rooms, stairs and voids in section, with cut surfaces as clean solid fills. ' +
      'The rest of the building — its form, openings and facade layout — stays exactly as in the input.',
    // U1 tidied an asymmetric house into a symmetric one and dropped its garage;
    // U2 invented three storeys beneath a planted building.
    'KEEP EVERY PART AND NOTHING MORE: every wing, garage, cantilever and asymmetry of the input stays — a tidier, ' +
      'symmetrical version is a different building — and nothing is added that the input does not show: no extra ' +
      'floors, basements or plant rooms below it.',
    sys.show,
    a.labels
      ? `Label each element in a clean sans-serif with thin leader lines — for example ${sys.labels} — with a small ` +
        'legend for the arrow colours. Spell every word correctly and keep every word legible.'
      : `${NO_TEXT} No labels: the colours and arrows carry it.`,
    `CHECK before you finish: is it still the input’s building, from the input’s camera? ${sys.check}`,
  ].join(' ');
}

// --- Marketing board (guide #54) --------------------------------------------

/**
 * A render → a presentation board whose typography and layout match the
 * building's character.
 *
 * The guide's one-line prompt invites invented facts — floor areas, dates,
 * awards, an architect's name — set in confident type. Here the board may print
 * only what was typed, and the hero image is the input, not a redrawing of it.
 */
export function buildMarketingBoardPrompt(a: { title: string; facts: string; format: MarketingBoardSettings['format'] }): string {
  const title = a.title.trim();
  const facts = a.facts.trim();
  const orient = a.format === '16:9' ? 'a landscape slide' : a.format === '4:5' ? 'a portrait post' : 'a portrait poster';
  return [
    `You are a graphic designer making one presentation board — ${orient} — for the building in the input image, ` +
      'with typography and layout designed to match the building’s architectural character.',
    'STEP 1 — READ THE BUILDING FIRST. Describe its character: era and style, geometry (orthogonal, curved, angular, ' +
      'layered), materials, colour palette and mood. Choose typefaces that share that character — a geometric sans for a ' +
      'crisp modernist box, a refined serif for warm stone and timber, a condensed grotesk for a bold tower — and a ' +
      'palette sampled from the image itself.',
    'STEP 2 — LAY OUT THE BOARD. The input image is the hero, large and showing the building exactly as in the input — ' +
      'not redrawn. Around it, a structured grid with generous margins: the project title, two or three detail crops or ' +
      'small diagrams taken from the building, and short sections of text.',
    'STEP 3 — WRITE ONLY TRUE TEXT. ' +
      (title ? `Title: “${title}”. ` : 'Title: a short, plain description of the building type — no invented name. ') +
      (facts ? `Facts: ${facts}. Print only these facts. ` : 'Print no numbers, dates, places or names at all. ') +
      'Do not invent numbers, areas, dates, locations, architects or awards; where a section would need a fact you were ' +
      'not given, use a short phrase describing what is visible instead. Headings and one-line captions only — no ' +
      'paragraphs of filler.',
    'Spell every word correctly and keep every word legible. Do not add any watermark or signature.',
    'CHECK before you finish: is the hero building the same as the input? Does every number on the board come from the ' +
      'facts above? Does the typography feel like it belongs to this building?',
  ].join(' ');
}

// --- Magazine layout (guide #04) --------------------------------------------

const MAG_STYLE: Record<MagazineSettings['style'], string> = {
  dense: 'an information-dense photo-book editorial style',
  minimal: 'a calm, minimal editorial style with generous white space',
  scrapbook: 'a warm scrapbook style — taped photos, hand-drawn arrows and notes',
};

/**
 * An interior or building → one magazine feature page about its design.
 *
 * The guide's version also pastes a real person into a landmark; that needs a
 * photo of someone and is not about the design, so it is gone. What remains is
 * the densest TEXT of any tool here, so the prompt bans the usual inventions
 * (brands, prices, quotes) and asks for real sentences — and every picture on
 * the page is cropped from the input, so the page never shows a different room.
 */
export function buildMagazinePrompt(a: {
  subject: MagazineSettings['subject'];
  style: MagazineSettings['style'];
  format: MagazineSettings['format'];
  headline: string;
}): string {
  const what = a.subject === 'interior' ? 'interior' : 'building';
  const sections =
    a.subject === 'interior'
      ? 'the design concept, palette and materials, key pieces, and practical tips for readers who want this look'
      : 'the design concept, materials, the building in its setting, and the details that make it work';
  const headline = a.headline.trim();
  return [
    `You are designing one magazine feature page about the design of the ${what} shown in the input image.`,
    `STEP 1 — READ THE ${what.toUpperCase()} FIRST. Note its type and layout, every main material, colour and finish, ` +
      'the key pieces or elements, the light, and the design ideas that make it work.',
    `STEP 2 — LAY OUT THE PAGE in ${MAG_STYLE[a.style]}, using the whole ${a.format} page: ` +
      (headline ? `the headline “${headline}”, ` : 'a feature headline, ') +
      `a short standfirst, and several sections with headings — ${sections}. The input image is the lead photograph; ` +
      'crop details from it — a material close-up, a corner, a fitting — for the smaller images. ' +
      `The ${what} looks exactly as it does in the input; do not redesign it.`,
    'STEP 3 — WRITE IT. Headings and short paragraphs describing what is visible. No invented brand names, prices, ' +
      'designers, addresses or quotes from real people. Text accuracy matters: real words in complete sentences, body ' +
      'text large enough to read.',
    'Spell every word correctly and keep every word legible. No coordinates, no lorem ipsum, no placeholder text. Do not ' +
      'add any watermark or signature.',
    `CHECK before you finish: is every block of text real, readable English? Does every picture on the page show this ${what}?`,
  ].join(' ');
}

// --- Knowledge tools: shared research step ----------------------------------

/** How a fact-stating tool is told to research — with search, or honestly without. */
function research(search: boolean, what: string): string {
  return search
    ? `Use Google Search to find and confirm ${what}.`
    : `From what you reliably know, identify ${what}.`;
}

// --- Material poster (guide #59) --------------------------------------------

/**
 * A material or system named in words (and optionally photographed) → a bento
 * grid educational poster.
 *
 * Research, a 3D diagram and a layout in one generation: the risk is invented
 * numbers — U-values, percentages, temperatures — set in a confident sans. So
 * uncertain facts are LEFT OUT rather than guessed, and "no made-up statistics"
 * is a line of its own. The airflow panel is the guide's, for a jali; for a
 * material where airflow does not apply, it becomes "how it performs".
 */
export function buildMaterialPosterPrompt(a: { topic: string; search: boolean; hasPhoto: boolean }): string {
  const topic = a.topic.trim() || 'the material in the photograph';
  const title = (a.topic.trim() || 'the material').toUpperCase();
  return [
    `Create a detailed architectural infographic poster about ${topic.toUpperCase()}.`,
    `STEP 1 — RESEARCH FIRST. ${research(a.search, 'its material properties, its history and its sustainable benefits')} ` +
      'Use only facts you are confident are true; leave out anything uncertain rather than guessing a number.',
    a.hasPhoto
      ? 'STEP 2 — READ THE PHOTO. The input image shows the real material. Every depiction of it on the poster — colour, ' +
        'texture, pattern and proportion — matches this photo. Where it has a pattern or perforation, draw THE PHOTO’S ' +
        'OWN SHAPES, copied — not new shapes in the same spirit.'
      : '',
    'STEP 3 — LAY OUT ONE POSTER as a bento-box grid on a textured paper background:',
    '1. Top left — a photorealistic close-up of the raw material’s texture and colour.',
    '2. Centre — an exploded axonometric diagram of how its units or layers are made and assembled.',
    '3. Bottom right — a cross-section sketch of how it performs in a building; where it moves air or heat, show it with ' +
      'arrows (blue for cool air, red for heat).',
    '4. Remaining panels — short bullet summaries of its performance and sustainability benefits, and a brief history.',
    `Title “${title}” in large, legible sans-serif; bullets under twelve words each.`,
    // K1 printed a whole panel twice; K2 copied the performance bullets under
    // sustainability and labelled the assembly twice.
    'SAY EACH THING ONCE: every panel has its own heading, used once, and no bullet or label appears in two places.',
    'Spell every word correctly and keep every word legible. No made-up statistics. Do not add any watermark or signature.',
    'CHECK before you finish: is every panel about this material? Is every bullet a plain, true statement — history ' +
      'included, which states only what is well documented? Does any heading, bullet or label appear twice? Is the ' +
      'title spelled exactly?',
  ]
    .filter(Boolean)
    .join(' ');
}

// --- Architect timeline (guide #48) -----------------------------------------

/**
 * An architect's name → their built work as a horizontal illustrated timeline.
 *
 * The facts ARE the picture: real buildings, real names, real years, in order.
 * So the research step forbids invention outright, and the drawings are unified
 * (one view, one size, one line) because the guide's outputs mix styles and the
 * timeline then reads as a collage.
 */
export function buildArchitectTimelinePrompt(a: {
  architect: string;
  fromStyle: string;
  toStyle: string;
  count: ArchitectTimelineSettings['count'];
  drawing: ArchitectTimelineSettings['drawing'];
  search: boolean;
  hasReference: boolean;
}): string {
  const who = a.architect.trim() || 'the architect';
  const from = a.fromStyle.trim();
  const to = a.toStyle.trim();
  const arc = from && to ? `, from ${from} on the left to ${to} on the right` : '';
  return [
    `Create a horizontal infographic timeline showing how the architecture of ${who.toUpperCase()} evolved${arc}.`,
    `STEP 1 — RESEARCH FIRST. ${research(a.search, 'their built works and the year each was completed')} Choose ${a.count} ` +
      'real, built projects that best show the change, spread across the career. Use each building’s real name and real ' +
      'completion year; never invent a project, a name or a date.',
    `STEP 2 — DRAW THEM. Each project as a ${
      a.drawing === 'vector' ? 'clean vector-style architectural illustration' : 'small, crisp architectural rendering'
    } of the real building, recognisable from its actual form — all at a similar size, from a similar three-quarter ` +
      'view, in the same line weight and palette, so they read as one family.',
    a.hasReference
      ? 'The input image is a style reference — copy its graphic language (palette, line, layout), never its content.'
      : '',
    'STEP 3 — LAY OUT THE TIMELINE. White background, one horizontal timeline line, the projects in date order from left ' +
      'to right, evenly spaced, each with a dot on the line. Under each: the building’s name and its year in a clean ' +
      'sans-serif.' +
      (from && to ? ` At the far left and far right, a short style label: ${from.toUpperCase()} … ${to.toUpperCase()}.` : ''),
    'Spell every name correctly and keep every label legible. Do not add any watermark or signature, and no portrait of ' +
      'the architect.',
    'CHECK before you finish: do the years increase left to right? Is every project a real building by this architect, ' +
      'with its real year?',
  ]
    .filter(Boolean)
    .join(' ');
}

// --- Blueprint evolution (guide #53) ----------------------------------------

const BLUEPRINT_STEPS = [
  'a flat, hand-drafted 2D drawing (plan, section and elevation) of the earliest form',
  'its lines lifting off the paper as folded paper planes',
  'a partial axonometric model emerging from the drawing',
  'a complete, unpainted miniature model',
  'a painted miniature with material cues',
  'a detailed scale model with lighting and context',
  'a near photo-real miniature',
  'a photo-real miniature with people and weather',
  'a near photo-real miniature of the present-day expression',
];

/**
 * A typology in words → one wide blueprint sheet where a technical drawing rises
 * into a photo-real model across seven to nine stages.
 *
 * The guide's art direction is kept almost whole. What it lacked is that the
 * stages are HISTORY — style names and dates — so a research step, date order
 * and "each stage is a different building of the lineage" are added; without
 * that the model draws one church seven times at rising fidelity.
 */
export function buildBlueprintEvolutionPrompt(a: { typology: string; stages: BlueprintEvolutionSettings['stages']; search: boolean }): string {
  const n = Number(a.stages);
  const typology = (a.typology.trim() || 'the building typology').toUpperCase();
  // The last stage is always the present-day one, however many there are.
  const steps = [...BLUEPRINT_STEPS.slice(0, n - 1), BLUEPRINT_STEPS[BLUEPRINT_STEPS.length - 1]];
  return [
    `Create ONE wide architectural illustration showing how ${typology} evolved, as a single blueprint sheet on which a ` +
      'technical drawing comes to life from left to right.',
    `STEP 1 — RESEARCH THE LINEAGE FIRST. ${research(a.search, `${n} real, major stages in this typology’s evolution, from its earliest built form to today, each with its correct style name and approximate date range`)} ` +
      'Use only stages and dates you are confident of; write uncertain dates as circa.',
    'STEP 2 — BUILD THE SHEET. Authentic blueprint paper — white linework on blue, with subtle ageing, fold marks, ' +
      'smudges and one coffee stain. Cool backlight under the flat drawing zones; warm studio light on the 3D models.',
    'STEP 3 — TRANSFORM ACROSS THE PAGE, one stage per position, left to right:',
    ...steps.map((st, i) => `Stage ${i + 1} — ${st}.`),
    'Each stage is a DIFFERENT building from the lineage, in its own period’s style, and each is more three-dimensional ' +
      'and more real than the one before.',
    `STEP 4 — SCALE AND TOOLS. A 2D drafted human figure beside stage 1 becomes a 3D miniature figure by stage ${n}, at ` +
      'consistent scale. A compass, protractor, mechanical pencil and T-square rest on the flat zones, touching the ' +
      'lines they draw.',
    // K4: a sentence per stage came back garbled ("Ray Change", "Key Obenger")
    // and every stage was captioned twice. Fewer, larger words survive.
    'STEP 5 — ANNOTATE like a drafter: grid lines and dimension strings, and ONE label per stage, printed once — its ' +
      'style name and date range only (for example “GOTHIC REVIVAL · c. 1840–1900”), large and clear. No sentences, no ' +
      'callouts, no second copy of any label. Spell every word correctly.',
    'ONE image only. Do not add any watermark or signature.',
    'CHECK before you finish: do the stages run in date order? Does each add dimension and realism? Does each stage ' +
      'have exactly one label, spelled correctly?',
  ].join(' ');
}

// --- Red-pen review (guide #21) ---------------------------------------------

const PEN_FLAWS: Record<RedPenSettings['subject'], Record<RedPenFocus, string>> = {
  interior: {
    all:
      'furniture at the wrong scale for the room, awkward circulation or a blocked door, clashing patterns or colours, ' +
      'light that does not match its source, repeating textures, dated pieces, cluttered or empty corners, odd perspective',
    scale: 'furniture, rugs, art and lights at the wrong size for the room or for each other',
    lighting: 'light that does not match its source, missing or doubled shadows, flat or over-bright areas',
    materials: 'clashing finishes and patterns, repeating or stretched textures, materials that read as fake',
    furniture: 'pieces that are dated, mismatched, badly placed or blocking circulation',
  },
  building: {
    all:
      'proportions that feel off, an unresolved facade rhythm, an awkward roofline, a weak or hidden entrance, materials ' +
      'that clash or read as fake, landscape that does not fit, odd perspective',
    scale: 'elements at the wrong size for the building or for the people around it',
    lighting: 'light that does not match the sky, missing or contradictory shadows',
    materials: 'clashing or fake-looking materials, repeating textures, joints that make no sense',
    furniture: 'landscape, street furniture and entourage that are mis-scaled, cliché or badly placed',
  },
};

/**
 * A render → the same render marked up in red felt-tip, like a design director's
 * review.
 *
 * Constructive by default (it is a QA tool); the guide's "mean-spirited" roast is
 * one tap away and still critiques only what is visible. The base image is
 * locked the Annotation way — drawn ON, never redrawn — or the critique is of a
 * different render.
 */
export function buildRedPenPrompt(a: RedPenSettings): string {
  const what = a.subject === 'interior' ? 'interior render' : 'architectural render';
  const roast = a.tone === 'roast';
  return [
    roast
      ? `You are a veteran designer with a sharp, funny tongue, marking up the ${what} in the input with a red pen — roasting it the way you would in a crit, but only for flaws that are really there.`
      : `You are a senior design reviewer marking up the ${what} in the input with a red pen, the way a design director marks up a print on their desk.`,
    `STEP 1 — READ THE RENDER FIRST and find its real weaknesses — things a client or a seasoned designer would notice: ` +
      `${PEN_FLAWS[a.subject][a.focus]}. Choose the four to six that matter most. Do not invent problems the image does ` +
      'not have; if something is good, you may tick it.',
    'STEP 2 — LOCK THE RENDER. The image underneath stays completely unchanged — same scene, same light, same camera. ' +
      'You are drawing ON it, not redrawing it.',
    'STEP 3 — MARK IT UP in hand-drawn red ink, like a felt-tip marker on paper: circles and loose outlines around each ' +
      'problem, an arrow to it, and a short handwritten note beside it ' +
      (roast
        ? 'with a dry, sarcastic one-liner about the flaw — for example “THAT RUG IS A BATH MAT” — mocking the design, ' +
          'never a person.'
        : 'saying what is wrong and what to do — for example “RUG TOO SMALL — ANCHOR THE SOFA LEGS”.') +
      ' Notes under eight words, in clear block capitals, placed in empty areas so they do not cover what they describe.',
    'Spell every word correctly and keep every note legible. Do not add any watermark or signature.',
    'CHECK before you finish: compare the scene under the ink with the input — any change to it is a mistake. Does every ' +
      'note point at something actually visible?',
  ].join(' ');
}
