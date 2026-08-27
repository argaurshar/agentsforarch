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

export const FEATURE_KEYS = [
  'massing',
  'render',
  'elevation',
  'axonometric',
  'interior',
  'declutter',
  'placeObject',
  'targetedSwap',
  'specSheet',
  'moodboard',
] as const;

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

/** One line under the category heading — the stage of the job it belongs to. */
export const CATEGORY_BLURB: Record<CategoryKey, string> = {
  concept: 'Get from an idea to something you can show.',
  drawings: 'Turn plans and sketches into drawings and 3D.',
  site: 'Read the site, and put the building in it.',
  visualization: 'Take a model or a rough render to a final image.',
  interiors: 'Work inside a real room — strip it, stage it, edit it.',
  boards: 'Explain the project: diagrams, boards and layouts.',
};

/** `#/c/<key>` — the category route prefix. Kept distinct from tool slugs so a
 *  category and a tool can never collide as the tool count grows. */
export const CATEGORY_ROUTE_PREFIX = 'c';

/** The tab key for a category destination. */
export type CategoryTab = `cat:${CategoryKey}`;

export function categoryTab(key: CategoryKey): CategoryTab {
  return `cat:${key}`;
}

/** The category key inside a `cat:` tab, or null for any other tab. */
export function categoryFromTab(tab: string): CategoryKey | null {
  if (!tab.startsWith('cat:')) return null;
  const key = tab.slice(4);
  return (CATEGORY_KEYS as readonly string[]).includes(key) ? (key as CategoryKey) : null;
}

export function isFeatureKind(value: string): value is FeatureKind {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}
