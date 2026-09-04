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
      'Type the brief and the site, get a white study model back. The one tool here that needs no image at all — ' +
      'useful at the stage where there is nothing to photograph yet.',
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
