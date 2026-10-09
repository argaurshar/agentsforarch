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
import { formatLatitude } from '../coords';
import type {
  AerialLight,
  AnalysisLayer,
  DiagramSteps,
  Hemisphere,
  SiteHistorySettings,
  SitePhotoSettings,
  UrbanLayersSettings,
  WindFrom,
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

// --- 3D site analysis (guide #56) -------------------------------------------

const WIND_WORDS: Record<Exclude<WindFrom, 'none'>, [string, string]> = {
  N: ['north', 'south'],
  NE: ['north-east', 'south-west'],
  E: ['east', 'west'],
  SE: ['south-east', 'north-west'],
  S: ['south', 'north'],
  SW: ['south-west', 'north-east'],
  W: ['west', 'east'],
  NW: ['north-west', 'south-east'],
};

/**
 * A top-down map → an isometric "coin" of the site and its surroundings, with
 * compass, sun path and (only if the architect says) wind.
 *
 * The guide asks the model for the "prevailing wind direction". It has no wind
 * data and will draw arrows anyway, confidently, in whatever direction looks
 * good — so wind is a setting, and absent unless set. The sun path follows the
 * latitude: with coordinates it is stated, without them the hemisphere decides
 * which side of overhead the arc leans.
 */
export function buildSiteAnalysis3dPrompt(a: {
  lat: number | null;
  hemisphere: Hemisphere;
  wind: WindFrom;
  north: 'topright' | 'up';
  marked: boolean;
  reference: boolean;
}): string {
  const southern = a.lat !== null ? a.lat < 0 : a.hemisphere === 'south';
  const lean = southern ? 'NORTH' : 'SOUTH';
  const where = a.lat !== null ? `for latitude ${formatLatitude(a.lat)}` : `for a site ${southern ? 'south' : 'north'} of the equator`;
  const compass =
    a.north === 'topright'
      ? 'N, E, S and W at the four ends of the base, clockwise, with N at the top right'
      : 'N, E, S and W at the four ends of the base, clockwise, with N at the top';
  const notes: string[] = [`1. ${compass}.`];
  notes.push(
    `${notes.length + 1}. Sun path ${where}: a semi-transparent orange arc over the site, rising in the east, passing ` +
      `to the ${lean} of overhead, setting in the west, with a small sun icon at its highest point.`,
  );
  if (a.wind !== 'none') {
    const [from, to] = WIND_WORDS[a.wind];
    notes.push(
      `${notes.length + 1}. Prevailing wind from the ${from}: three or four wavy blue arrows crossing the site from the ` +
        `${from} toward the ${to}.`,
    );
  }
  return [
    'You are turning the top-down map or satellite image in the input into a 3D site analysis diagram: the site and ' +
      'its surroundings modelled on a circular isometric base, like a coin, isolated on white.',
    STRIP_UI,
    'STEP 1 — READ THE MAP FIRST. ' +
      (a.marked
        ? 'Find the centre of the site — the RED RECTANGLE drawn on the image, which is an instruction, not part of the map.'
        : 'Find the centre of the site — the area outlined in red, or the centre of the image if nothing is outlined.') +
      ' Read the building footprints, their relative heights from shadows and roof detail, the streets, trees, parks ' +
      'and water within a radius around it. Only what lies inside the circle is drawn.',
    'STEP 2 — BUILD THE COIN. A circular base in isometric view, its edge shown as a thin slab. On it: buildings as ' +
      'simple extruded volumes in soft greys at plausible relative heights, streets as pale flat bands, trees as simple ' +
      'rounded sage-green shapes, water as pale blue. Everything outside the circle is plain white — no map, no ground, ' +
      `no shadow beyond the base. Muted, desaturated and diagrammatic: no photorealism, only soft, toned-down shadows. ` +
      `North points to the ${a.north === 'topright' ? 'top right' : 'top'}.`,
    a.reference
      ? 'The SECOND image is a reference diagram. Copy its layout, graphic language and annotation style — not its ' +
        'place. The geography comes only from the first image.'
      : '',
    'STEP 3 — ANNOTATE:',
    ...notes,
    'Keep the site itself in a soft accent colour. The four compass letters are the only text. Do not add any ' +
      'watermark, signature, caption or stray text.',
    `CHECK before you finish: are N, E, S, W clockwise with N at the ${a.north === 'topright' ? 'top right' : 'top'}? ` +
      `Does the sun arc lean to the ${lean.toLowerCase()}? Is everything outside the circle white?`,
  ]
    .filter(Boolean)
    .join(' ');
}

// --- Urban layer maps (guide #58) -------------------------------------------

const LAYERS = [
  ['figure', 'FIGURE-GROUND', 'every building solid black, everything else white'],
  ['green', 'GREEN NETWORK', 'all landscape and vegetation green, everything else light grey'],
  ['circulation', 'CIRCULATION', 'all roads blue, everything else white'],
  ['blocks', 'BLOCKS', 'the street blocks in different shades of pink, with no buildings drawn'],
] as const;

/** The layers switched on, in their fixed order. */
export function urbanLayerList(a: Pick<UrbanLayersSettings, 'figure' | 'green' | 'circulation' | 'blocks'>) {
  return LAYERS.filter(([k]) => a[k]);
}

// Every count 0-4, not just the 2-4 Generate allows: the prompt box renders
// while the tool is blocked too, and a missing entry here took the screen down.
const GRID: Record<number, string> = { 0: '1 × 1', 1: '1 × 1', 2: '2 × 1', 3: '3 × 1', 4: '2 × 2' };
const COUNT: Record<number, string> = { 0: 'no', 1: 'one', 2: 'two', 3: 'three', 4: 'four' };

/**
 * Step 1: a map → two to four circular layer maps of the SAME circle. Step 2:
 * that sheet → the same maps as an exploded isometric stack.
 *
 * The guide never says the maps must share an extent, and without it they do
 * not stack — which defeats step 2. And step 2 must not REDRAW the maps, or the
 * stack shows different data from the sheet it came from.
 */
export function buildUrbanLayersPrompt(a: UrbanLayersSettings & { marked: boolean }): string {
  const layers = urbanLayerList(a);
  const n = layers.length;
  const titles = layers.map(([, t]) => t).join(', ');
  if (a.step === 'stack') {
    return [
      'The input image is a sheet of circular layer maps of one place. Rearrange those same maps into one exploded ' +
        'axonometric diagram.',
      'STEP 1 — READ THE SHEET FIRST. Identify each circular map and its title. Keep each map’s drawing exactly as it ' +
        'is — do not redraw, simplify or recolour it.',
      `STEP 2 — STACK THEM. Tilt every map into the same isometric view and stack them vertically with equal spacing, ` +
        `top to bottom: ${titles}. Flat vector style, flat lighting, zero shadows — no cast shadows on or between the ` +
        'discs.',
      'STEP 3 — ANNOTATE. Vertical dotted lines connect the edges of the discs to show they align. To the right of each ' +
        'disc, its title in a small sans-serif with a thin leader line, all titles aligned on one vertical line. Spell ' +
        'every title exactly as it appears on the sheet.',
      'White background. Do not add any watermark, signature or other text.',
      `CHECK: are the discs the same maps as the sheet, in the stated order, with all ${COUNT[n]} titles legible?`,
    ].join(' ');
  }
  return [
    `You are dissecting the top-down map or satellite image in the input into ${COUNT[n]} analytical layer maps of the ` +
      'same place, presented as one sheet.',
    STRIP_UI,
    'STEP 1 — READ THE MAP FIRST. ' +
      (a.marked
        ? 'Take a circle centred on the RED RECTANGLE drawn on the image (an instruction, not part of the map — it does ' +
          'not appear in any map)'
        : 'Take a circle centred on the centre of the image') +
      ' that includes the surrounding blocks. Within it, identify every building footprint, every road, every green ' +
      'space and tree canopy, and the street blocks the roads define.',
    `STEP 2 — DRAW ${COUNT[n].toUpperCase()} CIRCULAR MAPS of exactly that circle, each a flat 2D vector drawing inside a ` +
      'circle with a thin black outline, nothing visible outside the circle. Same circle, same extent, same orientation ' +
      `and same scale in all ${COUNT[n]} — they must stack perfectly.`,
    ...layers.map(([, title, what], i) => `Map ${i + 1} — ${title}: ${what}.`),
    'Style them as urban design drawings with slight paper texture, gentle gradients and a soft shadow under each circle.',
    `Arrange them in a neat ${GRID[n]} grid on white, in that order, with equal spacing. Under each, a small sans-serif ` +
      `title — ${titles} — spelled exactly so. No other text.`,
    `CHECK before you finish: overlay the ${COUNT[n]} circles in your mind — do they show the same place at the same ` +
      'extent? If any map shows a different place or extent, redo it.',
  ].join(' ');
}

// --- Site photo from coordinates (guide #07) --------------------------------

/**
 * Z11 searched Battersea Power Station's coordinates and drew Buckingham
 * Palace, two kilometres north: search answers with the famous place NEAR a
 * point as readily as the one AT it. So the point outranks fame, and a name.
 */
const COORDS_DECIDE =
  'The coordinates decide the site, not fame: find what stands at THIS exact point, within about 100 m. A better-' +
  'known place a kilometre or two away is not the site, even if a search result names it first.';

const PHOTO_LIGHT: Record<SitePhotoSettings['light'], string> = {
  overcast: 'soft overcast daylight',
  sunny: 'clear midday sun with crisp shadows',
  golden: 'warm late-afternoon golden-hour light',
};

/**
 * Coordinates, no image → a plausible eye-level photograph of the street there.
 *
 * Plausible is the most it can be, and the tool says so on every output. The
 * two failures worth guarding are a generic anywhere-street and a famous
 * landmark moved into an ordinary one — the guide's own example coordinates are
 * the White House, which is exactly where that rule gets tested.
 */
export function buildSitePhotoPrompt(a: {
  where: string;
  view: SitePhotoSettings['view'];
  light: SitePhotoSettings['light'];
  search: boolean;
}): string {
  return [
    `Generate a photorealistic ${a.view === 'street' ? 'eye-level ' : 'aerial '}site photograph of the place at ${a.where}.`,
    'STEP 1 — WORK OUT THE PLACE FIRST. ' +
      (a.search
        ? 'Use Google Search to look these coordinates up. '
        : 'From what you know about these coordinates, work out where they are. ') +
      `${COORDS_DECIDE} ` +
      'Determine the country, the city and the kind of neighbourhood at that exact spot — city centre, inner suburb, ' +
      'industrial edge, village, rural. From that, decide the local building types, their typical height, age, ' +
      'materials and roof forms; the street width, paving and kerbs; the street furniture; the climate; and the native ' +
      'street trees and planting.',
    'STEP 2 — PHOTOGRAPH IT. ' +
      (a.view === 'street'
        ? 'A straight documentary site photograph taken from the pavement at eye height (about 1.6 m), with a natural ' +
          '24–35 mm lens and vertical lines kept vertical'
        : 'A documentary drone photograph from about 60 m up, looking down at 45° over the block, the street pattern ' +
          'and roofscape legible') +
      `, in ${PHOTO_LIGHT[a.light]}. An ordinary view of the street at that spot, with the plot or street frontage in ` +
      'the middle of the frame.',
    'Show a famous landmark only if it genuinely stands at or right next to these coordinates. Do not invent ' +
      'landmarks, and do not move a city’s famous buildings into an ordinary street.',
    `Shop signs and street signs are generic and unreadable. ${NO_TEXT}`,
    'CHECK before you finish: would someone from this city recognise the street — its architecture, vegetation and ' +
      'light — as local? If it looks like a generic anywhere-street, redo it with more local character.',
  ].join(' ');
}

// --- Site history timeline (guide #57) --------------------------------------

/**
 * Coordinates → the same site drawn in plan at three to five moments in its
 * history, with years and one-line captions.
 *
 * The factual-risk tool of the set: dates and events are the content. So the
 * research step forbids inventing dates (uncertain ones are written "c."), and
 * the drawing step fixes one frame — a timeline of differently framed maps
 * cannot be compared, which is the point of drawing one.
 */
export function buildSiteHistoryPrompt(a: {
  where: string;
  place: string;
  stages: DiagramSteps;
  style: SiteHistorySettings['style'];
  search: boolean;
}): string {
  const n = Number(a.stages);
  const named = a.place.trim();
  return [
    `Create a horizontal sequence of ${n} illustrative timeline diagrams showing how the site at ${a.where}` +
      `${named ? ` (${named})` : ''} has changed over time.`,
    'STEP 1 — RESEARCH FIRST. ' +
      (a.search
        ? 'Use Google Search to identify what stands at these coordinates and the key moments in its history: '
        : 'From what you reliably know, identify what stands at these coordinates and the key moments in its history: ') +
      'when it was first built on or laid out, major construction phases, expansions, losses, and its state today. ' +
      (named
        ? `The site is ${named}: research that place. `
        : `${COORDS_DECIDE} `) +
      `Choose the ${n} moments that show the biggest physical changes. ` +
      (a.search ? 'Use only dates you found; ' : 'Use only dates you are confident of; ') +
      'if a date is uncertain, write it as a circa date (c. 1650). Never invent an event.',
    'STEP 2 — DRAW EACH MOMENT AS A PLAN. Every diagram is a top-down 2D plan of the SAME area at the same scale, ' +
      `extent and orientation, so the ${n} compare directly. ` +
      (a.style === 'urban'
        ? 'Style: urban design drawing — flat colour fills for buildings, gardens, water and paving, fine black ' +
          'linework, a soft paper tone. '
        : 'Style: clean vector map — flat pastel fills, no texture, crisp thin outlines. ') +
      'What exists at that date is drawn; what does not yet exist is absent; what was later demolished appears in its ' +
      'panel and is gone afterwards. Each diagram has a small north arrow in the same corner, pointing the same way.',
    'STEP 3 — LABEL. Above the whole sequence, one short line naming the place you identified, so the reader can ' +
      'check it is the right site. Above each diagram, the year in bold; below it, one sentence of under 15 words on ' +
      'what happened. ' +
      'Clean sans-serif. Spell every word correctly and keep every word legible.',
    `Arrange the ${n} left to right in date order, evenly spaced, on one white sheet. Do not add any watermark or signature.`,
    `CHECK before you finish: is the place you drew really AT these coordinates, not a better-known one nearby? Is ` +
      `the extent and orientation identical in all ${n}? Do the years increase left to right? Does the last panel ` +
      'match the site today?',
  ].join(' ');
}
