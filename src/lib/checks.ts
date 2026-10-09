// "What we check" — for every tool, the handful of things a good result must
// get right, written as before (what you give it) → after (what must come
// back). They are the same checks the paid live runs are judged on
// (qa/liveRuns.ts verdicts) and the prompt contracts enforce
// (qa/verifyContracts.cjs), put in the user's words, so a visitor knows what
// the tool is aiming for before spending a call — and can judge their own
// result the way we judged ours.
//
// `live` is the honest state of the tool's paid verification, from
// qa/live-results/README.md. A tool not yet run live says so: its rows are what
// its first run will be judged on, not a claim that it passes them.
//
// Keyed by FeatureKind, so TypeScript fails the build if a tool has no table.

import type { FeatureKind } from '../types';

export interface ToolCheck {
  /** What is being checked, in two or three words. */
  check: string;
  /** What you give the tool for this check. '—' when the check is on the result alone. */
  before: string;
  /** What a good result shows. */
  after: string;
}

export interface ToolChecks {
  rows: ToolCheck[];
  /** passed · passed with a caveat (said in `note`) · not yet run live. */
  live: 'passed' | 'caveat' | 'pending';
  note?: string;
}

const NONE = '—';

export const CHECKS: Record<FeatureKind, ToolChecks> = {
  // --- Concept -------------------------------------------------------------
  massing: {
    live: 'passed',
    rows: [
      { check: 'Works from words', before: 'A typed brief, plot size and context', after: 'An image from text alone — no upload needed' },
      { check: 'A study model', before: NONE, after: 'A white model: no brick, timber, glass or materials' },
      { check: 'Follows the brief', before: 'Programme, size, courtyard or form', after: 'The form you described, at the plot’s proportions' },
      { check: 'Shows context', before: 'Neighbours, park, street', after: 'Neighbours as paler grey blocks, for scale' },
      { check: 'Uses a sketch', before: 'Optional sketch', after: 'Builds what you drew, keeping its proportions' },
    ],
  },
  sketchRender: {
    live: 'passed',
    rows: [
      { check: 'Same drawing', before: 'A hand sketch', after: 'Same viewpoint, same masses, same openings' },
      { check: 'Nothing invented', before: NONE, after: 'No new wings, storeys or features you did not draw' },
      { check: 'Not “improved”', before: 'An imperfect massing', after: 'Your massing as drawn, not a tidier version' },
      { check: 'Ambiguity stays simple', before: 'Loose or unclear lines', after: 'Resolved as the plainest reading, not a flourish' },
    ],
  },
  conceptDiagram: {
    live: 'caveat',
    note: 'Left empty, the last move can be the model’s own reading — type the moves for an exact sequence.',
    rows: [
      { check: 'One row', before: 'A finished form', after: 'One row of panels, no move drawn twice' },
      { check: 'One camera', before: NONE, after: 'Every panel from the same viewpoint' },
      { check: 'One move per panel', before: 'Optional typed moves', after: 'Each panel adds one visible move, in order' },
      { check: 'Ends on your form', before: 'Its uneven heights and steps', after: 'The last panel is your building, asymmetries kept' },
      { check: 'Captions spelled', before: NONE, after: 'Short captions, every word spelled correctly' },
    ],
  },
  conceptBoard: {
    live: 'passed',
    rows: [
      { check: 'Translates, not copies', before: 'An inspiration photo', after: 'Its qualities — light, rhythm, porosity — as architecture' },
      { check: 'Three parts', before: NONE, after: 'Concept, main view, details — exactly three' },
      { check: 'One building', before: NONE, after: 'The same building in every part' },
      { check: 'No part names', before: NONE, after: 'No “CONCEPT” or “MAIN RENDER” headings printed' },
      { check: 'Title spelled', before: 'Optional title', after: 'Copied letter for letter' },
    ],
  },

  // --- Plans & Drawings ----------------------------------------------------
  sketchPlan: {
    live: 'passed',
    rows: [
      { check: 'Same layout', before: 'A napkin sketch plan', after: 'Same rooms, same connections, same order' },
      { check: 'Straightened only', before: 'Wobbly lines', after: 'Clean walls without reshaping the rooms' },
      { check: 'Drawn up, not redesigned', before: NONE, after: 'No rooms added, merged or moved' },
      { check: 'CAD conventions', before: NONE, after: 'Flat plan, wall poché, door swings — no perspective' },
    ],
  },
  bubblePlan: {
    live: 'caveat',
    note: 'Room names written on the diagram come back as labels; turning names off is best-effort.',
    rows: [
      { check: 'Adjacencies kept', before: 'A bubble diagram', after: 'Touching bubbles share a door; others stay apart' },
      { check: 'Arrangement kept', before: 'Where each bubble sits', after: 'Rooms in the same places as the bubbles' },
      { check: 'Marks removed', before: 'Handwriting, notes, north mark', after: 'A clean plan, no diagram marks left' },
      { check: 'Rooms named', before: 'Names on the bubbles', after: 'Rooms labelled, spelled correctly' },
    ],
  },
  render: {
    live: 'passed',
    rows: [
      { check: 'Same footprint', before: 'A 2D floor plan', after: 'Your exact outline — an L stays an L' },
      { check: 'Symbols built', before: 'Door, window and furniture symbols', after: 'Each turned into real 3D geometry' },
      { check: 'Labels gone', before: 'Room names, dimensions', after: 'No plan text left in the 3D view' },
      { check: 'Furnished', before: NONE, after: 'Every room furnished for its use' },
    ],
  },
  elevation: {
    live: 'passed',
    rows: [
      { check: 'Front-on', before: 'A sketch or photo of a facade', after: 'A flat, straight-on elevation' },
      { check: 'Same facade', before: 'Its openings and proportions', after: 'Same windows, doors and storeys' },
      { check: 'Flat light', before: NONE, after: 'Lighting that reads the facade, not a scene' },
    ],
  },
  axonometric: {
    live: 'passed',
    rows: [
      { check: 'Really 3D', before: 'An elevation or 3D view', after: 'An angled axonometric, not a flat front' },
      { check: 'Parallel lines', before: NONE, after: 'No perspective — parallel edges stay parallel' },
      { check: 'Only depth inferred', before: 'An elevation', after: 'The facade kept; only the depth added' },
    ],
  },
  cadElevation: {
    live: 'passed',
    rows: [
      { check: 'Perspective removed', before: 'A 3D model or render', after: 'A flat orthographic line drawing' },
      { check: 'One face', before: 'Which side you choose', after: 'That face only, nothing of the sides' },
      { check: 'Consistent', before: NONE, after: 'Floor levels and openings agree with the model' },
    ],
  },
  section: {
    live: 'passed',
    rows: [
      { check: 'A real cut', before: 'A building image', after: 'Cut open — floors, walls and roof in section' },
      { check: 'Not an elevation', before: NONE, after: 'You see inside, not the outside face' },
      { check: 'Poché', before: NONE, after: 'Cut walls and slabs filled solid' },
      { check: 'Floor rhythm', before: 'Its storeys', after: 'Consistent floor-to-floor heights' },
    ],
  },
  renderToPlan: {
    live: 'passed',
    rows: [
      { check: 'Top-down', before: 'A 3D view or render', after: 'A flat 2D plan, perspective undone' },
      { check: 'Same footprint', before: 'The massing you see', after: 'A plan outline that matches it' },
      { check: 'Honest guesses', before: 'Parts the view hides', after: 'Kept simple and plain, not invented detail' },
    ],
  },

  // --- Site & Urban --------------------------------------------------------
  birdsEye: {
    live: 'passed',
    rows: [
      { check: 'Same place', before: 'A top-down satellite or Maps image', after: 'An oblique aerial of these streets and footprints' },
      { check: 'Map interface gone', before: 'Buttons, labels, pins', after: 'A clean aerial photograph' },
      { check: 'Real heights', before: 'Flat roofs from above', after: 'Buildings with believable heights and shadows' },
    ],
  },
  siteLinework: {
    live: 'caveat',
    note: 'The geometry is tidied rather than traced — a site drawing, not a survey.',
    rows: [
      { check: 'Overlays the map', before: 'A satellite or Maps tile', after: 'Streets and footprints where they are on the tile' },
      { check: 'Line hierarchy', before: NONE, after: 'Roads, plots and buildings in different weights' },
      { check: 'Clean sheet', before: 'Labels, trees, cars', after: 'Black line on white — no text, no trees' },
    ],
  },
  siteAnalysis: {
    live: 'caveat',
    note: 'Labels stay generic (MAJOR ROAD) rather than named; check any it adds against the map.',
    rows: [
      { check: 'Site where you drew it', before: 'Your site outlined in red', after: 'The same plot, marked in pastel red' },
      { check: 'Sun on the right side', before: 'The site’s hemisphere', after: 'Sun arc on the equator side, rising in the east' },
      { check: 'No invented names', before: 'The map’s own labels', after: 'Only names readable on your map' },
      { check: 'Interface gone', before: 'Maps buttons and pins', after: 'A clean analysis diagram' },
    ],
  },
  siteAnalysis3d: {
    live: 'passed',
    rows: [
      { check: 'One circle', before: 'A top-down map', after: 'An isometric disc of the site, white beyond it' },
      { check: 'Compass right', before: NONE, after: 'N, E, S, W in clockwise order' },
      { check: 'Sun to the equator', before: 'Coordinates', after: 'Sun arc leaning south (north below the equator)' },
      { check: 'Wind only if set', before: 'Optional wind direction', after: 'Wind arrows from that side — none if not set' },
      { check: 'Reference = look only', before: 'Optional reference diagram', after: 'Its style on your site, not its place' },
    ],
  },
  urbanLayers: {
    live: 'caveat',
    note: 'Footprints are stylised rather than traced.',
    rows: [
      { check: 'One extent', before: 'A map or satellite view', after: 'Every layer shows the same circle of city' },
      { check: 'Layers stack', before: NONE, after: 'Roads in one map run between buildings in another' },
      { check: 'Figure-ground', before: NONE, after: 'Buildings black, everything else white' },
      { check: 'Titles spelled', before: NONE, after: 'Each layer titled, spelled correctly' },
      { check: 'Stack step', before: 'The layer sheet', after: 'The same maps, stacked in order and aligned' },
    ],
  },
  sitePhoto: {
    live: 'passed',
    rows: [
      { check: 'Right place', before: 'Coordinates', after: 'Local buildings, paving, trees and light' },
      { check: 'Landmarks only if there', before: NONE, after: 'A famous building only where it really stands' },
      { check: 'Signs unreadable', before: NONE, after: 'No invented shop names or street signs' },
      { check: 'Sources shown', before: 'Search on', after: 'The searches behind it listed under the image' },
    ],
  },
  siteHistory: {
    live: 'caveat',
    note: 'Needs the place name: on coordinates alone, search picked a different site twice.',
    rows: [
      { check: 'Right site', before: 'Coordinates and the place name', after: 'The place it drew is printed — check it' },
      { check: 'One frame', before: NONE, after: 'Same extent and north in every panel' },
      { check: 'Real dates, in order', before: NONE, after: 'Years increase; unsure ones written “c.”' },
      { check: 'Today last', before: NONE, after: 'The final panel matches the site now' },
      { check: 'Captions spelled', before: NONE, after: 'One short line per panel, spelled correctly' },
    ],
  },
  urbanContext: {
    live: 'passed',
    rows: [
      { check: 'Building untouched', before: 'An isolated building render', after: 'The same building, not restyled' },
      { check: 'A believable street', before: 'Optional city or setting', after: 'Neighbours, pavement and trees around it' },
      { check: 'No invented text', before: NONE, after: 'Blank fascias — no readable words anywhere' },
    ],
  },
  placeInSite: {
    live: 'passed',
    rows: [
      { check: 'Same building', before: 'Your building image', after: 'Its design kept exactly' },
      { check: 'On your plot', before: 'A site photo, plot outlined', after: 'Placed on the plot, outline removed' },
      { check: 'Right scale and light', before: 'The photo’s trees, houses, sun', after: 'Scaled to them; shadows agree with the photo' },
      { check: 'Rest of photo kept', before: NONE, after: 'Everything outside the plot unchanged' },
    ],
  },

  // --- Visualization -------------------------------------------------------
  wireframeRender: {
    live: 'passed',
    rows: [
      { check: 'Same geometry', before: 'A SketchUp or 3D viewport screenshot', after: 'Every modelled object, where you modelled it' },
      { check: 'Same camera', before: NONE, after: 'The identical view and framing' },
      { check: 'Nothing added', before: NONE, after: 'Photoreal materials and light only' },
    ],
  },
  massingRender: {
    live: 'passed',
    rows: [
      { check: 'Your massing', before: 'A white massing model', after: 'Every volume and step kept, one block stays one' },
      { check: 'Reference = look only', before: 'A building you like', after: 'Its cladding and mood — never its shape or doors' },
      { check: 'Same camera and frame', before: NONE, after: 'The model’s own angle and proportions' },
      { check: 'Model photo cleaned', before: 'Base board, studio backdrop', after: 'A real setting instead' },
    ],
  },
  renderRefine: {
    live: 'passed',
    rows: [
      { check: 'Same picture', before: 'An approved draft render', after: 'Same building, camera and composition' },
      { check: 'Better executed', before: 'Rough materials and light', after: 'Crisper materials, cleaner light' },
      { check: 'Nothing redesigned', before: NONE, after: 'Nothing added, moved or restyled' },
    ],
  },
  atmosphere: {
    live: 'passed',
    rows: [
      { check: 'Only the light', before: 'A render and a mood', after: 'Same building, same camera, new light' },
      { check: 'Roof kept', before: 'A flat or overhanging roof', after: 'The same roof — no pitched roof invented' },
      { check: 'Light follows through', before: 'Night, rain, winter…', after: 'Lit windows, wet ground, snow — as the mood implies' },
    ],
  },
  facadeMaterial: {
    live: 'passed',
    rows: [
      { check: 'Geometry locked', before: 'A building and a new material', after: 'Identical form, openings and frames' },
      { check: 'Real module', before: NONE, after: 'Brick, panel or board at a believable size' },
      { check: 'Visible change', before: NONE, after: 'The material clearly swapped' },
    ],
  },
  groundFloor: {
    live: 'pending',
    rows: [
      { check: 'Box is an instruction', before: 'A facade with a red box', after: 'New ground floor inside the box; box removed' },
      { check: 'Rest untouched', before: NONE, after: 'Everything outside the box unchanged' },
      { check: 'Aligned to above', before: 'The bays and grid above', after: 'Openings line up with the floors over them' },
      { check: 'Active frontage', before: 'The use you choose', after: 'Lit, open, with people inside' },
    ],
  },
  humanScale: {
    live: 'passed',
    rows: [
      { check: 'Right size', before: 'A render', after: 'People scaled against the doors' },
      { check: 'Natural', before: NONE, after: 'Nobody posing at the camera' },
      { check: 'Building untouched', before: NONE, after: 'Only people, vehicles and planting added' },
    ],
  },
  multiView: {
    live: 'passed',
    rows: [
      { check: 'One building', before: 'One view of a building', after: 'Every panel shows the same building' },
      { check: 'Counts match', before: 'Its storeys and window rhythm', after: 'The same in every panel' },
      { check: 'Different views', before: NONE, after: 'Each panel a genuinely different angle' },
    ],
  },
  phasing: {
    live: 'pending',
    rows: [
      { check: 'One camera', before: 'A finished render', after: 'Every stage from the identical viewpoint' },
      { check: 'Same footprint', before: NONE, after: 'The building grows on one footprint' },
      { check: 'Real sequence', before: 'Stages you choose', after: 'Excavation → frame → envelope, matching floor levels' },
      { check: 'Context still', before: 'Neighbours, horizon', after: 'Unmoved from stage to stage' },
    ],
  },
  reflection: {
    live: 'passed',
    rows: [
      { check: 'Frames kept', before: 'A glazed facade', after: 'Every frame and mullion where it was' },
      { check: 'Believable glass', before: 'The reflection you want', after: 'Reflections broken at each mullion' },
      { check: 'Only the glass', before: NONE, after: 'Nothing else in the image changes' },
    ],
  },
  reframe: {
    live: 'pending',
    rows: [
      { check: 'Original kept', before: 'Any image and a new ratio', after: 'Your picture untouched, pasted back exactly' },
      { check: 'Seamless', before: 'Grey margins to fill', after: 'No seam, no repeated pattern at the join' },
      { check: 'More of the same', before: NONE, after: 'Sky and ground continue the light and perspective' },
      { check: 'Nothing competing', before: NONE, after: 'No new buildings or focal points in the margins' },
    ],
  },
  upscale: {
    live: 'passed',
    rows: [
      { check: 'Same image', before: 'An approved image', after: 'Sharper and cleaner — nothing redesigned' },
      { check: 'Same medium', before: 'A drawing, render or photo', after: 'Stays a drawing, render or photo' },
      { check: 'Nothing invented', before: NONE, after: 'Detail resolved, not new objects added' },
    ],
  },
  watercolour: {
    live: 'passed',
    rows: [
      { check: 'Same building', before: 'A render or photo', after: 'Same building, same composition' },
      { check: 'Real watercolour', before: NONE, after: 'Washes and paper — not a filter' },
      { check: 'Geometry steady', before: NONE, after: 'Loose edges, but lines and proportions kept' },
    ],
  },

  // --- Interiors -----------------------------------------------------------
  moodboardSpace: {
    live: 'passed',
    rows: [
      { check: 'Reads the board', before: 'A mood board', after: 'Its materials, colours and objects in one room' },
      { check: 'A room, not a collage', before: NONE, after: 'One photograph — no swatches, no grid' },
      { check: 'Palette proportions', before: 'Mostly one colour, accents of another', after: 'The same balance in the room' },
      { check: 'No text', before: NONE, after: 'No labels or captions' },
    ],
  },
  interior: {
    live: 'passed',
    rows: [
      { check: 'Shell locked', before: 'A room photo and a style', after: 'Same walls, windows, doors and camera' },
      { check: 'Blank walls stay blank', before: NONE, after: 'No new windows or doors' },
      { check: 'Styled as asked', before: 'The style you choose', after: 'Furniture and finishes in that style' },
    ],
  },
  declutter: {
    live: 'passed',
    rows: [
      { check: 'Same room', before: 'A cluttered room photo', after: 'Same camera, windows and panes' },
      { check: 'Emptied', before: NONE, after: 'Furniture and clutter removed' },
      { check: 'Surfaces repaired', before: 'What the clutter hid', after: 'Continued plainly, nothing invented' },
    ],
  },
  placeObject: {
    live: 'passed',
    rows: [
      { check: 'The exact product', before: 'A product shot', after: 'That product — not something in its style' },
      { check: 'Believable fit', before: 'A room photo', after: 'Right size, right surface, matching light' },
      { check: 'Room unchanged', before: NONE, after: 'Shell, camera and frame as they were' },
    ],
  },
  targetedSwap: {
    live: 'passed',
    rows: [
      { check: 'One change', before: 'An image, a box and an instruction', after: 'Exactly the change you asked for, in the box' },
      { check: 'Rest locked', before: NONE, after: 'Everything else unchanged' },
      { check: 'Box removed', before: 'The red box you drew', after: 'No red box in the result' },
    ],
  },
  specSheet: {
    live: 'passed',
    rows: [
      { check: 'This room', before: 'A room photo', after: 'Its own items — not similar products' },
      { check: 'Flat on white', before: NONE, after: 'A knolling layout, not a mood board' },
      { check: 'Labels beside items', before: NONE, after: 'Legible, spelled, never on top of an item' },
    ],
  },

  // --- Diagrams & Boards ---------------------------------------------------
  floorAnalysis: {
    live: 'passed',
    rows: [
      { check: 'Plan underneath', before: 'A floor plan', after: 'The plan still readable under the overlay' },
      { check: 'One layer', before: 'The analysis you choose', after: 'Only that layer — circulation, zoning, daylight or structure' },
      { check: 'Legend matches', before: NONE, after: 'Colours in the legend match the zones' },
    ],
  },
  programDiagram: {
    live: 'passed',
    rows: [
      { check: 'This building', before: 'A building image', after: 'Its own massing and openings, by level' },
      { check: 'Separated, not redesigned', before: NONE, after: 'Floors pulled apart, nothing changed' },
      { check: 'Labelled', before: 'Uses per floor', after: 'Each level labelled, spelled correctly' },
    ],
  },
  explodedAxon: {
    live: 'passed',
    rows: [
      { check: 'True axonometric', before: 'A building image', after: 'Parallel projection, no perspective' },
      { check: 'Same building', before: NONE, after: 'Every layer from this building' },
      { check: 'Roof kept', before: 'Its roof form', after: 'The same roof — flat stays flat' },
      { check: 'Clean explode', before: 'Direction you choose', after: 'Layers apart, guides following the direction' },
    ],
  },
  systemsCutaway: {
    live: 'pending',
    rows: [
      { check: 'Cut, not overlaid', before: 'A building image', after: 'The building sliced open from the same camera' },
      { check: 'Physics right', before: 'The systems you choose', after: 'Summer sun steeper; cool air low, hot air out high' },
      { check: 'Labels spelled', before: NONE, after: 'Short labels, spelled correctly' },
    ],
  },
  annotation: {
    live: 'passed',
    rows: [
      { check: 'Image kept', before: 'Any image', after: 'The image underneath unchanged' },
      { check: 'Drawn over', before: 'What to explain', after: 'Arrows and notes on top, not a redrawn picture' },
      { check: 'Economical', before: NONE, after: 'A few clear notes, spelled correctly' },
    ],
  },
  redPen: {
    live: 'pending',
    rows: [
      { check: 'Real issues only', before: 'A render', after: 'Circles on visible problems — none invented' },
      { check: 'Render untouched', before: NONE, after: 'The image underneath identical' },
      { check: 'Short notes', before: 'Critique or sarcastic tone', after: 'Brief block-capital notes, spelled correctly' },
    ],
  },
  moodboard: {
    live: 'passed',
    rows: [
      { check: 'From your image', before: 'A room, building or photo', after: 'Its materials and colours, sampled' },
      { check: 'A material board', before: NONE, after: 'A flat-lay of samples, not a room' },
      { check: 'Whole palette', before: NONE, after: 'Samples, furniture, colour swatches and mood together' },
    ],
  },
  materialPoster: {
    live: 'pending',
    rows: [
      { check: 'Researched', before: 'A material name, optional photo', after: 'Plain, true facts — nothing it is unsure of' },
      { check: 'No invented numbers', before: NONE, after: 'No made-up statistics' },
      { check: 'Bento grid', before: NONE, after: 'Close-up, assembly and section in one poster' },
      { check: 'Your sample', before: 'Optional photo', after: 'Its colour and pattern carried into the panels' },
    ],
  },
  marketingBoard: {
    live: 'pending',
    rows: [
      { check: 'Hero kept', before: 'A render', after: 'Your render as the hero, unchanged' },
      { check: 'Only true text', before: 'Name, place, area, year', after: 'Exactly those facts — nothing invented' },
      { check: 'Fits the building', before: NONE, after: 'Type and layout that suit its character' },
    ],
  },
  magazine: {
    live: 'pending',
    rows: [
      { check: 'Subject kept', before: 'An interior or building image', after: 'The page led by your image, unchanged' },
      { check: 'Real words', before: NONE, after: 'Readable English — no placeholder text' },
      { check: 'Nothing invented', before: NONE, after: 'No brands, prices or fake credits' },
    ],
  },
  architectTimeline: {
    live: 'pending',
    rows: [
      { check: 'Real works', before: 'An architect’s name', after: 'Built projects only — none invented' },
      { check: 'In order', before: NONE, after: 'Dates increase left to right' },
      { check: 'One style', before: NONE, after: 'Every building drawn the same way' },
      { check: 'Names spelled', before: NONE, after: 'Project names and years spelled correctly' },
    ],
  },
  blueprintEvolution: {
    live: 'pending',
    rows: [
      { check: 'Real lineage', before: 'A building type', after: 'Its historical styles, in date order' },
      { check: 'Different buildings', before: NONE, after: 'Each stage a distinct building of its era' },
      { check: 'Rises in realism', before: NONE, after: 'From drafted blueprint to photo-real' },
      { check: 'One image', before: NONE, after: 'A single sheet, labels spelled' },
    ],
  },
};
