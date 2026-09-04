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
const REQUIRED = ['ui:', 'toOptions:', 'buildPrompt:', 'promptContracts:', 'poolLabel:', 'galleryLabel:', 'verb:', 'inputKind:'];
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

// --- 1b. The front door's shortlists are derived, and none is empty ---------
//
// The studio filters thirty tools down to the handful that read what the user
// dropped. Two ways that goes wrong, and only one of them is visible: a chip
// with no tools behind it is a dead end the user can tap, and a hand-written
// list of cards is how the next tool ships invisible — the same failure the
// nav rows and the category rail already have guards for.

const kindsSrc = (stripComments(keysFile?.text ?? '').match(/INPUT_KINDS = \[([^\]]+)\]/)?.[1] ?? '')
  .split(',')
  .map((k) => k.trim().replace(/^['"]|['"]$/g, ''))
  .filter(Boolean);
check('input kinds are declared', kindsSrc.length > 0, kindsSrc.join(', '));

// Every kind a tool claims must be one of the declared kinds — a typo here is
// silent, because the value only ever reaches an .includes().
const declaredInKinds = [];
for (const b of defBlocks) {
  const key = b.match(/key: '([^']+)'/)?.[1] ?? '?';
  const list = b.match(/inputKind: \[([^\]]*)\]/)?.[1] ?? '';
  for (const raw of list.split(',')) {
    const k = raw.trim().replace(/^['"]|['"]$/g, '');
    if (k) declaredInKinds.push({ key, kind: k });
  }
}
const strayKinds = declaredInKinds.filter((d) => !kindsSrc.includes(d.kind));
check(
  'every declared input kind exists',
  strayKinds.length === 0,
  strayKinds.map((d) => `${d.key}: ${d.kind}`).join(', '),
);

const emptyKinds = kindsSrc.filter((k) => !declaredInKinds.some((d) => d.kind === k));
check(
  'no input kind is offered with nothing behind it',
  emptyKinds.length === 0,
  `${emptyKinds.join(', ')} — a chip the user can tap that yields no cards`,
);

// `inputKind` and `inputMode` have to agree. A text-only tool with kinds would
// appear among the cards for an image it cannot read; an image tool with none
// is unreachable from the front door entirely — invisible, because every other
// rule here still passes. Caught exactly that: a bad edit left the massing
// study claiming to read maps and the aerial tool claiming to read nothing,
// and the suite stayed green.
const kindModeMismatch = [];
for (const b of defBlocks) {
  const key = b.match(/key: '([^']+)'/)?.[1] ?? '?';
  const mode = b.match(/inputMode: '([^']+)'/)?.[1] ?? '?';
  const kinds = (b.match(/inputKind: \[([^\]]*)\]/)?.[1] ?? '').trim();
  if (mode === 'text' && kinds !== '') kindModeMismatch.push(`${key}: text-only but declares ${kinds}`);
  if (mode !== 'text' && kinds === '') kindModeMismatch.push(`${key}: takes an image but no kind offers it`);
}
check(
  'every tool\'s input kinds match how it takes input',
  kindModeMismatch.length === 0,
  kindModeMismatch.join('; '),
);

const studio = files.find((f) => f.rel.endsWith(path.join('studio', 'ToolPicker.tsx')));
check(
  'the front door derives its cards from the registry',
  /toolsForKind\(/.test(studio?.text ?? ''),
  'a hand-listed card grid is how the next tool ships unreachable',
);

// --- 1c. The instant demo actually has files behind it ----------------------
//
// The front door serves a prepared result when the input is a bundled example
// and the tool is the one that made the pair. That map is derived from
// `EXAMPLES`, so it cannot drift from the showcase — but both point at files on
// disk by name, and a rename would break the app's most important ten seconds
// with a broken image and nothing else complaining.
//
// The second rule is the promise itself: every sample offered on the drop zone
// must have at least one tool that can answer it for free. A sample without one
// is a keyless visitor's dead end — they tap it, tap a card, and get asked for
// a credential, which is the exact experience this was built to remove.

const examplesSrc = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'examples.ts'), 'utf8');
const shipped = new Set(fs.readdirSync(path.join(ROOT, 'public', 'examples')));
const referenced = [...stripComments(examplesSrc).matchAll(/asset\('([^']+)'\)/g)].map((m) => m[1]);
const missingAssets = [...new Set(referenced)].filter((f) => !shipped.has(f));
check(
  'every example asset is actually shipped',
  missingAssets.length === 0,
  `${missingAssets.join(', ')} — referenced in examples.ts, absent from public/examples`,
);

// --- 1d. Every tool a visitor can reach shows them what it does --------------
//
// Twenty-five of thirty tools shipped with an EMPTY showcase for months, because
// a worked example needs a real generation and generations cost money. Three
// rounds of live verification paid for them, and this gate is what stops the
// coverage quietly rotting: a tool added tomorrow with no example fails the
// build rather than presenting a visitor with a blank panel and no explanation.
//
// The exemptions are not a convenience list. Each of these three needs an input
// fixture that does not exist in this repo and cannot be fetched or credibly
// generated, so no example CAN be produced for them yet. Deleting a name from
// this list is how the gate is satisfied once its fixture lands.
const NO_FIXTURE = {
  birdsEye: 'needs a top-down satellite or Maps screenshot',
  wireframeRender: 'needs a SketchUp or 3D viewport screenshot',
  placeObject: 'needs a product shot on plain ground as its second image',
};
const documented = new Set(
  [...stripComments(examplesSrc).matchAll(/^  ([a-zA-Z]+): \{$/gm)].map((m) => m[1]),
);
const undocumented = declaredKeys.filter((k) => !documented.has(k) && !(k in NO_FIXTURE));
check(
  'every tool shows a worked example, or is a documented fixture gap',
  undocumented.length === 0,
  `${undocumented.join(', ')} — no entry in examples.ts and not listed in NO_FIXTURE`,
);
// And the exemption list cannot outlive its reason: a tool that HAS gained an
// example must come off it, or the list becomes folklore.
const staleExemptions = Object.keys(NO_FIXTURE).filter((k) => documented.has(k));
check(
  'no tool is exempted from examples while having one',
  staleExemptions.length === 0,
  `${staleExemptions.join(', ')} — has an example; remove it from NO_FIXTURE`,
);

// An example case with an `input` is one (input asset, tool) pair that can be
// served instantly. Collect them the way src/features/studio/instant.ts does.
const instantInputs = new Set(
  [...stripComments(examplesSrc).matchAll(/input: asset\('([^']+)'\)/g)].map((m) => m[1]),
);
const samplesSrc = fs.readFileSync(
  path.join(ROOT, 'src', 'features', 'studio', 'samples.ts'),
  'utf8',
);
const sampleFiles = [...stripComments(samplesSrc).matchAll(/file: '([^']+)'/g)].map((m) => m[1]);
check('the drop zone offers samples', sampleFiles.length > 0, sampleFiles.join(', '));
const deadSamples = sampleFiles.filter((f) => !instantInputs.has(f));
check(
  'every sample can answer at least one tool with no key',
  deadSamples.length === 0,
  `${deadSamples.join(', ')} — offered on the drop zone with no prepared result behind it`,
);

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

// --- 5. Every tool the registry claims is reachable ---------------------------
//
// The failure this guards has not changed — a tool that exists, builds, deploys
// and cannot be opened — but the route to it has, twice. It was sidebar → tool,
// then sidebar → category → tool, and it is now nav → tool index → tool, with
// the category screens reached from the index and kept for the one thing only
// they do: running several tools on one image.
//
// So the sidebar is no longer asserted to derive from CATEGORIES: it holds three
// fixed destinations on purpose, and the derived list moved into the index,
// where rule 12 checks it. What still has to hold here is the SECOND hop, which
// did not move.

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

// --- 9. The promise is written once ------------------------------------------
//
// `src/lib/brand.ts` is the single source for the name and the tagline, and
// every runtime surface reads it. The `<meta>` tags cannot: a crawler fetches
// index.html before a line of JavaScript runs, so those literals are typed by
// hand and can quietly disagree with the app they describe.
//
// That is exactly what happened before this rule existed — the title still said
// "Internal Visualization Platform" while the front door had spent two phases
// becoming a public, shareable, two-click tool. So the tags are recomputed here
// from brand.ts and the registry's own tool count, and any drift is a failure.

const brandSrc = stripComments(
  fs.readFileSync(path.join(SRC, 'lib', 'brand.ts'), 'utf8'),
);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const brandField = (key, quote = "'") => {
  const m = brandSrc.match(new RegExp(`${key}:\\s*${quote}([^${quote}]*)${quote}`));
  return m?.[1];
};
const NAME = brandField('name');
const DESCRIPTION = brandField('description');
const SITE = brandField('site');
const OG_IMAGE = brandField('ogImage');
// Templates are read, not restated: the wording lives in brand.ts and only the
// interpolation happens here.
const PROMISE = brandField('promise', '`')?.replace('${TOOL_COUNT}', String(declaredKeys.length));
const TITLE = brandSrc
  .match(/PAGE_TITLE = `([^`]+)`/)?.[1]
  ?.replace('${BRAND.name}', NAME ?? '')
  .replace('${BRAND.promise}', PROMISE ?? '');

check('the brand is declared in one place', Boolean(NAME && DESCRIPTION && SITE && OG_IMAGE && PROMISE && TITLE));
check(
  'the promise counts the tools the registry actually has',
  Boolean(PROMISE?.includes(String(declaredKeys.length))),
  `"${PROMISE}" vs ${declaredKeys.length} registered tools`,
);

// Every `<meta>` in the document, tolerant of the multi-line form prettier
// produces. Keyed by name= or property=, whichever it carries.
const metas = {};
for (const tag of html.match(/<meta\b[\s\S]*?>/g) ?? []) {
  const key = tag.match(/(?:name|property)="([^"]+)"/)?.[1];
  const content = tag.match(/content="([^"]*)"/)?.[1];
  if (key && content !== undefined) metas[key] = content;
}
const docTitle = html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();

const titled = { '<title>': docTitle, 'og:title': metas['og:title'], 'twitter:title': metas['twitter:title'] };
for (const [where, value] of Object.entries(titled)) {
  check(`${where} matches the brand`, value === TITLE, `"${value}"\n      want  "${TITLE}"`);
}

const described = {
  'meta description': metas.description,
  'og:description': metas['og:description'],
  'twitter:description': metas['twitter:description'],
};
for (const [where, value] of Object.entries(described)) {
  check(`${where} matches the brand`, value === DESCRIPTION, `"${value}"`);
}

check('og:url is the canonical site', metas['og:url'] === SITE, `"${metas['og:url']}" want "${SITE}"`);

// A relative og:image resolves against nothing in a crawler, so this must be
// absolute — and the file has to be there, because a preview card with a broken
// image is worse than no card at all.
const wantImage = `${SITE}${OG_IMAGE}`;
check('og:image is absolute and points at the shipped card', metas['og:image'] === wantImage, `"${metas['og:image']}"`);
check(
  `public/${OG_IMAGE} is shipped`,
  Boolean(OG_IMAGE) && fs.existsSync(path.join(ROOT, 'public', OG_IMAGE)),
  'regenerate with: node qa/makeOgCard.cjs',
);
check(
  'twitter:image matches og:image',
  metas['twitter:image'] === wantImage,
  'the two crawlers read different tags and must be told the same thing',
);
check(
  'the link preview declares a large card',
  metas['twitter:card'] === 'summary_large_image',
  `"${metas['twitter:card']}" — the default card crops the pair to a thumbnail`,
);

// The name is a constant, not a string literal scattered through the UI. This
// is the rule that makes a future rename a one-line change rather than an
// archaeology exercise.
const nameLiterals = files
  .filter((f) => !f.rel.endsWith(path.join('lib', 'brand.ts')))
  .filter((f) => NAME && stripComments(f.text).includes(`'${NAME}'`))
  .map((f) => f.rel);
check(
  'the app name is not hard-coded outside brand.ts',
  nameLiterals.length === 0,
  nameLiterals.join('\n      ') + '  — read it from BRAND',
);

// The old positioning, in every form it took. All three told a visitor the
// page was not for them, which is the one thing a shareable front door must
// never do — and they were spread across the tab title, the sidebar wordmark
// and the sidebar footer, which is exactly why one of them survived two
// redesigns.
const RETIRED = ['Internal Visualization Platform', 'Visualization Platform', 'Internal tool'];
const retired = [];
for (const rel of ['index.html', 'package.json', ...files.map((f) => f.rel)]) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const phrase of RETIRED) if (stripComments(text).includes(phrase)) retired.push(`${rel}: "${phrase}"`);
}
check(
  'the retired "internal platform" positioning is gone',
  retired.length === 0,
  retired.join('\n      ') + '  — it tells a stranger the page is not for them',
);

// --- 10. Sharing is on both paths, and its routes cannot collide -------------
//
// A result reaches the screen two ways — prepared and generated — and a share
// button wired to only one of them is the exact half-feature this suite exists
// to catch: it works in every manual test done on a sample, and is missing for
// every real user.

const resultSrc = files.find((f) => f.rel.endsWith(path.join('studio', 'StudioResult.tsx')))?.text ?? '';
const shareUses = (resultSrc.match(/<ShareBar\b/g) ?? []).length;
check(
  'both result paths offer sharing',
  shareUses === 2,
  `${shareUses} <ShareBar> in StudioResult — prepared and generated each need one`,
);

// Three namespaces live in the hash: `#/<tool>`, `#/c/<category>` and
// `#/do/<tool>`. A tool key equal to a prefix would shadow a whole namespace,
// silently, for every link already sent.
const remixSrc = files.find((f) => f.rel.endsWith(path.join('studio', 'remix.ts')))?.text ?? '';
const remixPrefix = remixSrc.match(/REMIX_ROUTE_PREFIX = '([^']+)'/)?.[1];
const catPrefix = stripComments(keysFile?.text ?? '').match(/CATEGORY_ROUTE_PREFIX = '([^']+)'/)?.[1];
check('the remix route has a prefix', Boolean(remixPrefix) && remixPrefix !== catPrefix, `${remixPrefix} vs ${catPrefix}`);
const shadowing = declaredKeys.filter((k) => k === remixPrefix || k === catPrefix);
check(
  'no tool slug shadows a route prefix',
  shadowing.length === 0,
  `${shadowing.join(', ')} — would swallow every ${remixPrefix}/ link ever sent`,
);

// The router has to know about the prefix, or every shared link 404s to the
// dashboard. Cheap to assert, and invisible to tsc.
const routeSrc = files.find((f) => f.rel.endsWith(path.join('lib', 'useHashRoute.ts')))?.text ?? '';
check(
  'the router recognises remix links',
  /REMIX_ROUTE_PREFIX/.test(routeSrc) && /parseRemix\(/.test(routeSrc) && /setStudioPending\(/.test(routeSrc),
  'a #/do/… link would resolve to nothing — the router must parse it AND record it',
);

// --- 11. A declared quick axis is rendered from the declaration, once --------
//
// `quick` exists so the tool screen and the front door's Tweak sheet draw the
// same controls from one list. That only holds while the screen renders
// <QuickControls>; the moment it also hand-writes a chip row for a declared key
// there are two copies again, and the second one is the one that will quietly
// lose an option.
//
// Detected by looking for a screen patching a key its registry entry already
// declares — `patch({ face: …})` in a file whose tool declares a `face` axis.

const appSrc = fs.readFileSync(path.join(SRC, 'App.tsx'), 'utf8');
// `  render: RenderFeature,` in App.tsx's FEATURES map — the one place that
// already maps a tool to the component that draws it.
const screenOf = {};
for (const m of stripComments(appSrc).matchAll(/^\s{2}([a-zA-Z]+): (\w+Feature),$/gm)) screenOf[m[1]] = m[2];

const quickKeys = {};
for (const b of defBlocks) {
  const key = b.match(/key: '([^']+)'/)?.[1];
  const block = b.match(/\n  quick: \[([\s\S]*?)\n  \],/)?.[1];
  if (!key || !block) continue;
  quickKeys[key] = [...block.matchAll(/key: '([^']+)'/g)].map((m) => m[1]);
}
check('quick axes are declared', Object.keys(quickKeys).length > 0, `${Object.keys(quickKeys).length} tool(s)`);

const dupes = [];
for (const [tool, keys] of Object.entries(quickKeys)) {
  const component = screenOf[tool];
  const screen = files.find((f) => new RegExp(`export function ${component}\\b`).test(f.text));
  if (!component || !screen) {
    dupes.push(`${tool}: no screen found for ${component ?? '(unmapped)'}`);
    continue;
  }
  const text = stripComments(screen.text);
  if (!/<QuickControls\b/.test(text)) {
    dupes.push(`${screen.rel}: declares quick axes but never renders <QuickControls>`);
    continue;
  }
  for (const k of keys) {
    // `patch({ face: v })` / `patch({ face: next })` — the screen writing the
    // same setting the declaration already owns.
    if (new RegExp(`patch\\(\\{\\s*${k}:`).test(text)) dupes.push(`${screen.rel}: hand-writes a control for "${k}"`);
  }
}
check(
  'no screen hand-writes a control for a declared quick axis',
  dupes.length === 0,
  dupes.join('\n      ') + '  — render it from the declaration, or drop it from quick',
);

// --- 12. "All tools" means all of them ---------------------------------------
//
// The nav row said "Every tool, with full controls" and the screen behind it
// listed FOUR of thirty — it was a pipeline map over the tools that happened to
// declare a `stage`, and the promise had been wrong since the day the fifth
// tool shipped. Nothing caught it because nothing tied the destination's
// contents to the registry: the filter was legitimate code doing exactly what
// it said, on a field only four tools set.
//
// So the rule is about the SHAPE of that screen, not its output: the index must
// map over the derived category list, and it must not filter the tools inside
// one. A `.filter(` there is how four-of-thirty happens again.

const index = files.find((f) => f.rel.endsWith(path.join('home', 'ToolIndex.tsx')));
check('the tool index exists', Boolean(index));
const indexText = stripComments(index?.text ?? '');
check(
  'the tool index enumerates every category',
  /CATEGORIES\.map\(/.test(indexText),
  'it must map over the derived category list, not a hand-picked subset',
);
check(
  'and every tool inside one',
  /category\.features\.map\(/.test(indexText) && !/category\.features\s*\n?\s*\.filter\(/.test(indexText),
  'a filter here is how "All tools" came to mean four of thirty',
);
check(
  'the dashboard it replaced is gone',
  !fs.existsSync(path.join(SRC, 'features', 'home', 'DashboardFeature.tsx')),
  'two home screens is one too many',
);

// The nav promises a count; the count comes from the registry rather than a
// number somebody typed next to the word "All".
const navFile = files.find((f) => f.rel.endsWith(path.join('Layout', 'Sidebar.tsx')));
check(
  'the nav counts the tools rather than claiming a number',
  /count: TOOL_COUNT/.test(stripComments(navFile?.text ?? '')),
  'a hand-typed count is a promise that rots on the next tool',
);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} registry checks passed`);
process.exit(failed === 0 ? 0 : 1);
