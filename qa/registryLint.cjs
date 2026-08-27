// Static lint over the feature registry and the layers around it.
//
// Run: node qa/registryLint.cjs
//
// SCOPE NOTE — this deliberately does NOT re-check what TypeScript already
// enforces. Since the registry landed, every derived table is either a mapped
// type over `FeatureKind` or a `.map` over the registry, so a tool missing from
// one is a `tsc` error and CI already runs `tsc --noEmit`. Duplicating that here
// would be theatre.
//
// What it covers is the set of things types cannot see: duplicate keys, prompt
// text that has leaked back into the transport layer, hard-coded feature keys
// outside the store, and hand-written prompt-textarea ids. Each rule below
// exists because the thing it forbids was a real bug in this repo.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ ok, name });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '\n      ' + detail : ''}`);
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = walk(SRC).map((f) => ({ path: f, rel: path.relative(ROOT, f), text: fs.readFileSync(f, 'utf8') }));
const registry = files.find((f) => f.rel.endsWith(path.join('features', 'registry', 'index.ts')));
const keysFile = files.find((f) => f.rel.endsWith(path.join('features', 'registry', 'keys.ts')));

// Comments must be stripped before any of these rules parse source. Matching
// quotes across raw source makes an apostrophe in prose ("the user's browser")
// open a string that closes at the next apostrophe several lines later, so a
// rule reports garbage and proves nothing. The same helper keeps a `//` comment
// inside FEATURE_KEYS from being parsed as a feature key — which is exactly what
// happened the first time a comment was added there.
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

// --- 1. The registry is intact -----------------------------------------------

check('feature registry exists', Boolean(registry) && Boolean(keysFile));

const declaredKeys = (stripComments(keysFile?.text ?? '').match(/FEATURE_KEYS = \[([^\]]+)\]/)?.[1] ?? '')
  .split(',')
  .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
  .filter(Boolean);

check('at least one tool is registered', declaredKeys.length > 0, declaredKeys.join(', '));
check('no duplicate feature keys', new Set(declaredKeys).size === declaredKeys.length);

// Every key must have a definition object in the registry.
const missingDefs = declaredKeys.filter((k) => !new RegExp(`\\n(const ${k}: FeatureDef|  ${k},)`).test(registry?.text ?? ''));
check('every key has a registry definition', missingDefs.length === 0, missingDefs.join(', '));

// Every definition must carry the fields the shell reads but TS gives defaults
// to (optional fields it would happily leave undefined).
const REQUIRED = ['ui:', 'toOptions:', 'buildPrompt:', 'promptContracts:', 'poolLabel:', 'galleryLabel:'];
// There is deliberately no rule against re-adding the derived `ui.index`. The
// `ui` type is closed and every definition is a directly-annotated object
// literal, so tsc rejects it with TS2353 — verified. A lint rule here would
// duplicate the compiler while being strictly weaker than it: the version that
// briefly existed matched a hardcoded four-space indent against un-stripped
// source, so a reformat would have silently switched it off and a comment
// mentioning the field would have failed the build.
const defBlocks = stripComments(registry?.text ?? '').split(/\nconst \w+: FeatureDef</).slice(1);
const incomplete = [];
for (const b of defBlocks) {
  const key = b.match(/key: '([^']+)'/)?.[1] ?? '?';
  for (const field of REQUIRED) if (!b.includes(field)) incomplete.push(`${key} missing ${field}`);
}
check('every definition carries the required fields', incomplete.length === 0, incomplete.join('; '));

// A tool with no prompt contracts is a tool whose prompt nothing guards.
const noContracts = defBlocks
  .filter((b) => /promptContracts: \[\s*\]/.test(b))
  .map((b) => b.match(/key: '([^']+)'/)?.[1] ?? '?');
check('every tool has at least one prompt contract', noContracts.length === 0, noContracts.join(', '));

// --- 2. Layering: prompt text must not live in the transport layer -----------
//
// providers/shared.ts used to carry the per-face elevation clauses — hundreds of
// characters of prompt inside the code that posts HTTP requests. It moved onto
// the registry; this stops it drifting back.

const providerFiles = files.filter((f) => f.rel.startsWith(path.join('src', 'providers')));
const longStrings = [];
for (const f of providerFiles) {
  for (const m of stripComments(f.text).matchAll(/'([^'\\\n]{90,})'|"([^"\\\n]{90,})"/g)) {
    const lit = m[1] || m[2];
    // Error messages are legitimate prose in this layer; prompt clauses are not.
    if (/Add your|Could not|did not return|expected a|may have expired|too large|Check your|rejected the request/.test(lit)) continue;
    longStrings.push(`${f.rel}: ${lit.slice(0, 70)}…`);
  }
}
check('no prompt-length strings in src/providers', longStrings.length === 0, longStrings.join('\n      '));

// --- 3. Feature keys must not be hard-coded outside the store ----------------
//
// AppShell hand-listed four of five features to decide whether to warn about
// unsaved work; the fifth was silently unguarded and an in-flight mood-board run
// could be lost on refresh.

const hardCoded = [];
for (const f of files) {
  if (f.rel.startsWith(path.join('src', 'store'))) continue;
  if (f.rel.includes(path.join('features', 'registry'))) continue;
  for (const k of declaredKeys) {
    const re = new RegExp(`generation\\.${k}\\b`, 'g');
    // A screen reading its OWN slice is fine; reading someone else's is the smell.
    const ownsIt = f.rel.includes(`${path.sep}${k}${path.sep}`) || f.rel.includes(`/${k}/`);
    if (re.test(f.text) && !ownsIt) hardCoded.push(`${f.rel} reads generation.${k}`);
  }
}
check('no cross-feature generation.<key> access outside the store', hardCoded.length === 0, hardCoded.join('\n      '));

// --- 4. Prompt textarea ids are generated, not written by hand --------------
//
// The shell derives `${feature}-prompt`, which is what keeps the QA convention
// true for all 54 tools. A hand-written id drifts (axonometric's was
// `axon-prompt` while its key is `axonometric`).

// A literal id is only wrong when it does not match a real feature key — that
// is the drift this catches. Mood Board is not on the shell yet and writes its
// own `moodboard-prompt`, which is correct; Axonometric's used to be
// `axon-prompt` while its key is `axonometric`, which was not.
const badIds = files
  .filter((f) => !f.rel.endsWith('GenerationScreen.tsx'))
  .flatMap((f) =>
    (f.text.match(/id="([a-z0-9-]+)-prompt"/g) ?? [])
      .map((m) => ({ file: f.rel, key: m.match(/id="([a-z0-9-]+)-prompt"/)[1] }))
      .filter((x) => !declaredKeys.includes(x.key))
      .map((x) => `${x.file}: id="${x.key}-prompt" is not a feature key`),
  );
check('prompt textarea ids match their feature key', badIds.length === 0, badIds.join('\n      '));

// --- 5. Every tool the registry claims is reachable in the nav ---------------
//
// Reachability is two hops now that the sidebar lists categories rather than
// tools: sidebar → category, category screen → its tools. BOTH have to stay
// derived. If either one is ever hand-listed, a tool can exist, build, deploy
// and be unreachable — which is the exact failure this whole refactor exists to
// make impossible.

const sidebar = files.find((f) => f.rel.endsWith('Sidebar.tsx'));
check(
  'the sidebar derives its rows from the registry',
  /CATEGORIES\.map/.test(sidebar?.text ?? ''),
  'a hand-written NAV_ITEMS list is how a feature ships unreachable',
);

const categoryScreen = files.find((f) => f.rel.endsWith('CategoryScreen.tsx'));
check(
  'the tool rail derives its cards from the category',
  /def\.features\.map/.test(categoryScreen?.text ?? ''),
  'the second hop: a category that hand-lists its tools hides the next one added',
);

// --- 6. Every tool's prompt is under the snapshot ------------------------------
//
// qa/dumpPrompts.ts is hand-written — it has to be, because each builder has its
// own axes and only a human knows which combinations matter. That makes it the
// one place a new tool can be forgotten, and the failure is silent in the worst
// way: the snapshot goes on passing while the new tool's prompt is covered by
// nothing at all. Caught exactly that on `massing`.

const dump = fs.readFileSync(path.join(ROOT, 'qa', 'dumpPrompts.ts'), 'utf8');
const unsnapshotted = declaredKeys.filter((k) => {
  // Match on the builder name rather than the key: the dump calls
  // buildMassingPrompt / buildPlaceObjectPrompt, and its variant labels are
  // abbreviated ("place:", "swap:", "int:"), so the key itself often is absent.
  const builder = new RegExp(`build${k[0].toUpperCase()}${k.slice(1)}Prompt`, 'i');
  return !builder.test(dump);
});
check(
  'every tool appears in the prompt snapshot dump',
  unsnapshotted.length === 0,
  unsnapshotted.join(', ') + '  — add it to qa/dumpPrompts.ts, then promptSnapshot.cjs --update',
);

// --- 7. A declared accuracy warning must actually reach the screen ------------
//
// `accuracyWarning` sat on FeatureDef for two PRs with nothing rendering it. A
// field that only the registry reads is a promise the UI never keeps, and this
// one is the promise that a derived plan is part guesswork.

const shell = files.find((f) => f.rel.endsWith('GenerationScreen.tsx'));
const warned = defBlocks.filter((b) => b.includes('accuracyWarning:')).length;
check(
  'a declared accuracy warning is rendered by the shell',
  warned === 0 || /def\.accuracyWarning/.test(shell?.text ?? ''),
  `${warned} tool(s) declare one`,
);

// --- 8. One request builder ---------------------------------------------------
//
// There are two callers that run a tool now — the single-tool screen and the
// batch runner — and the pinned aspect ratio is applied in `buildFeatureRequest`.
// A second call site assembling `options` by hand would silently drop it, and
// the isometric would start squaring off L-shaped plans in batch mode only:
// invisible to tsc, invisible to the prompt snapshot.

const toOptionsCallers = files
  .filter((f) => !f.rel.includes(path.join('features', 'registry')))
  .filter((f) => /\.toOptions\(/.test(f.text))
  .map((f) => f.rel);
check(
  'nothing builds a request by calling toOptions directly',
  toOptionsCallers.length === 0,
  toOptionsCallers.join('\n      ') + '  — use buildFeatureRequest()',
);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} registry checks passed`);
process.exit(failed === 0 ? 0 : 1);
