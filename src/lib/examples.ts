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
};

/**
 * The one representative pair per pipeline stage, for the dashboard's stage
 * cards — a split preview (input | output) so a first-time visitor sees what
 * each stage turns into before opening it.
 */
export const PIPELINE_PREVIEW: Partial<Record<FeatureKind, { input: string; output: string }>> = {
  render: { input: asset('plan-input.jpg'), output: asset('iso-3d.jpg') },
  elevation: { input: asset('sketch-input.jpg'), output: asset('elev-rendered.jpg') },
  axonometric: { input: asset('elev-rendered.jpg'), output: asset('axon-realistic.jpg') },
  interior: { input: asset('room-input.jpg'), output: asset('interior-restyle.jpg') },
  moodboard: { input: asset('interior-restyle.jpg'), output: asset('board-interior.jpg') },
};

/** The demo input a tab can load with one click, so the first run needs no upload. */
export const TRY_INPUT: Partial<Record<FeatureKind, { url: string; label: string }>> = {
  render: { url: `${import.meta.env.BASE_URL}examples/plan-input.jpg`, label: 'sample floor plan' },
  elevation: { url: `${import.meta.env.BASE_URL}examples/sketch-input.jpg`, label: 'sample sketch' },
  axonometric: { url: `${import.meta.env.BASE_URL}examples/elev-rendered.jpg`, label: 'sample elevation' },
  interior: { url: `${import.meta.env.BASE_URL}examples/room-input.jpg`, label: 'sample room photo' },
  moodboard: { url: `${import.meta.env.BASE_URL}examples/interior-restyle.jpg`, label: 'sample render' },
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
