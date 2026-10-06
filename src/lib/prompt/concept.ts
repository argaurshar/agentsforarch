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
import type { MassingImageRole, SketchMedium } from '../../store/generation';

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
