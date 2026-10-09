// Prompt builders for the Concept & Form category.
//
// These run at the very start of a project, when there is often nothing to
// upload yet — a brief, a plot size, an orientation. That makes this the first
// category whose tools generate from prose rather than from an image, and the
// discipline changes with it: with no input image to hold the model to, every
// constraint that matters has to be stated, because anything left unsaid gets
// invented plausibly and confidently.

import { CONTEXTS, LIGHTING, archStyleClause, materialsClause } from '../scene';
import type { SceneOptions } from '../../store/generation';
import { NO_TEXT } from './clauses';
import type {
  BoardProgram,
  DiagramLook,
  DiagramSteps,
  MassingImageRole,
  SketchMedium,
} from '../../store/generation';

export type { SketchMedium };

export type MassingDensity = 'low' | 'medium' | 'high';

const DENSITY_CLAUSE: Record<MassingDensity, string> = {
  low: 'low-rise and spread out — one to three storeys, generous space between volumes',
  medium: 'mid-rise — three to eight storeys, volumes close but distinct',
  high: 'high-density — eight storeys and up, tightly packed with a clear tallest element',
};

/**
 * A brief → a massing model, with no input image at all.
 *
 * The classic first-morning study: how much building, arranged how, on this
 * plot. It is deliberately a WHITE MODEL — no materials, no glazing, no
 * entourage — because the whole value of a massing study is that it refuses to
 * answer questions it is too early to ask. A photoreal render at this stage
 * invites the client to argue about brick colour before the volume is agreed.
 */
export function buildMassingPrompt(a: {
  brief: string;
  siteSize: string;
  density: MassingDensity;
  storeys: string;
  context: string;
  /** What the attached image is, or null when there is none. With null the
   *  prompt is byte-identical to the text-only tool it used to be. */
  image?: MassingImageRole | null;
}): string {
  const image = a.image ?? null;
  const site = a.siteSize.trim();
  const storeys = a.storeys.trim();
  const context = a.context.trim();
  // With a sketch attached the drawing IS the brief, so an empty brief field is
  // no longer a reason to invent "a mixed-use building".
  const brief =
    a.brief.trim() ||
    (image === 'sketch' ? 'the building drawn in the attached sketch' : 'a mixed-use building');

  const parts: string[] = [
    `You are an architect producing an early MASSING STUDY — a physical white study model, photographed. ` +
      `The project is: ${brief}.`,
  ];

  if (image === 'sketch') {
    parts.push(
      'AN IMAGE IS ATTACHED: a SKETCH of this massing. It is the design. STEP 1 — READ THE SKETCH FIRST: count the ' +
        'volumes, and note how they are arranged, their relative heights, where they step, set back, cantilever or ' +
        'leave a courtyard or void between them. STEP 2 — BUILD EXACTLY THAT. The same number of volumes, in the same ' +
        'arrangement, at the proportions the sketch implies. Straighten wobbly hand lines into clean planes and true ' +
        'corners, but do not add a volume, remove one, merge two, or tidy the composition into something more regular ' +
        'than drawn. Where the typed brief adds a site size or a height, use it to set the scale; where it disagrees ' +
        'with the sketch about FORM, the sketch wins. Handwritten notes, dimensions and arrows on the sketch are ' +
        'information for you, not marks to reproduce.',
    );
  } else if (image === 'reference') {
    parts.push(
      'AN IMAGE IS ATTACHED: a REFERENCE — a precedent building or model whose massing idea the architect likes. Do ' +
        'not reproduce it. Read the STRATEGY behind its form — how its volumes are stacked, stepped, cantilevered, ' +
        'carved, splayed or wrapped around a void — and apply that strategy to THIS project, at THIS project’s ' +
        'brief, site and height. The result must be recognisably a different building that shares the reference’s ' +
        'logic of form. Take nothing else from it: not its outline, its proportions, its facade, its windows or its ' +
        'materials.',
    );
  }

  parts.push(
    site
      ? `The site measures ${site}. Read that as the plot boundary and keep the building within it, with the setbacks a real scheme would have.`
      : image === 'sketch'
        ? 'If the sketch shows the plot, keep the building within it; otherwise choose a plausible plot that fits what is drawn, with realistic setbacks.'
        : 'Choose a plausible rectangular plot and keep the building within it, with realistic setbacks.',
    image === 'sketch'
      ? `Where the sketch leaves heights unclear, the massing is ${DENSITY_CLAUSE[a.density]}.` +
          (storeys ? ` Aim for roughly ${storeys}.` : '')
      : `The massing is ${DENSITY_CLAUSE[a.density]}.` + (storeys ? ` Aim for roughly ${storeys}.` : ''),
    context
      ? `The immediate context is ${context}; show it as simple lower-contrast grey blocks around the site so the scale reads.`
      : 'Show two or three neighbouring plots as simple lower-contrast grey blocks so the scale reads.',
    // The hard part of a massing prompt is everything it must REFUSE to do.
    'CRITICAL — this is a MASSING model, not a render. Every volume is plain matte white, with no materials, no ' +
      'brick, no timber, no glazing, no window openings, no doors, no railings, no signage, no colour and no ' +
      'entourage. Form only: the volumes, how they step, and how they meet the ground. Do not decorate it, and do ' +
      'not resolve details the design has not reached yet.',
    // A perspective sketch has already chosen its camera, and re-shooting it
    // from a stock aerial angle makes it hard to compare against the drawing.
    image === 'sketch'
      ? 'If the sketch is a perspective, photograph the model from that same viewpoint; if it is a plan or an ' +
          'elevation, show a three-quarter aerial view from about 30 degrees above the horizon. Soft even studio ' +
          'daylight with clean legible shadows that describe the steps and setbacks. Neutral pale grey ground plane, ' +
          'plain background, no sky drama.'
      : 'Show it as a three-quarter aerial view from about 30 degrees above the horizon, in soft even studio daylight ' +
          'with clean legible shadows that describe the steps and setbacks. Neutral pale grey ground plane, plain ' +
          'background, no sky drama.',
    'Photorealistic photograph of a crisp white architectural study model, shallow depth of field, ultra-detailed.',
  );
  if (image === 'sketch') {
    parts.push(
      'Before you finish, compare the model against the sketch volume by volume: if one has appeared, vanished or ' +
        'merged with another, rebuild it.',
    );
  } else if (image === 'reference') {
    parts.push(
      'Before you finish, compare the model against the reference: if it reads as a copy of that building rather ' +
        'than this project built on the same idea, rebuild it.',
    );
  }
  parts.push(NO_TEXT);
  return parts.join(' ');
}

// --- Sketch → render --------------------------------------------------------

const MEDIUM_CLAUSE: Record<SketchMedium, string> = {
  illustration:
    'a refined architectural concept illustration — confident clean linework still visible under soft translucent ' +
    'colour, restrained shadow, a light airy palette, the look of a well-drawn competition perspective',
  photoreal:
    'a photorealistic architectural render — real materials with real texture, physically based lighting, believable ' +
    'sky and ground, natural colour grade',
  hybrid:
    'a hybrid drawing — the original hand linework deliberately left visible on top of a rendered image, so the ' +
    'result still reads as a drawing that has been coloured rather than as a photograph',
};

/**
 * A rough hand sketch → a presentable image of the same idea.
 *
 * The failure here is generosity. A sketch is ambiguous by construction — a
 * scribble is a tree or a bush or a person, a wavy line is a roof or a hill —
 * and a model resolving that ambiguity will resolve it *upward*: an extra wing
 * appears, the massing gets balanced, the horizon is put where it composes
 * better. Every one of those changes makes a nicer picture of a different
 * building, which is worthless to the architect holding the sketch.
 *
 * So the sketch is treated as fixed input in the same way a floor plan is, and
 * the closing check is a mass-for-mass comparison rather than a general
 * instruction to be faithful.
 */
export function buildSketchRenderPrompt(a: SceneOptions & { medium: SketchMedium; subject: string }): string {
  const subject = a.subject.trim();
  const style = archStyleClause(a);
  const materials = materialsClause(a);
  const context = CONTEXTS[a.context].clause;
  return [
    'You are turning the rough hand-drawn architectural sketch in the input into a finished image of the same design.',
    'STEP 1 — READ THE SKETCH FIRST. Work out which lines are the building and which are not: construction lines, ' +
      'guide lines, arrows, dimension scribbles, handwriting and margin notes are the architect thinking, not part of ' +
      'the design. Find the horizon and the vanishing points the sketch is drawn to. Count the storeys, the distinct ' +
      'masses, and the openings in each face.' + (subject ? ` The sketch shows ${subject}.` : ''),
    'STEP 2 — LOCK THE DRAWING. Keep the sketch’s viewpoint, its perspective, its horizon, its proportions, its ' +
      'composition and its crop. Every mass in your output corresponds to a mass the sketch draws, in the same ' +
      'position and at the same relative size. Do NOT invent geometry the sketch does not contain — no extra wing, ' +
      'tower, canopy, balcony, storey or second building — and do not rebalance the massing to make a better picture. ' +
      'Where the sketch is ambiguous, resolve it the simplest way rather than the most impressive one.',
    'The sketch’s own annotation does not survive: leave out the construction lines, the arrows, the dimension ' +
      'scribbles and every word of handwriting. They told you what to draw; they are not in the drawing.',
    `STEP 3 — ONLY THEN RESOLVE IT. Render the locked design as ${MEDIUM_CLAUSE[a.medium]}.`,
    style ? `Design language: ${style}.` : '',
    materials ? `Materials: ${materials}.` : '',
    `Light it with ${LIGHTING[a.lighting].clause}.`,
    context ? `The setting is ${context}, developed only as far as the sketch implies.` : '',
    a.entourage
      ? 'Add a few people at correct scale, occupied and not looking at the camera.'
      : 'No people and no vehicles.',
    'Before you finish, compare your image against the sketch mass by mass and opening by opening. An extra volume, a ' +
      'moved horizon, a shifted viewpoint or a storey the sketch does not draw is a mistake, not an improvement — ' +
      'redo it.',
    NO_TEXT,
  ]
    .filter(Boolean)
    .join(' ');
}

// --- Concept diagram (guide #14) --------------------------------------------

/** The typed moves, one per line (or separated by semicolons). */
export function parseMoves(moves: string): string[] {
  return moves
    .split(/\n|;/)
    .map((m) => m.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 6);
}

/** Panels drawn: the typed moves when there are at least two, else the setting. */
export function conceptDiagramPanels(a: { steps: DiagramSteps; moves: string }): number {
  const typed = parseMoves(a.moves).length;
  return typed >= 2 ? typed : Number(a.steps);
}

const LOOK_CLAUSE: Record<DiagramLook, string> = {
  bold:
    'flat, saturated colours in the manner of BIG or MVRDV — the volume in one warm neutral, and each move’s new ' +
    'element in its own clear accent (green for planting, a bright colour for what is cut, lifted or added)',
  mono: 'grey massing throughout, with a single orange accent marking the element each move adds or changes',
};

/**
 * A finished building → the BIG-style sequence of moves that explains its form.
 *
 * The guide's prompt hard-codes four moves for one building (block, courtyard,
 * mountain, greenery). Here the moves are READ from the input, because the
 * failure is not drawing — it is a sequence that ends on a different building.
 * Two things make such a diagram worth anything, and both are named: every
 * panel shares one camera, and the last panel IS the input. A diagram whose
 * panels drift explains nothing about the project it is pinned beside.
 */
export function buildConceptDiagramPrompt(a: {
  steps: DiagramSteps;
  moves: string;
  look: DiagramLook;
  labels: boolean;
}): string {
  const typed = parseMoves(a.moves);
  const n = conceptDiagramPanels(a);
  const parts: string[] = [
    'You are making a step-by-step architectural concept diagram — the kind BIG or MVRDV put on a competition board — ' +
      'that explains how the building in the input image got its form.',
    'STEP 1 — READ THE BUILDING FIRST. Study the input until you can describe its final form exactly: footprint and ' +
      'proportions, number of storeys, and every cut, void, courtyard, step, cantilever, setback and roof garden. That ' +
      'final form is the answer the diagram has to arrive at.',
    typed.length >= 2
      ? `STEP 2 — FOLLOW THE ARCHITECT’S MOVES. Explain the form as these ${n} moves, in this order: ` +
        `${typed.map((m, i) => `${i + 1}. ${m}`).join('; ')}. Begin from the plain extruded volume that fills the site, ` +
        'and let each move make exactly ONE visible change to it.'
      : `STEP 2 — WORK BACKWARDS INTO MOVES. Explain the form as ${n} simple design moves applied in order to one ` +
        'starting block. Begin with the plain extruded volume that fills the site, and let each later move make exactly ' +
        'ONE visible change — a carve, a lift, a step, a twist, a split, added greenery — chosen because you can SEE it ' +
        'in the final building. Do not invent moves the building does not show.',
    `STEP 3 — DRAW THE SEQUENCE. ${n} panels side by side, left to right, each showing the same building from the SAME ` +
      'axonometric camera angle, at the same scale, on the same footprint. Draw the volume as a clean simplified massing ' +
      'model: no photorealism, no texture, no people, no context beyond a thin ground plane. In each panel show the move ' +
      'happening: a bold arrow for the push, pull or lift, the removed part as a ghosted outline, the new element ' +
      'picked out in colour. Every panel keeps everything the previous panel established.',
    `Colour: ${LOOK_CLAUSE[a.look]}. One palette across all ${n} panels, on a plain white background.`,
    'The last panel must match the input building’s massing — same courtyard, same steps, same proportions. A sequence ' +
      'that ends on a different building explains nothing.',
    a.labels
      ? 'Under each panel, a short numbered caption of two to four words naming the move (for example 1. SITE VOLUME, ' +
        '2. CARVE COURTYARD) in a clean bold sans-serif. Spell every word correctly and keep every word legible.'
      : NO_TEXT,
    `CHECK before you finish: is the camera identical in all ${n} panels? Does each panel differ from the one before ` +
      'by exactly one move? Does the final panel match the input’s form? If not, redo it.',
  ];
  return parts.join(' ');
}

// --- Bio-mimicry concept board (guide #55) ----------------------------------

const PROGRAM_NOUN: Record<Exclude<BoardProgram, 'custom'>, string> = {
  pavilion: 'an exhibition pavilion',
  museum: 'a small museum',
  house: 'a house',
  tower: 'a residential tower',
};

/**
 * An inspiring object or image → a building concept, presented as one
 * three-part competition board.
 *
 * The failure the guide names is kitsch: a museum shaped like a shell. So the
 * read step describes the subject WITHOUT naming it — form, texture, behaviour
 * — and the design step works from that description, never from the object.
 * The second failure is a board of three unrelated buildings, which is why
 * "the SAME building" is stated and checked.
 */
export function buildConceptBoardPrompt(a: { program: BoardProgram; customProgram: string; title: string }): string {
  // An empty "Something else" is blocked in the UI; if it ever reaches here it
  // still reads as a complete instruction, and NOT as the pavilion default.
  const what =
    a.program === 'custom'
      ? a.customProgram.trim() || 'a building whose purpose suits the inspiration'
      : PROGRAM_NOUN[a.program];
  const title = a.title.trim();
  return [
    `You are designing an architectural concept — ${what} — inspired by the image in the input, and presenting it as ` +
      'one competition board.',
    'STEP 1 — READ THE INSPIRATION FIRST. Describe to yourself what makes the subject distinctive WITHOUT naming it: ' +
      'its form and silhouette, proportions, colours, surface textures, tone, and behaviour — how it grows, folds, ' +
      'opens, repeats, protects or lets light through. Those qualities are the design language.',
    'STEP 2 — TRANSLATE, DO NOT COPY. Design a building that carries those qualities into architecture — structure, ' +
      'envelope, light and circulation — so someone who knows the source would recognise the idea, but the building is ' +
      'not shaped like the object. Never reproduce the object literally, never show a face, head or recognisable ' +
      'figure, and never paste the input image onto the board.',
    'STEP 3 — LAY OUT ONE BOARD with exactly three parts, on a background themed on the inspiration’s palette and ' +
      'texture, in a structured international layout with generous margins:',
    `1. CONCEPT — a loose, hand-painted colour sketch of the core idea, with ${
      title ? `the title “${title}”` : 'the design’s title'
    } above it.`,
    '2. MAIN RENDER — the largest part: a realistic, photographic render of the building in use, with people, ' +
      'circulation and a credible setting.',
    '3. INTERIOR VIGNETTES — three or four small views of interior moments and details.',
    'All three parts show the SAME building.',
    'Text is limited to the title and at most one short line per part, in a clean sans-serif. Spell every word ' +
      'correctly and keep every word legible. Do not add any watermark or signature.',
    'CHECK before you finish: is the building clearly inspired by the input, yet not a copy of it? Are there exactly ' +
      'three parts showing one building? Is the title spelled correctly?',
  ].join(' ');
}
