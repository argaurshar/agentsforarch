// Unit checks for pure functions that no screen exercises on its own: request
// bodies, parsers, canvas geometry. Bundled and run by qa/verifyUnits.cjs.
//
// Each check names the behaviour it protects, not the function — a failure
// message should say what broke for the user.

import { geminiRequestBody, groundingSources } from '../src/providers/gemini';
import type { GenerateContentResponse } from '../src/providers/gemini';
import { formatCoordinates, formatLatitude, parseCoordinates } from '../src/lib/coords';

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

// ---------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok).length;
console.log(`${failed ? '\n' : ''}${results.length - failed}/${results.length} unit checks passed`);
if (failed) process.exit(1);
