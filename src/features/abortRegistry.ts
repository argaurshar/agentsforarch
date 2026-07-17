// A tiny non-reactive registry of in-flight generation AbortControllers, keyed
// by feature. It lives outside both the store and the hook so that the store
// (resetProject / New project) can abort in-flight runs without importing the
// hook (which imports the store — a cycle we avoid). Controllers are
// deliberately NOT in the store: they're non-serializable and carry no render
// value.

import type { FeatureKind } from '../providers';

const controllers = new Map<FeatureKind, AbortController>();

/** Begin a run for `feature`, aborting any previous in-flight run for it. */
export function startRun(feature: FeatureKind): AbortController {
  controllers.get(feature)?.abort();
  const controller = new AbortController();
  controllers.set(feature, controller);
  return controller;
}

/** Abort the current in-flight run for `feature`, if any. */
export function abortFeature(feature: FeatureKind): void {
  controllers.get(feature)?.abort();
  controllers.delete(feature);
}

/** Abort every in-flight generation (used by resetProject / New project). */
export function abortAllFeatures(): void {
  for (const controller of controllers.values()) controller.abort();
  controllers.clear();
}

/** Drop a finished controller (only if it's still the current one). */
export function clearController(feature: FeatureKind, controller: AbortController): void {
  if (controllers.get(feature) === controller) controllers.delete(feature);
}
