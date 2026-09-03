// The four things a first-time visitor can try without owning anything.
//
// These are the app's own bundled example images, already in `public/examples`
// and already served — so offering them costs nothing new. Each one names the
// kind it is, which means tapping a sample skips the classifier entirely and
// lands on a shortlist that is right by construction.
//
// P2 attaches a precomputed RESULT to each of these so the first tap produces
// an image with no key at all. Until then a sample is a fast way to fill the
// drop zone, which is still the difference between reading about the app and
// using it.

import type { InputKind } from '../registry/keys';

export interface StudioSample {
  /** Path under `public/`, resolved against the deployed base. */
  file: string;
  label: string;
  kind: InputKind;
}

export const STUDIO_SAMPLES: StudioSample[] = [
  { file: 'plan-input.jpg', label: 'A floor plan', kind: 'plan' },
  { file: 'sketch-input.jpg', label: 'A sketch', kind: 'sketch' },
  { file: 'room-input.jpg', label: 'A room', kind: 'room' },
  { file: 'elev-rendered.jpg', label: 'A building', kind: 'building' },
];

export function sampleUrl(sample: StudioSample): string {
  return `${import.meta.env.BASE_URL}examples/${sample.file}`;
}
