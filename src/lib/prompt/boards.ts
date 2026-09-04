// Prompt builders for the Diagrams & Boards category.
//
// These outputs EXPLAIN a building rather than depict one, which inverts the
// usual rule: text is required, not forbidden. That makes spelling the live
// risk — a diagram whose labels read "STRUCTRAL" is unusable in front of a
// client — so every builder here ends by insisting on correct spelling rather
// than by suppressing text.
//
// The other shared risk is that an explanatory overlay gradually eats the
// drawing underneath it. The base has to stay legible, so each builder states
// what the substrate is and orders it preserved before describing the overlay.

import { NO_TEXT } from './clauses';
// Imported, not re-declared — the rule drawings.ts states and prompts.ts
// records the cost of: a prompt module's private copy of a settings union
// drifted, and structural typing hid it until something far away stopped
// assigning. These files kept four such copies.
import type { AnnotationSubject, ExplodeAxis, ProgramOrientation } from '../../store/generation';

export type { AnnotationSubject, ExplodeAxis, ProgramOrientation };

// --- Annotation sketch ------------------------------------------------------

const SUBJECT_CLAUSE: Record<AnnotationSubject, string> = {
  circulation: 'how people move through and around the building — entry, routes, cores and thresholds',
  ventilation: 'how air moves through the building — where it enters cool, where it rises, where it leaves',
  sun: 'how the sun works on the building — path, angle of incidence, what is shaded and what is exposed',
  program: 'what happens where — the functional zones and how they stack or adjoin',
  structure: 'how the building stands up — the load path from roof to ground',
  // Reached only when the user picks "Something else" and types nothing. It has
  // to read as a complete instruction on its own: the previous wording promised
  // a description ("the concept described below") that nothing ever supplied.
  custom: 'the single idea this drawing exists to communicate, read from the image itself',
};

/**
 * A render or drawing → the same image with an explanatory overlay.
 *
 * The failure is that "annotate this" reads as "redraw this with annotations",
 * and the base image comes back subtly different — a moved window, a changed
 * roofline — which destroys the comparison the annotation exists to support.
 * So the base is locked first, and the overlay is described as sitting ON it.
 */
export function buildAnnotationPrompt(a: {
  subject: AnnotationSubject;
  custom: string;
  labels: boolean;
}): string {
  const what = a.subject === 'custom' ? a.custom.trim() || SUBJECT_CLAUSE.custom : SUBJECT_CLAUSE[a.subject];
  return [
    'You are turning the architectural image in the input into an explanatory diagram by drawing over it.',
    'STEP 1 — READ THE IMAGE FIRST. Note the building’s massing and outline, every opening, the camera position, the ' +
      'lens and the crop, and what is in the foreground and background.',
    'STEP 2 — LOCK THE BASE IMAGE. The image underneath comes through completely unchanged: same geometry, same ' +
      'openings, same materials, same light, same camera. You are drawing ON it, not redrawing it. Desaturate it ' +
      'slightly so the overlay reads clearly against it — that is the only change permitted to the base.',
    `STEP 3 — ONLY THEN ANNOTATE. Explain ${what}. Draw bold, clean vector arrows, flow lines and highlight zones in a ` +
      'small set of distinct flat colours, placed accurately over the parts of the building they refer to. Arrows ' +
      'follow real paths and point in the direction of real movement.',
    'Keep the overlay economical: a diagram with six clear marks explains more than one with thirty. Nothing should ' +
      'obscure the part of the building it is explaining.',
    a.labels
      ? 'Add short annotation labels in a clean sans-serif with thin leader lines to what they name. Include a small ' +
          'keyed legend if more than one colour is used. Spell every word correctly and keep every label legible.'
      : NO_TEXT,
    'Before you finish, compare the base image against the input, ignoring the overlay. Any difference in the building ' +
      'itself is a mistake — redo it.',
  ].join(' ');
}

// --- Program diagram --------------------------------------------------------

/**
 * A building → its floors separated and labelled by what they do.
 *
 * The single hardest instruction is that the separated slabs must remain the
 * SAME building: same facade rhythm, same balconies, same proportions. A model
 * asked to "explode" a building will happily generate a stack of generic slabs
 * that share a colour scheme, which explains nothing about the project.
 */
export function buildProgramDiagramPrompt(a: { levels: string; orientation: ProgramOrientation }): string {
  // The field is a textarea, so this arrives newline-separated. Interpolated
  // raw it put hard line breaks mid-sentence in the prompt — and in the prompt
  // snapshot, whose one-entry-per-block parser they broke.
  const levels = a.levels
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(', ');
  return [
    'Produce a clean architectural PROGRAM BREAKDOWN of the building shown in the input: its floors separated from one ' +
      'another and labelled with what each one is for.',
    'STEP 1 — READ THE BUILDING FIRST. Count the storeys. Note the facade rhythm, the balconies and projections, the ' +
      'roof form, and the proportions of the whole volume.',
    'STEP 2 — SEPARATE, DO NOT REDESIGN. Every separated floor is a slice of THAT building: it keeps the same facade ' +
      'proportions, the same window and balcony pattern, and the same structural rhythm as the corresponding storey in ' +
      'the input. A stack of generic slabs that merely share a style is a failure of this task.',
    a.orientation === 'vertical'
      ? 'Arrange the floors separated vertically, evenly spaced and perfectly aligned on a shared vertical axis, in ' +
          'their real order with the ground floor at the bottom.'
      : 'Arrange the floors as an exploded isometric stack, offset along a consistent axis so each floor plate is ' +
          'visible, in their real order with the ground floor at the bottom.',
    levels
      ? `Take the program as given, bottom to top: ${levels}. These are BANDS, not storeys: a band may cover several ` +
          'floors, so group the consecutive storeys that share a use and label the group once with the name supplied. ' +
          'Use every name given, in the order given, and add none of your own.'
      : 'Infer a plausible program from the building type and label each floor accordingly — parking or retail at the ' +
          'base, primary accommodation above, shared or amenity space at the top.',
    'Annotation: place each floor’s name in a small clean sans-serif inside a minimal frame, connected to its slab by ' +
      'a thin precise leader line. Strict alignment, no overlap, high readability. Spell every word correctly.',
    'Light neutral background, soft ambient lighting, no dramatic shadows. Minimal and instructional — an architectural ' +
      'explainer for a client presentation. No people, no clutter, no context.',
    'Before you finish, account for every storey in the input: each one belongs to exactly one separated band, no ' +
      'storey is dropped and none is invented. If a band’s facade does not match the storeys it covers, rebuild it.',
  ].join(' ');
}

// --- Exploded axonometric ---------------------------------------------------

/**
 * A building or room → its components pulled apart along one axis.
 *
 * Distinct from the program diagram: that separates FLOORS and labels their
 * use; this separates CONSTRUCTION LAYERS and shows how the thing goes
 * together. Both explode; they answer different questions.
 */
export function buildExplodedAxonPrompt(a: { axis: ExplodeAxis; labels: boolean }): string {
  return [
    'Deconstruct the building shown in the input into an EXPLODED AXONOMETRIC diagram showing how it is assembled.',
    'STEP 1 — READ IT FIRST. Identify the distinct layers: roof and its structure, floor plates, the structural frame ' +
      'or load-bearing walls, the facade or envelope, and the ground and foundation.',
    a.axis === 'vertical'
      ? 'STEP 2 — EXPLODE UPWARD. Separate those layers along a single vertical axis, evenly spaced, each one directly ' +
          'above the one it sits on, so the assembly reads bottom to top.'
      : // Live run 08 with this branch selected returned essentially the vertical
        // stack: "outward" alone was too weak to displace the default. It now
        // says what NOT to do, and gives the direction a concrete description.
        'STEP 2 — EXPLODE OUTWARD, NOT UPWARD. Peel the layers apart SIDEWAYS along a consistent diagonal, each one ' +
          'offset down-and-to-the-left of the one behind it, as though the building were being unpacked towards the ' +
          'viewer. This is explicitly NOT a vertical stack: do not place the layers one directly above another, and do ' +
          'not separate them along a vertical axis. The horizontal offset between neighbouring layers must be at least ' +
          'as large as the vertical one, so each layer is fully visible and the order of assembly is legible.',
    'Draw it in true axonometric projection: parallel lines stay parallel, no vanishing point, no foreshortening, seen ' +
      'from a three-quarter viewpoint above.',
    // ROOF FORM used to be missing from this list — footprint, proportions,
    // materials and openings were locked, the roof was not. Live run 08 returned
    // a flat overhanging roof as a hipped, pitched one while every other layer
    // stayed faithful. The roof is the layer most exposed here, because
    // exploding a building means redrawing each layer standalone and a roof
    // drawn standalone reverts to the commonest roof the model knows.
    'Every separated layer belongs to THIS building — the same footprint, the same proportions, the same storey count, ' +
      'the same materials and the same openings as the input.',
    'The ROOF LAYER IS THE ONE THAT DRIFTS, so read it off the input before you draw it: its pitch or its flatness, ' +
      'its overhang or its lack of one, its parapets, its fascias and how it steps. A flat roof stays flat and keeps ' +
      'its overhangs. Do not give this building a pitched, hipped or gabled roof unless the input already has one.',
    // The guide lines have to run along whichever axis the layers were pulled
    // apart on. Pinned vertical, they contradicted the diagonal explode: either
    // the model reverted to a vertical stack or it drew leaders joining nothing.
    a.axis === 'vertical'
      ? 'Add thin vertical guide lines between the layers, running along the explode axis so the eye reassembles them.'
      : 'Add thin guide lines between the layers, running along the same diagonal as the explode so the eye ' +
          'reassembles them.',
    'Keep the original materials and design character rather than reducing everything to grey: this is a presentation ' +
      'diagram, not an engineering drawing.',
    a.labels
      ? 'Label each layer with a small clean sans-serif caption on a thin leader line — "Roof structure", "Floor ' +
          'plates", "Structural frame", "Facade", "Ground". Spell every word correctly.'
      : NO_TEXT,
    'Clean white background, soft even lighting, no cast shadows between the layers.',
  ].join(' ');
}
