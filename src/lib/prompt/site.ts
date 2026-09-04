// Prompt builders for the Site & Urban category.
//
// The shared difficulty here is that the INPUT is almost always a Google Earth
// or Maps screenshot: flat, top-down, low-contrast, and carrying interface
// furniture — pins, the search bar, watermarks, road labels — that the model
// will faithfully reproduce unless told not to. So every builder in this file
// begins by naming that clutter and ordering it removed, before it asks for
// anything else.
//
// The second difficulty is that a satellite image is orthographic and most of
// these outputs are not. Turning a flat plan into a believable oblique view
// means inventing elevation the image cannot show, which is stated as an
// instruction rather than left to chance.

import { NO_TEXT } from './clauses';
import type { AerialLight, AnalysisLayer, UrbanDensity } from '../../store/generation';

export type { AerialLight, AnalysisLayer, UrbanDensity };

/** Interface furniture a screenshot carries and the output must not. */
const STRIP_UI =
  'The input is a screenshot, so it carries interface elements: map pins, the search bar, zoom controls, attribution ' +
  'and watermarks, road and place labels, and the cursor. Read them to understand the site, then remove every one of ' +
  'them from your output. None of that furniture appears in the finished image.';

// --- Bird's eye view --------------------------------------------------------

const AERIAL_LIGHT: Record<AerialLight, string> = {
  golden:
    'a low sun at golden hour. Every tree, building and structure casts a long, distinct, warm shadow across the ' +
    'landscape, and the whole scene is bathed in rich golden light',
  overcast:
    'soft even overcast light. Shadows are diffuse and short, colours are true and unsaturated, and the sky is a flat ' +
    'bright grey',
  midday:
    'high midday sun. Shadows are short and sit directly beneath their objects, contrast is strong and the light is ' +
    'neutral white',
};

/**
 * A flat satellite screenshot → a cinematic oblique aerial.
 *
 * The whole job is adding a dimension the input does not have. A satellite
 * image is orthographic and uniformly lit, so "make this a drone shot" produces
 * a tilted flat map unless the prompt insists on real topography and real
 * elevation. The instruction that carries the most weight is that the ground
 * must never look flat.
 */
export function buildBirdsEyePrompt(a: { light: AerialLight; context: string }): string {
  const where = a.context.trim();
  return [
    'You are a cinematic drone photographer. Transform the top-down satellite image in the input into a hyper-realistic ' +
      'aerial photograph of the same place.',
    STRIP_UI,
    'STEP 1 — READ THE SITE FIRST. Work out the street pattern, the footprint and rough height of each building, where ' +
      'the vegetation and water are, and which way the main roads run.' + (where ? ` Context: ${where}.` : ''),
    'STEP 2 — GIVE IT DEPTH. Convert the flat top-down view into a high-angle oblique drone shot. Introduce real ' +
      'three-dimensional topography: buildings rise to plausible heights with visible facades and roofs, terrain has ' +
      'elevation change, and trees have volume. The ground must never look flat — that is the single most common way ' +
      'this fails.',
    `STEP 3 — LIGHT IT. Illuminate the scene with ${AERIAL_LIGHT[a.light]}.`,
    'Render everything at photographic quality: trees volumetric and individually leafed, water reflective, roads and ' +
      'roofs with real material texture and weathering. Add subtle atmospheric haze into the distance so far objects ' +
      'go bluer and softer, keeping the main site sharp.',
    'CRITICAL — this is the same place, not a similar one. The street layout, the block shapes, the position of every ' +
      'building and the run of the water and green space all stay exactly as the input shows them. You are changing ' +
      'the camera and the light, not the geography.',
    NO_TEXT,
  ].join(' ');
}

// --- Urban context ----------------------------------------------------------

const DENSITY_CLAUSE: Record<UrbanDensity, string> = {
  low: 'a low-density setting — two and three storey neighbours, gardens and street trees, generous gaps between plots',
  mid: 'a mid-rise city setting — four to eight storey neighbours forming a continuous street wall, active ground floors',
  dense: 'a dense city setting — tall neighbours crowding the plot, deep street canyons, a visible skyline beyond',
};

/**
 * An isolated building → the same building in a real street.
 *
 * A render on white tells a planner nothing about scale. The failure mode is
 * that the model, asked for context, quietly redesigns the building to suit the
 * context it invented — so the building is locked before the surroundings are
 * described.
 */
export function buildUrbanContextPrompt(a: { density: UrbanDensity; city: string; entourage: boolean }): string {
  const city = a.city.trim();
  return [
    'Place the building shown in the input into a real urban context.',
    'STEP 1 — READ THE BUILDING FIRST. Note its exact massing and outline, its height and number of storeys, its roof ' +
      'form, its materials, and the position and size of every opening. Note the camera position and the lens.',
    'STEP 2 — LOCK THE BUILDING. It is finished and is not yours to change. Its geometry, proportions, openings, ' +
      'materials and colours all come through untouched, and the camera does not move. Do not resize it, reproportion ' +
      'it, or restyle it to suit its new neighbours.',
    `STEP 3 — ONLY THEN BUILD THE CONTEXT. Surround it with ${DENSITY_CLAUSE[a.density]}` +
      (city ? `, in the architectural character of ${city}` : '') +
      '. Neighbouring buildings sit on plausible plot lines, meet the street the way real buildings do, and are lit by ' +
      'the same sun as the subject — same direction, same softness, same colour temperature.',
    // The street furniture list used to include "signage boards", softened by
    // "any lettering stays illegible at this distance — a shape where a sign
    // would be, not words to read". Live run 06 shows why that does not work:
    // the model drew shopfronts reading "CAFE & STA…" and a fascia of garbled
    // letterforms, in the same image whose closing clause bans stray text. You
    // cannot ask for a sign and then ask for it to have no words on it — a sign
    // is a thing with words on it, and the model resolves the conflict by
    // writing them. So the boards are gone from the list and the ground floors
    // are named as unbranded. `promptContradictions` now holds the pair.
    'Continue the ground plane out from the building: pavement, kerbs, road surface, street trees, parked cars and ' +
      'lighting columns, all at correct scale against the building. Every ground floor on the street is UNBRANDED: no ' +
      'shopfront fascias, no hanging signs, no billboards, no posters, no menu boards, no house numbers and no ' +
      'lettering on any vehicle. Where a real street would carry a sign, leave that surface plain.',
    a.entourage
      ? 'Populate the street with people at correct scale, occupied and not looking at the camera.'
      : 'No people.',
    'Photorealistic architectural photograph, physically based lighting, natural colour grade, ultra-detailed.',
    'Before you finish, compare your building against the input: same storeys, same window pattern, same roofline, ' +
      'same materials. If any of it has changed to suit the context, rebuild it — the context serves the building, ' +
      'not the other way round.',
    NO_TEXT,
  ].join(' ');
}

// --- Floor analysis ---------------------------------------------------------

const LAYER_CLAUSE: Record<AnalysisLayer, string> = {
  circulation:
    'CIRCULATION. Trace the route a person takes through the plan: entry, hallways, the stair or lift core, and the ' +
    'door-to-door path into every room. Draw it as a bold coloured flow line with direction arrows, thicker on the ' +
    'primary route and thinner on secondary ones. Mark the entry point with a distinct symbol',
  // The legend deliberately is NOT here. It was, and it made every labels-off
  // zoning run ask for a keyed legend and forbid all text in the same prompt —
  // the exact bug class this app's contradiction gate exists for, shipped
  // because the gate's rule was keyed on a phrase pair that could never
  // co-occur. Anything that puts words on the image now lives in the labels
  // branch and nowhere else.
  zoning:
    'ZONING. Group the rooms by how they are used — living and social, private and sleeping, service and wet areas, ' +
    'circulation — and fill each group with its own flat translucent colour so the plan reads as coloured territories. ' +
    'Distinguish the zones by colour alone, so the drawing still works with no words on it',
  daylight:
    'DAYLIGHT. Show where light enters: mark every window and glazed opening, and cast a soft graduated wash into each ' +
    'room from its own openings, strongest at the glass and fading with depth. Rooms with no opening are left visibly ' +
    'unlit, which is the point of the drawing',
  structure:
    'STRUCTURE. Distinguish what holds the building up from what merely divides it: draw load-bearing and external ' +
    'walls as heavy solid poché, internal partitions as thin lines, and mark every column and beam over',
};

/**
 * A floor plan → the same plan with one analytical layer over it.
 *
 * One layer at a time, deliberately. Asked for circulation and zoning and
 * daylight at once, the model produces a colourful mess that communicates
 * nothing — the value of an analysis drawing is that it says one thing clearly.
 * Running the tool several times gives a set that reads as a series.
 */
export function buildFloorAnalysisPrompt(a: { layer: AnalysisLayer; labels: boolean }): string {
  return [
    'You are producing an architectural analysis diagram from the floor plan in the input.',
    'STEP 1 — READ THE PLAN FIRST. Trace the outer perimeter and note whether it is rectangular or irregular. Identify ' +
      'each room and what it is for, and note every door, window and opening.',
    'STEP 2 — KEEP THE PLAN UNDERNEATH. Redraw the plan itself faithfully and quietly: the same outline, the same ' +
      'rooms in the same positions at the same relative sizes, every wall and opening where the input puts them, in ' +
      'light grey line work. The plan is the substrate, not the subject.',
    `STEP 3 — ONLY THEN ADD THE LAYER. Overlay exactly one analysis: ${LAYER_CLAUSE[a.layer]}.`,
    'Draw only this one layer. Do not add circulation arrows to a zoning diagram or colour zones onto a daylight ' +
      'study — a diagram that says one thing clearly beats one that says four things faintly.',
    'Flat vector diagram style on white: clean line work, flat translucent fills, no shadows, no gradients, no ' +
      'photorealism, viewed from directly overhead.',
    a.labels
      ? 'Label each room with a small, plain, correctly spelled name, and title the diagram with the name of the ' +
          'analysis.' +
          (a.layer === 'zoning' ? ' Add a small keyed legend naming each zone.' : '') +
          ' Spell every word correctly. No dimensions, no north arrow, no scale bar, no title block.'
      : NO_TEXT,
    'Before you finish, check the plan under the overlay: same outline, same rooms in the same places. If the ' +
      'underlying plan has changed, redraw it — an analysis of a different plan is worthless.',
  ].join(' ');
}
