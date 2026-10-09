// Unit checks for pure functions that no screen exercises on its own: request
// bodies, parsers, canvas geometry. Bundled and run by qa/verifyUnits.cjs.
//
// Each check names the behaviour it protects, not the function — a failure
// message should say what broke for the user.

import { geminiRequestBody, groundingSources } from '../src/providers/gemini';
import type { GenerateContentResponse } from '../src/providers/gemini';

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

// ---------------------------------------------------------------------------
const failed = results.filter((r) => !r.ok).length;
console.log(`${failed ? '\n' : ''}${results.length - failed}/${results.length} unit checks passed`);
if (failed) process.exit(1);
