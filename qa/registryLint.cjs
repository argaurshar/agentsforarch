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

// --- 1. The registry is intact -----------------------------------------------

check('feature registry exists', Boolean(registry) && Boolean(keysFile));

const declaredKeys = (keysFile?.text.match(/FEATURE_KEYS = \[([^\]]+)\]/)?.[1] ?? '')
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
const defBlocks = (registry?.text ?? '').split(/\nconst \w+: FeatureDef</).slice(1);
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

// Comments must be stripped FIRST. Matching quotes across raw source makes an
// apostrophe in prose ("the user's browser") open a string that closes at the
// next apostrophe several lines later, so the rule reports garbage and proves
// nothing. A literal also cannot span a newline.
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

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

const sidebar = files.find((f) => f.rel.endsWith('Sidebar.tsx'));
check(
  'the sidebar derives its rows from the registry',
  /ALL_FEATURES\.map/.test(sidebar?.text ?? ''),
  'a hand-written NAV_ITEMS list is how a feature ships unreachable',
);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} registry checks passed`);
process.exit(failed === 0 ? 0 : 1);
