// Links that carry a transformation, not just a page.
//
// A result is the only thing worth sharing here, and a result cannot travel in
// a URL — the image is the user's, it is megabytes of dataURL, and it is not
// ours to host. So the link carries the RECIPE instead:
//
//   #/do/axonometric                       open the studio, queue this tool
//   #/do/axonometric?from=elev-rendered.jpg  …and start from this bundled image
//
// The second shape is the one that actually spreads. It lands a stranger on the
// exact prepared result the sender was looking at, with no key, no upload and
// no account — and the "Try it on your own image" button is right there under
// it. The first shape is what a link to a user's own result becomes: the tool
// is queued, so their first drop goes straight to the answer in one click
// instead of two.
//
// `from` is VALIDATED against the assets actually shipped. A link naming a file
// that was renamed or never existed falls back to the plain drop zone rather
// than showing a broken image, and a QA rule asserts every link the share
// button can build resolves.

import { REGISTRY } from '../registry';
import { isFeatureKind } from '../registry/keys';
import type { InputKind } from '../registry/keys';
import type { FeatureKind } from '../../types';
import { instantPairs } from './instant';
import { STUDIO_SAMPLES } from './samples';

export interface Remix {
  feature: FeatureKind;
  /** Basename of a bundled asset to start from, when the link named a valid one. */
  from: string | null;
}

/** `#/do/…` — kept distinct from tool slugs (`#/render`) and category routes
 *  (`#/c/drawings`) so the three namespaces can never collide. */
export const REMIX_ROUTE_PREFIX = 'do';

/** Every bundled input a remix link is allowed to name. Derived from the same
 *  two tables the front door reads, so a renamed asset cannot leave a link
 *  pointing at nothing. */
function shareableAssets(): Set<string> {
  const out = new Set<string>(STUDIO_SAMPLES.map((s) => s.file));
  for (const pair of instantPairs()) out.add(pair.input);
  return out;
}

const ASSETS = shareableAssets();

export function isShareableAsset(name: string): boolean {
  return ASSETS.has(name);
}

/**
 * Whether a tool can be the subject of a remix at all.
 *
 * The front door's whole premise is "you have an image" — a text-only tool has
 * no place in it, declares no input kinds, and would leave `remixKind` reading
 * off the end of an empty array. Those tools already have a perfectly good
 * shareable address: their own `#/<tool>` screen.
 */
export function canRemix(feature: FeatureKind): boolean {
  return REGISTRY[feature].inputKind.length > 0;
}

/** The hash for a remix link — or the tool's own screen when it takes no image. */
export function remixHash(feature: FeatureKind, from: string | null): string {
  if (!canRemix(feature)) return `#/${feature}`;
  const base = `#/${REMIX_ROUTE_PREFIX}/${feature}`;
  return from && isShareableAsset(from) ? `${base}?from=${encodeURIComponent(from)}` : base;
}

/**
 * Read a remix out of a location hash, or null when it is not one.
 *
 * Tolerant on the way in: an unknown feature, a `from` naming an asset we do
 * not ship, or a trailing slash all degrade to something sensible rather than
 * throwing. A shared link is the one URL nobody can fix by hand.
 */
export function parseRemix(hash: string): Remix | null {
  const [pathPart, queryPart = ''] = hash.replace(/^#\/?/, '').split('?');
  const [head, tail] = pathPart.split('/');
  if (head !== REMIX_ROUTE_PREFIX || !tail) return null;
  if (!isFeatureKind(tail) || !canRemix(tail)) return null;
  const from = new URLSearchParams(queryPart).get('from');
  return { feature: tail, from: from && isShareableAsset(from) ? from : null };
}

/**
 * What kind of image a remix starts with.
 *
 * A sample knows what it is, so that answer wins. For any other bundled asset
 * the tool's own first declared `inputKind` is the honest answer — it is the
 * tool that says what it reads, and the link named that tool.
 */
export function remixKind(feature: FeatureKind, from: string | null): InputKind {
  const sample = from ? STUDIO_SAMPLES.find((s) => s.file === from) : undefined;
  return sample?.kind ?? REGISTRY[feature].inputKind[0];
}
