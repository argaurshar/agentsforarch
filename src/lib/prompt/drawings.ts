// Prompt builders for the Plans & Drawings category.
//
// Everything here outputs a DRAWING, not a picture — orthographic, line-based,
// on white. That is one shared fight: the model's prior for "building image" is
// a photograph, so left to itself it adds a vanishing point, a sky, a sun and a
// cast shadow to whatever it is asked for. Every builder in this file states the
// projection explicitly and then checks it again at the end, because a drawing
// that is 90% right and subtly perspectival is useless in a drawing set.
//
// The other half of the fight is direction-specific and stated per tool: a
// section that is really an elevation, a CAD plan that "improves" the sketch's
// layout, a plan reverse-engineered from a render that invents rooms the image
// never showed.

import { FOOTPRINT_CHECK, FOOTPRINT_LOCK, FOOTPRINT_READ, NO_TEXT } from './clauses';

// --- Shared to this category ------------------------------------------------

/**
 * The projection lock.
 *
 * Kept here rather than in clauses.ts: an axonometric is also a paraline
 * projection but a DIFFERENT one, and a clause promoted to the shared file
 * before a second category genuinely needs it is how two tools quietly start
 * sharing text that only ever suited one of them.
 */
export const ORTHOGRAPHIC_LOCK =
  'This is an ORTHOGRAPHIC drawing, not a photograph and not a perspective view. There is no vanishing point and no ' +
  'foreshortening: every set of lines that is parallel on the building is parallel on the page, verticals are dead ' +
  'vertical, and two elements of the same real size are drawn the same size wherever they sit in the drawing. Do not ' +
  'tilt the view, do not rotate it, and do not add depth of field.';

/** How the line work should look. Line-weight hierarchy is what separates a
 *  drawing from a traced outline. */
export const DRAWING_CRAFT =
  'Draw it the way an architectural office would: crisp, even, confident lines on a clean white background, with a ' +
  'clear line-weight hierarchy — heaviest where material is cut, medium for edges seen in elevation, lightest for ' +
  'surface lines, hatching and setting-out. No shading, no gradients, no photographic texture, no sky, no sun, no cast ' +
  'shadows and no colour except where explicitly asked for.';

/** The closing check every builder here ends on. */
const projectionCheck = (what: string): string =>
  `Before you finish, check the projection: if any set of parallel lines converges, if anything is foreshortened, or ` +
  `if the drawing reads as a photograph rather than as a ${what}, redraw it. Getting the projection right matters more ` +
  `than any styling instruction above.`;

/** Text on a drawing is a liability — models spell it wrong. Only allow it where
 *  the user asked, and then insist on it being correct. */
const annotationClause = (mode: AnnotationMode, subject: string): string => {
  if (mode === 'none') return NO_TEXT;
  if (mode === 'labels') {
    return (
      `Label each ${subject} with a small, plain, correctly spelled name in a simple architectural sans-serif — nothing ` +
      'else. No dimension strings, no title block, no north arrow, no scale bar, no watermark, no signature. Spell ' +
      'every word correctly.'
    );
  }
  return (
    `Label each ${subject} with a small, plain, correctly spelled name, and add a dimension line along each outer face ` +
    'with a plausible figure, plus an overall dimension across the full width and full depth. Dimension lines are thin ' +
    'with neat tick marks. No title block, no north arrow, no watermark, no signature. Spell every word correctly and ' +
    'keep every number legible.'
  );
};

export type AnnotationMode = 'none' | 'labels' | 'dimensioned';
export type DrawingUnits = 'metric' | 'imperial';

const unitsClause = (units: DrawingUnits): string =>
  units === 'metric'
    ? 'All dimensions are metric, in millimetres, in the European convention.'
    : 'All dimensions are imperial, in feet and inches, in the US convention.';

// --- Sketch → CAD plan ------------------------------------------------------

/**
 * A napkin sketch → the drawn-up plan.
 *
 * The failure here is not draughtsmanship, it is editing: asked to "clean up" a
 * loose sketch, the model produces a tidy plan of a DIFFERENT building — rooms
 * merged, a wobbly wing straightened into a rectangle, a door moved to where a
 * door usually goes. So this reuses the footprint contract that was written for
 * the isometric after exactly that bug: read the perimeter, lock it, check it.
 */
export function buildSketchPlanPrompt(a: {
  annotation: AnnotationMode;
  units: DrawingUnits;
  furnished: boolean;
}): string {
  const parts: string[] = [
    'You are a draughtsman taking a rough hand sketch and drawing it up as a clean, precise 2D architectural floor ' +
      'plan. You are DRAWING UP the sketch, not redesigning it: the layout has already been decided and your job is ' +
      'to render it properly.',
    FOOTPRINT_READ,
    FOOTPRINT_LOCK,
    'STEP 3 — ONLY THEN DRAW IT UP. Straighten every wobbly line into a true straight line, square up every corner ' +
      'that was meant to be square, and give the drawing real CAD conventions: walls as double lines with solid poché ' +
      'between them, door openings as a gap in the wall with a quarter-circle swing arc, windows as a thinner break in ' +
      'the wall with sill lines, and consistent wall thicknesses throughout.',
    a.furnished
      ? 'Include simple plan-view fixtures where the sketch implies them: sanitary ware in bathrooms, counters and a ' +
        'sink in the kitchen, beds in bedrooms, a stair with tread lines and a direction arrow. Draw them as clean ' +
        'line symbols, not as rendered objects.'
      : 'Draw the shell only — walls, doors, windows and the stair. No furniture, no fixtures, no floor patterns.',
    ORTHOGRAPHIC_LOCK,
    'Viewed from directly overhead, dead flat, with no thickness or 3D to the walls.',
    DRAWING_CRAFT,
    annotationClause(a.annotation, 'room'),
  ];
  if (a.annotation === 'dimensioned') parts.push(unitsClause(a.units));
  parts.push(FOOTPRINT_CHECK, projectionCheck('flat 2D plan'));
  return parts.join(' ');
}

// --- Architectural section --------------------------------------------------

export type SectionAxis = 'longitudinal' | 'cross';
export type SectionStyle = 'line' | 'shaded';

/**
 * A model or a plan → a vertical cut through the building.
 *
 * One failure dominates everything else: the model draws an ELEVATION. Both are
 * flat orthographic views of a building from the side, and elevations vastly
 * outnumber sections in any training set, so "section" alone loses to the prior.
 *
 * The fix is not more adjectives — it is describing what a section physically
 * IS (the building sawn in half, the near half taken away) and then giving a
 * concrete failure test at the end: if you cannot see inside the rooms, you have
 * drawn the wrong thing.
 */
export function buildSectionPrompt(a: {
  axis: SectionAxis;
  style: SectionStyle;
  levels: string;
  entourage: boolean;
  annotation: AnnotationMode;
  units: DrawingUnits;
}): string {
  const levels = a.levels.trim();
  const parts: string[] = [
    'You are producing an ARCHITECTURAL SECTION of the building shown in the input image.',
    // Physical description first, label second.
    'A section is the building sawn straight through from roof to foundation and the near half carried away, so you ' +
      'are looking directly into the rooms. It is NOT an elevation and NOT a view of the outside of the building.',
    a.axis === 'longitudinal'
      ? 'Cut along the building’s LONG axis, through as many rooms and the stair as that line passes through.'
      : 'Cut ACROSS the building’s short axis, through the main space and the stair.',
    'STEP 1 — READ THE BUILDING FIRST. From the input, work out how many storeys it has, roughly where the floor ' +
      'levels sit, where the stair is, what the roof form is, and how deep the building is front to back.' +
      (levels ? ` Take this as given: ${levels}.` : ''),
    'STEP 2 — DRAW WHAT THE CUT PASSES THROUGH. Every element the saw passes through — the floor slabs, the roof, the ' +
      'foundations, the walls at each end, any wall crossing the cut line — is drawn as a solid, heavy, filled poché ' +
      'in the darkest tone on the drawing. Floor and roof slabs read as continuous horizontal bands of that poché at ' +
      'their real thickness.',
    'STEP 3 — DRAW WHAT IS BEYOND THE CUT. Behind the cut plane, inside each room, draw what you would actually see: ' +
      'the back wall, its doors and windows, the far side of the stair with its individual treads and risers, and the ' +
      'ceiling above. Draw all of this in lighter line weights than the cut, so the cut clearly sits in front.',
    a.entourage
      ? 'Place a few simple human figures and pieces of furniture inside the rooms, drawn as light outlines, so the ' +
        'ceiling heights and room sizes read at a glance.'
      : 'No people and no furniture — the section is empty.',
    a.style === 'shaded'
      ? 'Add restrained tonal shading: soft grey to the surfaces beyond the cut so the depth reads, light material ' +
        'hatching in the poché, and a suggestion of daylight falling through the openings. Keep it a drawing, not a render.'
      : 'Pure line drawing — black line on white, tone only in the solid poché of the cut.',
    ORTHOGRAPHIC_LOCK,
    DRAWING_CRAFT,
    annotationClause(a.annotation, 'floor level and room'),
  ];
  if (a.annotation === 'dimensioned') {
    parts.push(unitsClause(a.units), 'Add a vertical dimension chain up one side showing floor-to-floor heights.');
  }
  // The concrete failure test. "Draw a section, not an elevation" is an
  // instruction; this is something the model can actually check its output against.
  parts.push(
    'Before you finish, apply this test: can you see INSIDE the rooms — floor slabs cut through, room interiors, the ' +
      'stair? If instead you are looking at the closed outside face of the building, you have drawn an elevation. ' +
      'Start again and cut the building open.',
    projectionCheck('flat orthographic section'),
  );
  return parts.join(' ');
}

// --- Render → plan ----------------------------------------------------------

/**
 * A 3D view → the floor plan underneath it.
 *
 * Runs against the arrow: every other tool here goes drawing → image, and this
 * one goes back. That makes it the one tool in this file that must INVENT, since
 * a single viewpoint cannot show the whole plan — so the discipline is to be
 * explicit about which parts are read and which are inferred, and to keep the
 * inferred parts boring. An elaborate invented wing is a much worse error than a
 * plain one, because it looks considered.
 *
 * It also carries a visible accuracy warning in the UI. This is the tool most
 * likely to produce something confident and wrong.
 */
export function buildRenderToPlanPrompt(a: {
  annotation: AnnotationMode;
  units: DrawingUnits;
  furnished: boolean;
}): string {
  const parts: string[] = [
    'You are an architect reverse-engineering a 2D floor plan from the three-dimensional view in the input image.',
    'STEP 1 — READ THE VIEW FIRST. The input is a perspective, so its parallel edges converge. Work out where the ' +
      'ground plane is, follow the outer walls around the building, and note every door, window and opening you can ' +
      'actually see, and which wall each one sits in. Note where the floor changes level and where a stair is visible.',
    'STEP 2 — UNDO THE PERSPECTIVE. Reconstruct the footprint as it would look from directly overhead: the converging ' +
      'edges become parallel again, and the proportions become the real ones rather than the foreshortened ones. If ' +
      'the building steps, returns or has a wing, that shape carries into the plan.',
    // The honesty clause. This is the whole difference between a useful tool and
    // a confidently wrong one.
    'STEP 3 — BE HONEST ABOUT WHAT YOU CANNOT SEE. A single view cannot show the whole plan. Draw everything the image ' +
      'does show exactly as it shows it. For the parts it cannot show — the far side, rooms with no visible opening — ' +
      'complete the plan in the simplest, most ordinary way consistent with what IS visible. Do not invent an ' +
      'elaborate layout, an extra wing, a courtyard or a feature stair that nothing in the image supports. A plain ' +
      'guess is correct here; an interesting one is not.',
    a.furnished
      ? 'Include simple plan-view furniture and fixtures in the rooms, drawn as clean line symbols.'
      : 'Shell only — walls, doors, windows and the stair. No furniture.',
    'Walls as double lines with solid poché, doors as a gap with a swing arc, windows as a thinner break with sill lines.',
    ORTHOGRAPHIC_LOCK,
    'Viewed from directly overhead, dead flat.',
    DRAWING_CRAFT,
    annotationClause(a.annotation, 'room'),
  ];
  if (a.annotation === 'dimensioned') parts.push(unitsClause(a.units));
  parts.push(projectionCheck('flat 2D plan'));
  return parts.join(' ');
}

// --- 3D model → CAD elevation -----------------------------------------------

export type ElevationFace = 'front' | 'left' | 'right' | 'rear';

const FACE_PHRASE: Record<ElevationFace, string> = {
  front: 'the face turned towards the camera in the input',
  left: 'the face on the LEFT of the building as seen in the input',
  right: 'the face on the RIGHT of the building as seen in the input',
  rear: 'the face AWAY from the camera in the input — the back of the building, which you must infer from the volume, ' +
    'roof form and materials that are visible',
};

/**
 * A modelling-software screenshot → a measured line elevation.
 *
 * Distinct from the existing Elevation tool, which produces a RENDERED elevation
 * for a client. This one produces the drawing that goes in the set: line work,
 * level lines, material hatching, no styling.
 *
 * The specific difficulty is that the input is almost always a perspective
 * viewport, and "make an elevation of this" reads to the model as "tidy this
 * photo up". The de-perspectiving has to be an explicit step, not an adjective.
 */
export function buildCadElevationPrompt(a: {
  face: ElevationFace;
  annotation: AnnotationMode;
  units: DrawingUnits;
  hatch: boolean;
}): string {
  const parts: string[] = [
    'You are producing a measured CAD-style ARCHITECTURAL ELEVATION drawing of the building shown in the input image.',
    `Draw ${FACE_PHRASE[a.face]}, and only that face.`,
    'STEP 1 — READ THE BUILDING FIRST. The input is a three-dimensional view, so it is foreshortened. Work out the ' +
      'building’s real proportions: its true width and height, the number of storeys, where each floor level sits, and ' +
      'the true size and position of every opening in the face you are drawing.',
    'STEP 2 — UNDO THE PERSPECTIVE. This is the step that matters most. Redraw that face straight-on and flat: the ' +
      'converging roof line becomes horizontal, the receding wall edges become vertical, every window on the same ' +
      'floor sits on one level line, and two windows of the same real size are drawn the same size regardless of ' +
      'where they were in the input. Nothing of the returning side wall, the roof plane or the ground plane appears — ' +
      'this is one flat face and nothing else.',
    'STEP 3 — DRAW IT PROPERLY. Show the outline of the face, every window and door with its frame divisions and sill, ' +
      'the roof edge, eaves, any string course, balcony, downpipe or vent that is visible, and a single ground line ' +
      'along the base.',
    a.hatch
      ? 'Indicate materials with the conventional light hatching or texture for each — brickwork, render, stone, ' +
        'cladding, glazing — applied flat with no shading or gradient.'
      : 'Leave the surfaces blank white: outline and openings only, no material indication.',
    ORTHOGRAPHIC_LOCK,
    DRAWING_CRAFT,
    annotationClause(a.annotation, 'floor level'),
  ];
  if (a.annotation === 'dimensioned') {
    parts.push(unitsClause(a.units), 'Add a vertical dimension chain up one side and a horizontal one along the base.');
  }
  parts.push(
    'Before you finish, check for perspective: if the roof line slopes when it should be level, if the two ends of the ' +
      'building are different heights, or if you can see any part of a side wall or the roof plane, you have drawn the ' +
      '3D view again rather than an elevation. Redraw it flat.',
    projectionCheck('flat orthographic elevation'),
  );
  return parts.join(' ');
}
