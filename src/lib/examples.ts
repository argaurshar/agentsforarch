// Bundled demo examples — real input → output pairs produced by this app on
// Nano Banana Pro, shipped as static assets so a first-time visitor sees what
// every tab actually does before spending a single API call.
//
// The images live in `public/examples/` (served, never bundled into the JS) and
// are fetched lazily by the showcase, so a tab only pays for the examples it
// shows. `import.meta.env.BASE_URL` keeps the paths correct under the GitHub
// Pages project path.

import type { FeatureKind } from '../types';

export interface ExampleCase {
  /** What this run demonstrates, e.g. "Boho chic theme". */
  label: string;
  /** One line on what the engine was asked to do. */
  note: string;
  /** Input image path (omit for outputs that are composed, not transformed). */
  input?: string;
  inputLabel?: string;
  output: string;
  outputLabel?: string;
}

export interface ExampleSet {
  /** The promise this tab makes, in one sentence. */
  summary: string;
  cases: ExampleCase[];
}

const asset = (file: string): string => `${import.meta.env.BASE_URL}examples/${file}`;

/** Every tab that can show worked examples. `moodboard` covers both its modes. */
export const EXAMPLES: Partial<Record<FeatureKind, ExampleSet>> = {
  render: {
    summary:
      'A flat 2D floor plan becomes a furnished 3D cutaway you can hand a client. It follows your plan’s layout and ' +
      'character — an ideation render, not a measured drawing.',
    cases: [
      {
        label: '3D isometric cutaway',
        note: 'Walls extruded, every room furnished, roof left off so the whole plan reads at a glance.',
        input: asset('plan-input.jpg'),
        inputLabel: '2D floor plan',
        output: asset('iso-3d.jpg'),
        outputLabel: '3D isometric',
      },
      {
        label: '2D furnished plan',
        note: 'The same plan as a marketing drawing — strictly flat, per-room flooring, clean labels.',
        input: asset('plan-input.jpg'),
        inputLabel: '2D floor plan',
        output: asset('iso-plan2d.jpg'),
        outputLabel: 'Furnished plan',
      },
      {
        label: 'Architecture style · Indian vernacular',
        note: 'One click changes the design language — jaali screens, exposed brick, terracotta floors.',
        input: asset('plan-input.jpg'),
        inputLabel: '2D floor plan',
        output: asset('iso-indian.jpg'),
        outputLabel: 'Indian vernacular',
      },
      {
        label: 'Architecture style · Bauhaus',
        note: 'Same plan, same click — tubular steel, primary accents, functional geometry.',
        input: asset('plan-input.jpg'),
        inputLabel: '2D floor plan',
        output: asset('iso-bauhaus.jpg'),
        outputLabel: 'Bauhaus',
      },
    ],
  },

  elevation: {
    summary:
      'A rough hand sketch becomes a flat, straight-on elevation drawing — with the design language you pick, and no perspective creeping in.',
    cases: [
      {
        label: 'Rendered elevation',
        note: 'Materials, colour and relief added; the drawing stays perfectly orthographic.',
        input: asset('sketch-input.jpg'),
        inputLabel: 'Hand sketch',
        output: asset('elev-rendered.jpg'),
        outputLabel: 'Front elevation',
      },
      {
        label: 'Design theme · Boho chic',
        note: 'The same sketch restyled — arched openings, lime-washed walls, climbing planting.',
        input: asset('sketch-input.jpg'),
        inputLabel: 'Hand sketch',
        output: asset('elev-boho.jpg'),
        outputLabel: 'Boho elevation',
      },
      {
        label: 'Line style',
        note: 'Clean hidden-line technical linework for drawing sets.',
        input: asset('sketch-input.jpg'),
        inputLabel: 'Hand sketch',
        output: asset('elev-line.jpg'),
        outputLabel: 'Line elevation',
      },
      {
        label: 'All faces · the side elevation',
        note: 'The side is reconstructed as a genuinely different face — no entry or garage door, private-side windows.',
        input: asset('sketch-input.jpg'),
        inputLabel: 'Hand sketch (front)',
        output: asset('elev-side.jpg'),
        outputLabel: 'Side elevation',
      },
    ],
  },

  axonometric: {
    summary:
      'A corner view in true parallel projection. From an elevation the depth and roof form are inferred; from a 3D model they are read straight off the image. Your materials are preserved exactly either way.',
    cases: [
      {
        label: 'Realistic axonometric',
        note: 'A true corner view with genuine depth; the input’s materials are carried across unchanged.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Elevation',
        output: asset('axon-realistic.jpg'),
        outputLabel: 'NE axonometric',
      },
      {
        label: 'Line art',
        note: 'Crisp outlines with flat colour fills — the diagram version for concept boards.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Elevation',
        output: asset('axon-lineart.jpg'),
        outputLabel: 'Line-art axonometric',
      },
      {
        label: 'Section axonometric',
        note: 'Cut open to reveal floor plates and rooms inside the volume.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Elevation',
        output: asset('axon-section.jpg'),
        outputLabel: 'Section axonometric',
      },
    ],
  },

  interior: {
    summary:
      'A phone photo of a real room comes back redesigned — same room, same camera, same windows; new furniture, finishes and mood.',
    cases: [
      {
        label: 'Restyle · Contemporary',
        note: 'Architecture and camera locked; furniture, finishes and décor fully replaced.',
        input: asset('room-input.jpg'),
        inputLabel: 'Client’s room',
        output: asset('interior-restyle.jpg'),
        outputLabel: 'Contemporary restyle',
      },
      {
        label: 'Renovate · Luxury',
        note: 'Bigger changes allowed — flooring, ceiling and joinery may be replaced too.',
        input: asset('room-input.jpg'),
        inputLabel: 'Client’s room',
        output: asset('interior-renovate.jpg'),
        outputLabel: 'Luxury renovation',
      },
      {
        label: 'Stage · Japandi',
        note: 'An empty handover flat furnished completely, without touching the shell.',
        input: asset('room-empty.jpg'),
        inputLabel: 'Empty room',
        output: asset('interior-stage.jpg'),
        outputLabel: 'Staged interior',
      },
    ],
  },

  moodboard: {
    summary:
      'Any image — a render, a sketch, a photo — is read for its design DNA and returned as a flat-lay material board: samples, furniture, colour palette and vibe.',
    cases: [
      {
        label: 'Board from an elevation',
        note: 'Terracotta stucco, aged teak, rattan and bougainvillea — all pulled from the façade on the left.',
        input: asset('elev-boho.jpg'),
        inputLabel: 'Boho elevation',
        output: asset('board-boho.jpg'),
        outputLabel: 'Material & mood board',
      },
      {
        label: 'Board from an interior',
        note: 'Bouclé, oak, honed marble and jute, with the palette and vibe line read off the room.',
        input: asset('interior-restyle.jpg'),
        inputLabel: 'Interior render',
        output: asset('board-interior.jpg'),
        outputLabel: 'Material & mood board',
      },
      {
        label: 'Collage mode',
        note: 'The second mode: your own outputs composed into a branded grid board — no generation call.',
        output: asset('board-collage.jpg'),
        outputLabel: 'Collage board',
      },
    ],
  },

  // --- The other twenty-two ------------------------------------------------
  //
  // Every pair below is a real generation from the three live-verification
  // rounds (qa/live-results/), resized and re-encoded by
  // `node qa/makeExampleAssets.cjs`. Until these landed, twenty-five of thirty
  // tools showed a visitor nothing at all: a worked example needs a real
  // generation, and generations cost money, so the showcase stayed empty for
  // everything except the original five.
  //
  // WHERE A ROUND-1 RUN FAILED, THE VERIFIED FIX SHIPS INSTEAD — Urban Context,
  // Exploded Axonometric, Declutter, Upscale and Atmosphere all show their
  // re-run, not their first attempt. Shipping the failure as a worked example
  // would be advertising a bug as a feature.
  //
  // These are not decoration. `instant.ts` derives its free, keyless results
  // from this same table, so each entry also gives a visitor with no API key a
  // real answer from that tool — which is what the front door's first ten
  // seconds depend on.

  massing: {
    summary:
      'Type the brief and the site, get a white study model back — no image needed, for the stage where there is ' +
      'nothing to photograph yet. Add a sketch and it builds what you drew; add a precedent and it borrows the idea.',
    cases: [
      {
        label: 'From a written brief',
        note: '"A 40-unit residential block with ground-floor retail around a courtyard", on a 45m x 60m corner plot.',
        output: asset('ex-massing.jpg'),
        outputLabel: 'White massing model',
      },
    ],
  },

  sketchRender: {
    summary:
      'A pen sketch becomes a finished image that keeps your masses — the same building you drew, resolved, not a ' +
      'handsomer one substituted for it.',
    cases: [
      {
        label: 'Sketch to finished render',
        note: 'Same viewpoint, same three bays, same roof caps — the drawing resolved rather than replaced.',
        input: asset('sketch-input.jpg'),
        inputLabel: 'Pen sketch',
        output: asset('ex-sketch-render.jpg'),
        outputLabel: 'Finished render',
      },
    ],
  },

  sketchPlan: {
    summary: 'A rough drawing becomes clean CAD-style linework — hatched walls, door swings, window symbols.',
    cases: [
      {
        label: 'Sketch to CAD plan',
        note: 'Poché walls, door swings and a stair, with the bay structure read off the sketch.',
        input: asset('sketch-input.jpg'),
        inputLabel: 'Pen sketch',
        output: asset('ex-sketch-plan.jpg'),
        outputLabel: 'CAD plan',
      },
    ],
  },

  cadElevation: {
    summary:
      'A rendered view becomes a flat orthographic elevation. It will reconstruct a face the input never showed — ' +
      'the rear of a building read from its front.',
    cases: [
      {
        label: 'Rear elevation, reconstructed',
        note: 'The rear is not in the input. Roof line, storey heights and materials carry over; the garage does not.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-cad-elevation.jpg'),
        outputLabel: 'CAD rear elevation',
      },
    ],
  },

  section: {
    summary: 'A cut section through the building, with poché, floor plates, stair and figures for scale.',
    cases: [
      {
        label: 'Section from one exterior view',
        note: 'No storey heights were given. Slabs, columns and footings in solid black; the garage sits under the garage.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-section.jpg'),
        outputLabel: 'Cut section',
      },
    ],
  },

  renderToPlan: {
    summary:
      'The pipeline backwards: a finished view becomes a 2D plan. Depth is inferred, so treat it as a diagram rather ' +
      'than a survey.',
    cases: [
      {
        label: 'Render back to plan',
        note: 'Garage left, entry centre, glazed living right — the elevation’s bays, read top-down.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-render-to-plan.jpg'),
        outputLabel: 'Derived plan',
      },
    ],
  },

  multiView: {
    summary:
      'One building, four cameras, on one sheet. The hardest thing this app asks — check the panels against each ' +
      'other before you use it.',
    cases: [
      {
        label: 'Four-view sheet',
        note: 'Front, three-quarter, flank and aerial. Same storey count, same window rhythm, same materials throughout.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-multiview.jpg'),
        outputLabel: 'View sheet',
      },
    ],
  },

  urbanContext: {
    summary: 'Drops the building into a real street — neighbours, pavement, trees, cars — without touching the building.',
    cases: [
      {
        label: 'Building in a mid-rise street',
        note: 'Neighbours on plausible plot lines, lit by the same sun. Shopfronts stay unbranded rather than inventing signage.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-urban-context.jpg'),
        outputLabel: 'In context',
      },
    ],
  },

  atmosphere: {
    summary: 'Re-light an approved image — hour, season and mood — with the building itself untouched.',
    cases: [
      {
        label: 'Night, winter, dramatic',
        note: 'Warm interior glow, soffit downlights, bare trees and frost. The flat roof and its overhangs stay flat.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-atmosphere.jpg'),
        outputLabel: 'Relit for night',
      },
    ],
  },

  facadeMaterial: {
    summary: 'Swap the cladding and change nothing else — same geometry, same openings, same camera.',
    cases: [
      {
        label: 'Brick, timber and bronze',
        note: 'Every opening in the same place and size. Even the tree shadow across the garage survives.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-facade-material.jpg'),
        outputLabel: 'Re-clad',
      },
    ],
  },

  humanScale: {
    summary: 'Adds people, vehicles and planting at the right size — the fastest way to make a render read as a place.',
    cases: [
      {
        label: 'Busy street, with cars and planting',
        note: 'Figures measured against the front door, occupied with each other rather than posing at the camera.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-human-scale.jpg'),
        outputLabel: 'With entourage',
      },
    ],
  },

  reflection: {
    summary: 'Controls what the glazing does — transparent, balanced or mirrored — with the frames left exactly where they are.',
    cases: [
      {
        label: 'Mirrored glazing',
        note: 'The reflection breaks at every mullion instead of running as one sheet across the frames.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-reflection.jpg'),
        outputLabel: 'Mirrored',
      },
    ],
  },

  conceptDiagram: {
    summary:
      'A finished form becomes the competition-board sequence — site volume, then each move that made it — from one ' +
      'camera. Left empty, the moves are read from the image; type them for an exact sequence.',
    cases: [
      {
        label: 'Moves read from a courtyard massing',
        note:
          'One row, one camera, one move per panel: site volume, carve courtyard, step terraces. The last move (corner ' +
          'towers) is the model’s reading, not our massing — type your own moves when the ending must be exact.',
        input: asset('ex-massing.jpg'),
        inputLabel: 'Finished form',
        output: asset('ex-concept-diagram.jpg'),
        outputLabel: 'Concept diagram',
      },
    ],
  },

  bubblePlan: {
    summary:
      'A loose bubble diagram becomes a drafted, furnished plan in the same arrangement: bubbles that touch share a ' +
      'door, bubbles that do not stay apart, and the handwriting is taken out.',
    cases: [
      {
        label: 'Two-bed flat from a bubble diagram',
        note:
          'The hall opens to both bedrooms, the bath and the living room; the bedrooms do not connect; kitchen and ' +
          'balcony sit where they were drawn. The title, note and north mark are gone; the rooms are named.',
        input: asset('bubble-input.jpg'),
        inputLabel: 'Bubble diagram',
        output: asset('ex-bubble-plan.jpg'),
        outputLabel: 'Drafted plan',
      },
    ],
  },

  moodboardSpace: {
    summary:
      'A mood board becomes one room you could walk into — its palette, materials and furniture style built into a ' +
      'real space, not another collage. The reverse of Moodboard.',
    cases: [
      {
        label: 'Earthy Mediterranean board → living room',
        note:
          'Everything on the board, in a room: terracotta stucco and tile, linen curtains, rattan chairs, a reclaimed-wood ' +
          'console, macramé, a bronze lamp and bougainvillea. No swatches, no text.',
        input: asset('board-boho.jpg'),
        inputLabel: 'Mood board',
        output: asset('ex-moodboard-space.jpg'),
        outputLabel: 'The room',
      },
    ],
  },

  massingRender: {
    summary:
      'A white massing model and a building whose look you like: the massing comes back clad, lit and landscaped like ' +
      'the reference — its own form, its own camera, its own frame. The reference lends a mood, never a shape.',
    cases: [
      {
        label: 'Courtyard massing, rendered like a house',
        note:
          'The reference was a two-storey house with a garage. What came back is the courtyard block, every step intact, ' +
          'clad in its render, stone and dark coping, seen from the model’s own high angle.',
        input: asset('ex-massing.jpg'),
        inputLabel: 'Massing model',
        output: asset('ex-massing-render.jpg'),
        outputLabel: 'Rendered like the reference',
      },
    ],
  },

  sitePhoto: {
    summary:
      'Coordinates in, a believable photograph of the street there out — its local buildings, paving, trees and light, ' +
      'researched first. Plausible, not a record: a famous landmark appears only where it really stands.',
    cases: [
      {
        label: 'An ordinary street in Shoreditch',
        note:
          '51.5246, -0.0787, with nothing else typed: London stock brick and Victorian warehouses, a plane tree, a red ' +
          'bus, unreadable shop signs — and no landmark moved in. The search behind it is listed under the image.',
        output: asset('ex-site-photo.jpg'),
        outputLabel: 'Site photo',
      },
      {
        label: 'The White House, because it is there',
        note: '38.8977° N, 77.0365° W: the landmark appears because it stands at those coordinates.',
        output: asset('ex-site-photo-landmark.jpg'),
        outputLabel: 'Site photo',
      },
    ],
  },

  siteHistory: {
    summary:
      'Coordinates and a name in, the same piece of ground drawn in plan at three to five moments in its history, ' +
      'each with its year — researched, one frame throughout. Check every date before you publish.',
    cases: [
      {
        label: 'Taj Mahal complex, four moments',
        note:
          'c. 1631, 1648, 1653, today: one frame, the Yamuna to the north in every panel, the garden and forecourt ' +
          'appearing in order. The name is required: on coordinates alone, search picked a different site twice.',
        output: asset('ex-site-history.jpg'),
        outputLabel: 'Site history',
      },
    ],
  },

  phasing: {
    summary:
      'A finished render becomes its own construction sequence — excavation, frame, envelope — from the identical ' +
      'camera, so the stages overlay the final image.',
    cases: [
      {
        label: 'Stage 2 · Structural frame',
        note:
          'The bare concrete frame at the house’s own floor levels, its centre bay and overhanging roofs; the street, ' +
          'kerb and trees unmoved from the finished render.',
        input: asset('ex-human-scale.jpg'),
        inputLabel: 'Finished render',
        output: asset('ex-phasing-frame.jpg'),
        outputLabel: 'Structural frame',
      },
      {
        label: 'Stage 3 · Envelope',
        note: 'Garage door, stone and glazing arrive exactly where the render has them; scaffold still up.',
        input: asset('ex-human-scale.jpg'),
        inputLabel: 'Finished render',
        output: asset('ex-phasing-envelope.jpg'),
        outputLabel: 'Envelope',
      },
    ],
  },

  reframe: {
    summary:
      'Any image to any ratio: your picture is pasted back untouched, and only the new margins are painted — more of ' +
      'the same sky, ground or backdrop, with no seam.',
    cases: [
      {
        label: '16:9 render → 9:16 story',
        note: 'Sky above and road below continue the render’s light and tree shadows; no seam at either join.',
        input: asset('ex-human-scale.jpg'),
        inputLabel: 'Original 16:9',
        output: asset('ex-reframe-story.jpg'),
        outputLabel: '9:16',
      },
      {
        label: '3:2 model photo → 21:9 banner',
        note: 'The white model untouched; the base board, backdrop and grey context blocks continue left and right.',
        input: asset('ex-massing.jpg'),
        inputLabel: 'Original 3:2',
        output: asset('ex-reframe-banner.jpg'),
        outputLabel: '21:9',
      },
    ],
  },

  marketingBoard: {
    summary:
      'A render becomes a presentation board whose type and layout suit the building — and it prints only the facts ' +
      'you typed.',
    cases: [
      {
        label: 'Hillside House',
        note:
          'Title and facts typed as “Hillside House” and “Bengaluru, India · 320 m² · 2026”; the night render is the ' +
          'hero, unchanged, with two detail crops taken from it. No invented awards, areas or architects.',
        input: asset('ex-atmosphere.jpg'),
        inputLabel: 'Night render',
        output: asset('ex-marketing-board.jpg'),
        outputLabel: 'Presentation board',
      },
    ],
  },

  magazine: {
    summary:
      'An interior or building becomes an editorial feature page: your image leads, detail crops come from it, and the ' +
      'text is real English with no brands or prices. Proofread the small print.',
    cases: [
      {
        label: 'A staged living room',
        note:
          'Headline, standfirst, three short columns and a tips box, all readable; the crops are this room. One typo ' +
          'slipped into the smallest text (“atmosphers”).',
        input: asset('interior-stage.jpg'),
        inputLabel: 'Room photo',
        output: asset('ex-magazine.jpg'),
        outputLabel: 'Feature page',
      },
    ],
  },

  redPen: {
    summary:
      'A render or room photo comes back marked up like a design review: red circles on what is visibly wrong, short ' +
      'hand-lettered notes, the image underneath untouched. Critique or roast.',
    cases: [
      {
        label: 'Constructive review',
        note: 'Five notes on things you can see — pendant scale, a chair in the view, repeating texture, art too low.',
        input: asset('interior-stage.jpg'),
        inputLabel: 'Room photo',
        output: asset('ex-red-pen.jpg'),
        outputLabel: 'Marked up',
      },
      {
        label: 'The roast',
        note: '“Beige on beige on beige. How bold.” Sarcasm about the design only — never the people — and the room unchanged.',
        input: asset('interior-restyle.jpg'),
        inputLabel: 'Room photo',
        output: asset('ex-red-pen-roast.jpg'),
        outputLabel: 'Roasted',
      },
    ],
  },

  architectTimeline: {
    summary:
      'An architect’s name in, their built work out as one illustrated timeline — real buildings, real years, in order, ' +
      'drawn as one family. Check every date before you publish.',
    cases: [
      {
        label: 'Zaha Hadid, angles to curves',
        note:
          'Vitra Fire Station 1993, Phaeno 2005, Guangzhou Opera House 2010, London Aquatics Centre 2011, Heydar ' +
          'Aliyev Center 2012, Morpheus Hotel 2018 — all real, all in order, one drawing style.',
        output: asset('ex-architect-timeline.jpg'),
        outputLabel: 'Timeline',
      },
    ],
  },

  materialPoster: {
    summary:
      'A material’s name in, a researched educational poster out — close-up, how it is made and assembled, how it ' +
      'performs. Every fact comes from search; check them against the sources listed.',
    cases: [
      {
        label: 'Terracotta jali blocks',
        note:
          'Texture close-up, a manufacturing strip from clay to kiln to wall, and a ventilation section. Each heading ' +
          'used once. Its history line repeats a supplier-site claim — the kind of thing to check.',
        output: asset('ex-material-poster.jpg'),
        outputLabel: 'Poster',
      },
    ],
  },

  blueprintEvolution: {
    summary:
      'A building type in, its lineage out as one blueprint sheet: a drafted drawing that rises, stage by stage, into ' +
      'ever more real models of each period’s building.',
    cases: [
      {
        label: 'Gothic to contemporary church',
        note:
          'Seven stages in date order — Gothic, Renaissance, Baroque, Neoclassical, Gothic Revival, Modernist, ' +
          'Contemporary — each with one label. Check the small dates.',
        output: asset('ex-blueprint-evolution.jpg'),
        outputLabel: 'Blueprint sheet',
      },
    ],
  },

  renderRefine: {
    summary: 'Cleans up an image you have already approved. It resolves execution, it does not redesign.',
    cases: [
      {
        label: 'Finish pass',
        note: 'Stone coursing, timber grain and render texture resolved. Nothing added, moved or restyled.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-render-refine.jpg'),
        outputLabel: 'Refined',
      },
    ],
  },

  upscale: {
    summary:
      'A print master at higher resolution. It keeps the medium it was given — a line drawing comes back as a line ' +
      'drawing, not a render.',
    cases: [
      {
        label: 'Line elevation, resolved',
        note: 'Crisper linework at size, with no sky, ground, colour or material the drawing never had.',
        input: asset('elev-line.jpg'),
        inputLabel: 'Line elevation',
        output: asset('ex-upscale.jpg'),
        outputLabel: 'Print master',
      },
    ],
  },

  watercolour: {
    summary: 'The same building, painted — paper tooth, ink linework and wet-edge bleeds, with the architecture intact.',
    cases: [
      {
        label: 'Warm palette',
        note: 'A real watercolour treatment: the geometry and materials survive the change of medium.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-watercolour.jpg'),
        outputLabel: 'Watercolour',
      },
    ],
  },

  declutter: {
    summary: 'Strips a room back to its empty shell — everything movable gone, the architecture left alone.',
    cases: [
      {
        label: 'Cluttered room to empty shell',
        note: 'Furniture, rugs and clutter removed; radiator, skirting, floor wear and wall blemishes all kept.',
        input: asset('room-input.jpg'),
        inputLabel: 'Cluttered room',
        output: asset('ex-declutter.jpg'),
        outputLabel: 'Cleared shell',
      },
    ],
  },

  targetedSwap: {
    summary:
      'Change one thing and nothing else. Draw a red box around the element and name what it should become — the box ' +
      'is read as an instruction, not redrawn.',
    cases: [
      {
        label: 'Sofa swapped, room untouched',
        note: 'Only what was inside the box changed. The blanket and cushions on it came through onto the new upholstery.',
        input: asset('ex-room-marked.jpg'),
        inputLabel: 'Marked region',
        output: asset('ex-targeted-swap.jpg'),
        outputLabel: 'Swapped',
      },
    ],
  },

  specSheet: {
    summary: 'Pulls the furniture and finishes out of a room photo as a labelled flat-lay you can hand to a supplier.',
    cases: [
      {
        label: 'FF&E from a room photo',
        note: 'Every item is from that room — its sofa, its rug, its bookshelf — flat on white and correctly named.',
        input: asset('room-input.jpg'),
        inputLabel: 'Room photo',
        output: asset('ex-spec-sheet.jpg'),
        outputLabel: 'Spec sheet',
      },
    ],
  },

  floorAnalysis: {
    summary: 'Overlays analysis on a plan — circulation, zoning, daylight — with a legend that matches what is marked.',
    cases: [
      {
        label: 'Zoning layer',
        note: 'Living, sleeping, service and circulation coloured, keyed to a legend, with every room label preserved.',
        input: asset('plan-input.jpg'),
        inputLabel: '2D floor plan',
        output: asset('ex-floor-analysis.jpg'),
        outputLabel: 'Zoning analysis',
      },
    ],
  },

  programDiagram: {
    summary: 'Separates a building by level so the programme reads — this building, not anonymous stacked slabs.',
    cases: [
      {
        label: 'Levels, isometric',
        note: 'Ground, first and second pulled apart, each keeping its own openings, materials and flat roof.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-program-diagram.jpg'),
        outputLabel: 'Programme by level',
      },
    ],
  },

  explodedAxon: {
    summary: 'Pulls a building apart into its layers — roof, floor plates, frame, facade, ground — and labels each.',
    cases: [
      {
        label: 'Exploded outward',
        note: 'Layers peeled sideways along one diagonal, guides following the explode, captions on leader lines.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-exploded-axon.jpg'),
        outputLabel: 'Exploded axonometric',
      },
    ],
  },

  annotation: {
    summary: 'Writes on the drawing — arrows, leader lines and real, correctly spelled labels.',
    cases: [
      {
        label: 'Circulation annotated',
        note: 'Entry, garage access and upper circulation marked in colour, with a key. The labels are real words.',
        input: asset('elev-rendered.jpg'),
        inputLabel: 'Rendered elevation',
        output: asset('ex-annotation.jpg'),
        outputLabel: 'Annotated',
      },
    ],
  },
};

// `PIPELINE_PREVIEW` used to sit here — five hand-picked input/output pairs for
// the dashboard's stage cards. It went with the dashboard. Every pair it held is
// already in `EXAMPLES` below, which is where the instant-demo map and the
// worked-example showcase both read from, so nothing was lost but a third table
// naming the same five files.

const sample = (file: string, label: string) => ({
  url: `${import.meta.env.BASE_URL}examples/${file}`,
  label,
});

/** The demo input a tab can load with one click, so the first run needs no upload.
 *
 *  Every tool with a worked example above gets one, except the two where it
 *  makes no sense: `massing` takes no image at all, and `targetedSwap`'s example
 *  input already carries a burned-in red box — handing that to a tool whose own
 *  job is to draw that box would teach the wrong thing. */
export const TRY_INPUT: Partial<Record<FeatureKind, { url: string; label: string }>> = {
  render: sample('plan-input.jpg', 'sample floor plan'),
  elevation: sample('sketch-input.jpg', 'sample sketch'),
  axonometric: sample('elev-rendered.jpg', 'sample elevation'),
  interior: sample('room-input.jpg', 'sample room photo'),
  moodboard: sample('interior-restyle.jpg', 'sample render'),

  sketchRender: sample('sketch-input.jpg', 'sample sketch'),
  sketchPlan: sample('sketch-input.jpg', 'sample sketch'),
  cadElevation: sample('elev-rendered.jpg', 'sample elevation'),
  section: sample('elev-rendered.jpg', 'sample elevation'),
  renderToPlan: sample('elev-rendered.jpg', 'sample elevation'),
  multiView: sample('elev-rendered.jpg', 'sample elevation'),
  urbanContext: sample('elev-rendered.jpg', 'sample elevation'),
  atmosphere: sample('elev-rendered.jpg', 'sample elevation'),
  facadeMaterial: sample('elev-rendered.jpg', 'sample elevation'),
  humanScale: sample('elev-rendered.jpg', 'sample elevation'),
  reflection: sample('elev-rendered.jpg', 'sample elevation'),
  renderRefine: sample('elev-rendered.jpg', 'sample elevation'),
  watercolour: sample('elev-rendered.jpg', 'sample elevation'),
  programDiagram: sample('elev-rendered.jpg', 'sample elevation'),
  explodedAxon: sample('elev-rendered.jpg', 'sample elevation'),
  annotation: sample('elev-rendered.jpg', 'sample elevation'),
  upscale: sample('elev-line.jpg', 'sample line elevation'),
  declutter: sample('room-input.jpg', 'sample room photo'),
  specSheet: sample('room-input.jpg', 'sample room photo'),
  floorAnalysis: sample('plan-input.jpg', 'sample floor plan'),
};

/** Fetch a bundled example and hand it back as a dataURL the store can hold. */
export async function loadExampleInput(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load the sample image.');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the sample image.'));
    reader.readAsDataURL(blob);
  });
}
