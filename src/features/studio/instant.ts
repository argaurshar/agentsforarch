// Results that need no key, no call and no money.
//
// The front door's hardest ten seconds are the ones before a visitor has given
// the app anything. They cannot generate — that needs their own API key — so
// until now the honest answer was "here are some screenshots of what it does".
// Screenshots are not the app.
//
// But this app already ships twenty-one real input→output pairs it produced
// itself, in `public/examples`, sitting in a collapsible card nobody opens. So a
// sample "generation" does not have to be a generation: when the input IS one of
// those bundled images and the tool IS the one that made the pair, the result
// already exists and can be handed over instantly.
//
// DERIVED, not hand-typed. The map below is built from `EXAMPLES` — the same
// data the worked-example showcase reads — so a new example becomes a new
// instant path by existing, a renamed asset cannot leave a dangling filename
// here, and there is no second list to keep in step. Hand-typing eight
// `'iso-3d.jpg'` strings would have been quicker and exactly the kind of
// parallel table this codebase keeps deleting.
//
// The one rule that is NOT negotiable: a result served from here is labelled as
// a prepared example wherever it appears. It is a demo, and a demo that lets a
// visitor believe their own image came back in 200ms for free is a lie, not a
// feature.

import { EXAMPLES } from '../../lib/examples';
import type { FeatureKind } from '../../types';

export interface InstantResult {
  /** The finished image, as a served URL under `public/examples`. */
  output: string;
  /** What that run was, in the showcase's own words. */
  label: string;
  /** Basename of the output, so a chained run can look ITSELF up and stay
   *  instant — sketch → elevation → axonometric is two free steps. */
  outputSource: string;
}

/** `${input asset basename}::${feature}` → the result that pair produced. */
type InstantMap = Record<string, InstantResult>;

/** `${BASE_URL}examples/iso-3d.jpg` → `iso-3d.jpg`. */
export function assetName(url: string): string {
  return url.slice(url.lastIndexOf('/') + 1);
}

function buildMap(): InstantMap {
  const out: InstantMap = {};
  for (const [feature, set] of Object.entries(EXAMPLES)) {
    for (const c of set?.cases ?? []) {
      if (!c.input) continue; // composed outputs (the collage board) have no input
      const key = `${assetName(c.input)}::${feature}`;
      // First case wins. The showcase lists each tool's DEFAULT run first and
      // its variations after, and the front door runs a tool on its defaults —
      // so first-wins is not arbitrary, it is the matching one.
      if (!out[key]) out[key] = { output: c.output, label: c.label, outputSource: assetName(c.output) };
    }
  }
  return out;
}

const INSTANT = buildMap();

/**
 * The prepared result for this input and this tool, or null when there is none
 * and the tool has to actually run.
 *
 * `source` is the bundled asset the current input came from — null for anything
 * the user supplied, which is every real use of the app.
 */
export function instantFor(source: string | null, feature: FeatureKind): InstantResult | null {
  if (!source) return null;
  return INSTANT[`${source}::${feature}`] ?? null;
}

/** Every tool that can answer instantly for this input. Used to lead with them
 *  in the shortlist, so a keyless visitor's first card is one that works. */
export function instantFeatures(source: string | null): Set<FeatureKind> {
  const found = new Set<FeatureKind>();
  if (!source) return found;
  for (const key of Object.keys(INSTANT)) {
    const [asset, feature] = key.split('::');
    if (asset === source) found.add(feature as FeatureKind);
  }
  return found;
}

/** Every (input, feature) pair the map holds. For the QA gate that checks the
 *  files behind them are actually shipped. */
export function instantPairs(): { input: string; feature: string; output: string }[] {
  return Object.entries(INSTANT).map(([key, v]) => {
    const [input, feature] = key.split('::');
    return { input, feature, output: assetName(v.output) };
  });
}
