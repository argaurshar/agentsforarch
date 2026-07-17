// Quick-action refinement vocabulary (P2). Each chip maps a label the architect
// clicks to an edit instruction fragment; buildRefinePrompt (prompts.ts) turns
// the selected chips + free text into a single "keep everything, change only
// these" instruction, and RefineChips (components/Scene) renders the labels.

export type RefineChipKey =
  | 'warmer-light'
  | 'cooler-light'
  | 'more-glass'
  | 'add-greenery'
  | 'remove-people'
  | 'add-people'
  | 'lighter-materials'
  | 'darker-materials'
  | 'simplify-facade';

export interface RefineChip {
  key: RefineChipKey;
  label: string;
  clause: string;
}

export const REFINE_CHIPS: RefineChip[] = [
  { key: 'warmer-light', label: 'Warmer light', clause: 'make the lighting warmer and softer' },
  { key: 'cooler-light', label: 'Cooler light', clause: 'make the lighting cooler and crisper' },
  { key: 'more-glass', label: 'More glass', clause: 'increase the amount of glazing / glass on the façade' },
  { key: 'add-greenery', label: 'Add greenery', clause: 'add trees, planting and greenery around the building' },
  { key: 'remove-people', label: 'Remove people', clause: 'remove all people from the scene' },
  { key: 'add-people', label: 'Add people', clause: 'add a few softly rendered people for scale' },
  { key: 'lighter-materials', label: 'Lighter materials', clause: 'shift the materials to lighter, paler tones' },
  { key: 'darker-materials', label: 'Darker materials', clause: 'shift the materials to darker, richer tones' },
  { key: 'simplify-facade', label: 'Simplify façade', clause: 'simplify and clean up the façade composition' },
];
