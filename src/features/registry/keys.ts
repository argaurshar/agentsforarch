// The canonical list of generation tools.
//
// This file deliberately has NO imports. `providers/` needs `FeatureKind`, and
// the full registry (index.ts) needs prompt builders and settings types from
// `lib/` and `store/` — so putting the key list here is what keeps
// providers → features from becoming a cycle.
//
// The list is not a second source of truth: `REGISTRY` in ./index.ts is
// declared `satisfies Record<FeatureKind, FeatureDef>`, so TypeScript fails the
// build if a key here has no definition, or a definition has no key here.

export const FEATURE_KEYS = ['render', 'elevation', 'axonometric', 'interior', 'moodboard'] as const;

export type FeatureKind = (typeof FEATURE_KEYS)[number];

/** Workflow-stage groupings for the tool rail. Order here is nav order. */
export const CATEGORY_KEYS = ['concept', 'drawings', 'site', 'visualization', 'interiors', 'boards'] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  concept: 'Concept & Form',
  drawings: 'Plans & Drawings',
  site: 'Site & Urban',
  visualization: 'Visualization',
  interiors: 'Interiors',
  boards: 'Diagrams & Boards',
};

export function isFeatureKind(value: string): value is FeatureKind {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}
