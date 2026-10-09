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
import type {
  AerialLight,
  AnalysisLayer,
  PlaceInSiteSettings,
  SiteAnalysisSettings,
  SiteLineworkSettings,
  UrbanDensity,
} from '../../store/generation';

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

// --- Vector site map (guide #32) --------------------------------------------

/**
 * A satellite or map screenshot → black-and-white vector linework of the same
 * place.
 *
 * The guide's prompt names a city and asks for line weights. What it does not
 * say is that the drawing must OVERLAY the input — and a model asked to "draw"
 * a city tidies it: streets straightened, blocks regularised, a missing road
 * added. A base layer that does not overlay its source is useless as a base
 * layer, so the overlay is the lock and the closing check.
 */
export function buildSiteLineworkPrompt(a: SiteLineworkSettings): string {
  return [
    'You are tracing the satellite or map image in the input into a clean black-and-white vector site drawing for a ' +
      'presentation board.',
    STRIP_UI,
    'STEP 1 — READ THE MAP FIRST. Identify every building footprint, road and kerb, footpath, plot boundary, open ' +
      'space and water edge, and the exact position of each. The drawing must overlay the input exactly: same extent, ' +
      'same orientation, same scale, nothing moved, nothing invented.',
    'STEP 2 — DRAW IT. Pure black line on pure white, flat and top-down, with no perspective, no shading, no colour and ' +
      'no photographic texture. A clear hierarchy of line weights: the heaviest line for building outlines, a medium ' +
      'line for road edges and kerbs, a fine line for footpaths, plot lines and paving edges, a fine dashed line for ' +
      'water edges.',
    a.buildings === 'solid' ? 'Fill every building footprint solid black, so the drawing reads as a figure-ground.' : '',
    a.trees === 'remove'
      ? 'Remove all trees and vegetation, and draw the ground beneath them as if they were not there.'
      : 'Show each tree as a simple thin-line circle at its canopy size, and no other vegetation.',
    'Draw no text of any kind: no street names, labels, icons, compass or scale bar.',
    NO_TEXT,
    'CHECK before you finish: lay the drawing over the input in your mind — does every building outline land on a ' +
      'building? Is any text, interface element or grey fill left? Fix it.',
  ]
    .filter(Boolean)
    .join(' ');
}

// --- Site analysis diagram (guide #44) --------------------------------------

/**
 * A Maps screenshot with the site outlined → a flat pastel analysis diagram.
 *
 * Two corrections to the guide's prompt. Its sun arc runs along the bottom edge,
 * which is right only north of the equator; the hemisphere is a setting. And it
 * invites labels "for important streets" — which the model happily invents. A
 * label is only allowed if the name can be READ in the input.
 */
export function buildSiteAnalysisPrompt(a: SiteAnalysisSettings & { marked: boolean }): string {
  const south = a.hemisphere === 'north';
  const layers: string[] = [];
  if (a.sun) {
    layers.push(
      `– Sun path: one arc along the ${south ? 'BOTTOM (south)' : 'TOP (north)'} edge, rising in the east on the right ` +
        'and setting in the west on the left, with a small yellow sun at each end joined by a curved arrow.',
    );
  }
  if (a.access) layers.push('– Access: bold black arrows for the main pedestrian and vehicle approaches, on real streets.');
  if (a.views) layers.push('– Views: dashed radial lines from the site toward two or three notable landmarks or open views.');
  layers.push('– A minimal north arrow pointing up.');
  if (a.labels) {
    layers.push(
      '– Labels: clean sans-serif labels with thin leader lines for the important streets, landmarks and features near ' +
        'the site. Use only names you can read in the input; never invent a name. Spell every word correctly.',
    );
  }
  return [
    'You are turning the map or satellite screenshot in the input into a clean, flat site analysis diagram for a ' +
      'presentation board.',
    STRIP_UI,
    'STEP 1 — READ THE MAP FIRST. ' +
      (a.marked
        ? 'Find the site: it is inside the RED RECTANGLE drawn on the image. That rectangle is an instruction, not part ' +
          'of the map — draw the site, not the rectangle.'
        : 'Find the site: it is the area outlined in red.') +
      ' Read the streets, blocks, buildings, parks, water and landmarks around it, and any names you can see — use them ' +
      'to understand the context only. Note which way is north; if the input is not north-up, rotate the diagram so ' +
      'north points straight up.',
    'STEP 2 — DRAW THE BASE in a flat vector style with no photorealism: a muted, desaturated base with buildings in ' +
      'soft greys and the ground in pale neutral tones; trees, grass and parks as simplified sage-green shapes; water ' +
      'as pale blue. Keep the geometry of streets and buildings true to the input.',
    'STEP 3 — MARK THE SITE: a soft pastel red fill, a bold red outline, and a subtle transparent halo around it for ' +
      'its zone of influence.',
    'STEP 4 — ADD THE ANALYSIS, and only this:',
    ...layers,
    a.labels ? '' : `${NO_TEXT} No labels, street names or notes anywhere on the diagram.`,
    'CHECK before you finish: is the site in the same place relative to its streets as in the input? ' +
      (a.labels ? 'Is every label a name that appears in the input? ' : '') +
      'Is any interface element left?',
  ]
    .filter(Boolean)
    .join(' ');
}

// --- Place a building in a real site photo (guide #46) ----------------------

/**
 * A real site photograph + a building → a photomontage of the finished project.
 *
 * The guide's prompt asks for "a central garden, green space and water
 * features" AND "keep @img1 as it is" — the two cannot both be done, and the
 * model resolves it by re-rendering the whole photograph. Here the photograph
 * outside the plot is locked, and the landscape is an option fenced INSIDE the
 * plot. Different from Urban Context, which invents surroundings: this one
 * keeps a real place and changes only the plot.
 */
export function buildPlaceInSitePrompt(a: PlaceInSiteSettings & { marked: boolean }): string {
  return [
    'TWO IMAGES ARE ATTACHED. The FIRST is a real photograph of a site. The SECOND shows a proposed building. Place the ' +
      'building from the second image into the site in the first, as a photomontage that looks like a real photograph ' +
      'of the finished project.',
    'STEP 1 — READ THE SITE FIRST. ' +
      (a.marked
        ? 'Find the plot: the area inside the RED RECTANGLE drawn on the first image. That rectangle is an instruction, ' +
          'not part of the scene.'
        : 'Find the plot: the area outlined in red in the first image, or, if nothing is outlined, the empty plot or ' +
          'open ground in it.') +
      ' Note the camera height and lens, the horizon line and vanishing points, the direction and colour of the ' +
      'sunlight and its shadows, and the heights of the neighbouring buildings.',
    'STEP 2 — READ THE BUILDING. Note its massing, storeys, roof form, materials, colours and openings. That design is ' +
      'fixed — same form, same proportions, same facade pattern, same materials. Do not redesign it, simplify it or ' +
      'swap it for a generic building.',
    'STEP 3 — PLACE IT. Set the building on the plot at a believable scale — storey heights consistent with the ' +
      'neighbours and with any people or cars in the photo — and orient it to the street. Draw it in the FIRST ' +
      'image’s perspective: its lines converge to the site photo’s vanishing points, and it sits on the ground with ' +
      'contact shadows.',
    a.light === 'site'
      ? 'Light it with the site’s own sun, from the same direction, its shadows falling the same way as every other ' +
        'shadow in the photo.'
      : 'Relight the whole scene to a warm golden hour, low sun from the side the existing shadows come from, every ' +
        'shadow — the building’s and the neighbours’ — lengthened consistently.',
    // Relighting changes every pixel's light, so the golden-hour lock keeps the
    // GEOMETRY outside the plot and says the light is the one thing that moves.
    a.light === 'site'
      ? 'Everything outside the plot stays exactly as it is in the first image — same neighbours, same street, same ' +
        'trees, same sky, same camera. Do not re-render or tidy the rest of the photograph.'
      : 'Outside the plot, nothing is added, removed or moved — same neighbours, same street, same trees, same camera; ' +
        'the light is the only thing that changes there.',
    a.landscape
      ? 'Within the plot only, add a considered landscape: paths leading to the entrance, planting and a small garden ' +
        'with a water feature.'
      : '',
    'Remove any red outline or rectangle completely.',
    NO_TEXT,
    'CHECK before you finish: does the building match the second image’s design? Do its shadows fall the same way as ' +
      `the neighbours’? ${
        a.light === 'site'
          ? 'Is everything outside the plot unchanged?'
          : 'Is everything outside the plot still in place, changed only by the new light?'
      } If not, redo it.`,
  ]
    .filter(Boolean)
    .join(' ');
}
