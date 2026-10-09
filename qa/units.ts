// Unit checks for pure functions that no screen exercises on its own: request
// bodies, parsers, canvas geometry. Bundled and run by qa/verifyUnits.cjs.
//
// Each check names the behaviour it protects, not the function — a failure
// message should say what broke for the user.

import { geminiRequestBody, groundingSources } from '../src/providers/gemini';
import type { GenerateContentResponse } from '../src/providers/gemini';
import { formatCoordinates, formatLatitude, parseCoordinates } from '../src/lib/coords';
import { placement, ratioValue } from '../src/lib/reframe';
import { dataUrlSize, effectiveAspect, nearestAspect } from '../src/providers/options';
import { CHECKS } from '../src/lib/checks';
import { EXAMPLES } from '../src/lib/examples';
import { FEATURE_KEYS } from '../src/features/registry/keys';
import { describeRegion } from '../src/lib/prompt/clauses';
import { buildGroundFloorPrompt } from '../src/lib/prompt/visualization';
import { readFileSync } from 'node:fs';

const results: { ok: boolean; name: string }[] = [];
function check(name: string, ok: boolean, detail = ''): void {
  results.push({ ok, name });
  if (!ok) console.log(`FAIL  ${name}${detail ? '\n      ' + detail : ''}`);
}
const json = (v: unknown) => JSON.stringify(v);

// --- Google Search grounding (Phase 0, G3) ----------------------------------

const img = { mimeType: 'image/jpeg', data: 'AAAA' };
const plain = geminiRequestBody('p', [img], '16:9');
check('an ungrounded request carries no tools field (existing tools unchanged)', !('tools' in plain));
check(
  'an ungrounded request is byte-identical to the pre-grounding body',
  json(plain) ===
    json({
      contents: [{ role: 'user', parts: [{ text: 'p' }, { inlineData: img }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
    }),
  json(plain),
);
const grounded = geminiRequestBody('p', [], undefined, true);
check('a grounded request asks for Google Search', json(grounded.tools) === json([{ google_search: {} }]), json(grounded));
check('a grounded request still asks for an IMAGE only', json(grounded.generationConfig) === json({ responseModalities: ['IMAGE'] }));
check('a text-only request sends the prompt alone', json(grounded.contents) === json([{ role: 'user', parts: [{ text: 'p' }] }]));
check("'auto' ratio omits imageConfig (Gemini rejects it)", !('imageConfig' in (geminiRequestBody('p', [], 'auto').generationConfig as object)));

const resp: GenerateContentResponse = {
  candidates: [
    {
      groundingMetadata: {
        groundingChunks: [
          { web: { uri: 'https://a.example/1', title: 'A' } },
          { web: { uri: 'https://a.example/1', title: 'A again' } },
          { web: { uri: 'https://b.example/2' } },
          {},
        ],
      },
    },
  ],
};
const src = groundingSources(resp);
check('sources are de-duplicated by address', src.length === 2, json(src));
check('a source with no title shows its address', src[1]?.title === 'https://b.example/2', json(src));
check('no grounding metadata means no sources', groundingSources({ candidates: [{}] }).length === 0);

// --- Coordinates (Phase 2b, S1) ---------------------------------------------

const near = (c: { lat: number; lng: number } | null, lat: number, lng: number) =>
  c !== null && Math.abs(c.lat - lat) < 1e-4 && Math.abs(c.lng - lng) < 1e-4;
const COORDS: [string, number, number][] = [
  ['27.1751, 78.0421', 27.1751, 78.0421],
  ['-33.8568 151.2153', -33.8568, 151.2153],
  ['27.1751° N, 78.0421° E', 27.1751, 78.0421],
  ['38.8977° N, 77.0365° W', 38.8977, -77.0365],
  ['38.8977 N 77.0365 W', 38.8977, -77.0365],
  ['33.8568° S, 151.2153° E', -33.8568, 151.2153],
  ['78.0421 E, 27.1751 N', 27.1751, 78.0421],
  [`27°10'30"N 78°2'31"E`, 27.175, 78.041944],
  ['27°10′30″N 78°2′31″E', 27.175, 78.041944],
  ['51°30′26″N 0°7′39″W', 51.507222, -0.1275],
  ['https://www.google.com/maps/place/x/@27.1751,78.0421,17z', 27.1751, 78.0421],
  ['  28.6129 ,77.2295  ', 28.6129, 77.2295],
];
for (const [text, lat, lng] of COORDS) {
  const got = parseCoordinates(text);
  check(`reads "${text}"`, near(got, lat, lng), json(got));
}
for (const bad of ['', 'Taj Mahal', '27.1751', '95, 10', '10, 200', '27 N 28 N', '1, 2, 3', `27°70'N 78°E`]) {
  check(`refuses "${bad}" rather than guessing`, parseCoordinates(bad) === null, json(parseCoordinates(bad)));
}
check('formats in the form prompts state', formatCoordinates({ lat: -33.85681, lng: 151.21529 }) === '33.8568° S, 151.2153° E');
check('formats a latitude for the sun path', formatLatitude(27.1751) === '27.2° N' && formatLatitude(-33.86) === '33.9° S');

// --- Reframe geometry (Phase 3a, R1) ----------------------------------------

const P = (w: number, h: number, r: string, a: 'centre' | 'top' | 'bottom' = 'centre') => placement(w, h, r, a);
const tall = P(1200, 656, '9:16');
check('16:9 → 9:16 keeps the width and grows the height', tall.W === 1200 && tall.H === 2133, json(tall));
check('and centres the original vertically', tall.y === Math.round((2133 - 656) / 2) && tall.x === 0, json(tall));
check('the original keeps its own size on the canvas', tall.w === 1200 && tall.h === 656);
check('anchor bottom puts the new space above', P(1200, 656, '9:16', 'bottom').y === 2133 - 656);
check('anchor top puts the new space below', P(1200, 656, '9:16', 'top').y === 0);
const wide = P(800, 800, '21:9');
check('1:1 → 21:9 keeps the height and grows the width, centred', wide.H === 800 && wide.W === 1867 && wide.x === 534, json(wide));
const same = P(1600, 900, '16:9');
check('a ratio it already has adds no margin', same.W === 1600 && same.H === 900 && same.x === 0 && same.y === 0, json(same));
for (const r of ['9:16', '4:5', '1:1', '3:2', '16:9', '21:9']) {
  const p = P(1200, 656, r);
  check(`the ${r} canvas really is ${r}`, Math.abs(p.W / p.H - ratioValue(r)) < 0.002, json(p));
  check(`and contains the original (${r})`, p.x >= 0 && p.y >= 0 && p.x + p.w <= p.W && p.y + p.h <= p.H, json(p));
}

// --- Two-image aspect pin (Phase 0 live finding: O3, X1) ---------------------

const asData = (file: string) =>
  `data:${file.endsWith('.png') ? 'image/png' : 'image/jpeg'};base64,${readFileSync(file).toString('base64')}`;
const massing = asData('public/examples/ex-massing.jpg'); // 1200 x 805
const wideRef = asData('public/examples/elev-rendered.jpg'); // 860 x 470
const planPng = asData('test-assets/sample-plan.png'); // 1300 x 976
check('reads a JPEG’s size from its header', json(dataUrlSize(massing)) === json({ w: 1200, h: 805 }), json(dataUrlSize(massing)));
check('reads a PNG’s size from its header', json(dataUrlSize(planPng)) === json({ w: 1300, h: 976 }), json(dataUrlSize(planPng)));
check('a remote URL has no readable size', dataUrlSize('https://example.org/a.png') === null);
check('3:2 is nearest for 1200 × 805', nearestAspect(1200, 805) === '3:2');
check('9:16 is nearest for a phone portrait', nearestAspect(893, 1600) === '9:16');
check('two images pin to the FIRST image’s shape', effectiveAspect(undefined, [massing, wideRef]) === '3:2');
check('a ratio the tool asked for still wins', effectiveAspect('1:1', [massing, wideRef]) === '1:1');
check('one image is left to follow itself', effectiveAspect(undefined, [massing]) === undefined);

// --- A marked box, located in words (Q4) -------------------------------------

const q4 = { x: 0.005, y: 0.545, w: 0.21, h: 0.2 };
check('a box on the left is said to be on the left', /in the left of the image/.test(describeRegion(q4)), describeRegion(q4));
check('with its span across and down', /from 1% to 22% of the way across, and from 55% to 75% of the way down/.test(describeRegion(q4)));
check('a lower-right box is the lower right', /the lower right/.test(describeRegion({ x: 0.7, y: 0.7, w: 0.2, h: 0.2 })));
const gf = { program: 'cafe', customProgram: '', materials: 'complement', people: true } as Parameters<typeof buildGroundFloorPrompt>[0];
check('ground floor says where the box is when it knows', /The rectangle is in the left of the image/.test(buildGroundFloorPrompt({ ...gf, region: q4 })));
check('and claims no position when it does not', !/The rectangle is in/.test(buildGroundFloorPrompt(gf)));

// --- "What we check" tables --------------------------------------------------

const thin = FEATURE_KEYS.filter((k) => CHECKS[k].rows.length < 3 || CHECKS[k].rows.length > 5);
check('every tool says what a good result gets right, in 3–5 checks', thin.length === 0, thin.join(', '));
const cells = FEATURE_KEYS.flatMap((k) => CHECKS[k].rows.flatMap((r) => [r.check, r.before, r.after].map((c) => [k, c])));
const bad = cells.filter(([, c]) => !c.trim() || c.length > 64);
check('every check cell is filled and short enough to scan', bad.length === 0, bad.map(([k, c]) => `${k}: ${c}`).join('\n      '));
const dupes = FEATURE_KEYS.filter((k) => new Set(CHECKS[k].rows.map((r) => r.check)).size !== CHECKS[k].rows.length);
check('no tool lists the same check twice', dupes.length === 0, dupes.join(', '));
// A worked example is a live run that passed; a tool cannot ship one and still
// claim it has not been run.
const claimsUnrun = FEATURE_KEYS.filter((k) => CHECKS[k].live === 'pending' && EXAMPLES[k]);
check('a tool with a shipped example does not say it is untested', claimsUnrun.length === 0, claimsUnrun.join(', '));
const caveatSilent = FEATURE_KEYS.filter((k) => (CHECKS[k].live === 'caveat' || CHECKS[k].live === 'fixed' || CHECKS[k].live === 'issue') && !CHECKS[k].note);
check('every caveat and every fix is spelled out', caveatSilent.length === 0, caveatSilent.join(', '));

// ---------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok).length;
console.log(`${failed ? '\n' : ''}${results.length - failed}/${results.length} unit checks passed`);
if (failed) process.exit(1);
