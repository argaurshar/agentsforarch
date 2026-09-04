// The name, the promise, and the one place either is written down.
//
// Until now "AND Studio — Internal Visualization Platform" lived in five files:
// the document title, the sidebar wordmark, the mood-board footer, the social
// export caption and the project-file error message. That is fine for a tool
// nobody outside the studio ever sees. It stops being fine the moment a result
// is shareable, because the tagline is then the first sentence a stranger reads
// — and "Internal Visualization Platform" tells them, accurately, that the page
// is not for them.
//
// TWO DECISIONS, and they are separable on purpose:
//
//   The NAME stays. "AND Studio" is the firm's, it is the logo, and it is baked
//   into the `.json` project export's own validation message — renaming it is a
//   data-format change wearing a marketing hat, and it is not mine to make.
//
//   The PROMISE changes. It is the half that was actually wrong, it appears in
//   the tab, the share card and the Open Graph tags, and it is now one constant
//   instead of five literals.
//
// The tool count is READ FROM THE REGISTRY rather than typed. A promise that
// says a number is a promise that can rot, and the one place it cannot be
// derived — the static `<meta>` tags in index.html, which have no JavaScript —
// is covered by a lint rule that fails when the literal and the registry
// disagree.

import { FEATURE_KEYS } from '../features/registry/keys';

/** How many transformations the app ships. Quoted in the promise. */
export const TOOL_COUNT = FEATURE_KEYS.length;

export const BRAND = {
  name: 'AND Studio',
  /** The whole product in six words. Tab title, share card, og:title. */
  promise: `One image in, ${TOOL_COUNT} drawings out.`,
  /** og:description and the meta description. Long enough to say what the thing
   *  is, short enough that no crawler truncates it mid-clause. */
  description:
    'Drop a plan, a sketch or a photo of a room. Two clicks later: the isometric, the elevation, the section, the material board. Every transformation runs in your browser, with your own API key.',
  /** Canonical deployed address. Only the static tags need it — everything at
   *  runtime derives its links from `location`, which is always right. */
  site: 'https://argaurshar.github.io/agentsforarch/',
  /** Under `public/`, so it resolves against whatever base is deployed. */
  ogImage: 'og.jpg',
  /** The ochre the share card and the social export draw with. */
  accent: '#86662e',
  ink: '#111111',
  bone: '#f3ede1',
} as const;

/** `<title>` and og:title. */
export const PAGE_TITLE = `${BRAND.name} — ${BRAND.promise}`;

/**
 * The app's own address as served, with the trailing slash.
 *
 * `BASE_URL` is `/` in dev and `/agentsforarch/` on Pages, so this is correct in
 * both without a build-time constant — and correct on a fork, which a hardcoded
 * `BRAND.site` would not be.
 */
export function siteUrl(): string {
  if (typeof window === 'undefined') return BRAND.site;
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}
