// End-to-end verification of both image engines against a `vite preview` build
// (default http://localhost:4173). All network calls are mocked — no API keys
// or credits needed. Run: node qa/verifyEngines.cjs
//
// Covers: the Settings engine picker (Gemini ⇄ kie.ai), the full kie.ai task
// flow (upload → createTask → poll → result fetch), the Gemini flow, the
// overhauled prompts (no-text guard, footprint contract, elevation
// grammar/lighting fix, interior shell lock), and the editable prompt boxes.

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const fs = require('fs');

const BASE = process.env.QA_BASE_URL || 'http://localhost:4173/';
const PLAN = path.join(__dirname, '..', 'test-assets', 'sample-plan.png');
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' };

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

(async () => {
  const exe = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    : undefined;
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const page = await browser.newContext({ viewport: { width: 1440, height: 1100 } }).then((c) => c.newPage());
  const perr = [];
  page.on('pageerror', (e) => perr.push(String(e)));

  // --- Gemini mock -----------------------------------------------------------
  const geminiBodies = [];
  // Set to make the mock answer like a search-grounded generation.
  const mock = { sources: false };
  await page.route('**generativelanguage.googleapis.com/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS, body: '' });
    geminiBodies.push(r.request().postData() || '');
    const grounding = mock.sources
      ? {
          groundingMetadata: {
            groundingChunks: [
              { web: { uri: 'https://example.org/history', title: 'Site history' } },
              { web: { uri: 'https://example.org/plan', title: 'Survey plan' } },
            ],
          },
        }
      : {};
    return r.fulfill({
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify({
        candidates: [
          {
            content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG_1PX.toString('base64') } }] },
            finishReason: 'STOP',
            ...grounding,
          },
        ],
      }),
    });
  });

  // --- kie.ai mocks ----------------------------------------------------------
  const kie = { uploads: 0, createBodies: [], polls: 0 };
  await page.route('**kieai.redpandaai.co/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS, body: '' });
    kie.uploads += 1;
    return r.fulfill({
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify({ code: 200, msg: 'success', data: { downloadUrl: 'https://kie-cdn.mock/in.png' } }),
    });
  });
  await page.route('**api.kie.ai/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS, body: '' });
    const url = r.request().url();
    if (url.includes('createTask')) {
      kie.createBodies.push(r.request().postData() || '');
      return r.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify({ code: 200, msg: 'success', data: { taskId: 'task-qa-1' } }),
      });
    }
    if (url.includes('recordInfo')) {
      kie.polls += 1;
      const done = kie.polls >= 2; // first poll: still generating; second: success
      return r.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify({
          code: 200,
          msg: 'success',
          data: done
            ? { state: 'success', resultJson: JSON.stringify({ resultUrls: ['https://kie-cdn.mock/out.png'] }) }
            : { state: 'generating' },
        }),
      });
    }
    return r.fulfill({ status: 404, headers: CORS, body: '{}' });
  });
  await page.route('**kie-cdn.mock/**', (r) =>
    r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG_1PX }),
  );

  // --- Boot: open Settings from the bar --------------------------------------
  //
  // The drawer used to open ITSELF on load whenever no key was set, and this
  // suite relied on that. It does not any more: the key is asked at the first
  // generation, in the result slot, by the studio's key gate. So the way in is
  // the bar button — which is also the only way a user who wants to configure
  // an engine early can get there, and therefore the thing worth asserting.
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  check(
    'the settings drawer does not open itself on first load',
    (await page.locator('[role="dialog"]').count()) === 0,
  );
  await page.getByRole('button', { name: /Connect key|API keys/ }).first().click();
  await page.waitForSelector('[role="dialog"]');

  // 1. Engine picker exists with both engines.
  const geminiRadio = page.getByRole('radio', { name: /Google Gemini/ });
  const kieRadio = page.getByRole('radio', { name: /kie\.ai/ });
  check('engine picker shows Gemini + kie.ai', (await geminiRadio.count()) === 1 && (await kieRadio.count()) === 1);

  // 2. Gemini path first.
  await page.fill('#api-key', 'AIza-qa-test');
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.locator('[role="dialog"] button[aria-label="Close settings"]').click();
  await page.waitForTimeout(250);
  const enginePill = page.locator('button[title="API keys"], button[title="Connect your API key to generate"]').first();
  check('header pill shows Nano Banana Pro on Gemini', /Nano Banana Pro/i.test(await enginePill.innerText()));

  // Destinations are addressed by identity, never by position. The sidebar lists
  // CATEGORIES now, so a tool has no row of its own — it is reached by its route,
  // and its presence in a category rail is asserted separately (section 12), which
  // is a stronger reachability check than clicking one row at a time.
  // `.first()` because the mobile drawer renders a second Sidebar.
  const navTo = async (key) => {
    await page.goto(BASE + '#/' + key, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(350);
  };
  // Categories left the sidebar when the front door took over finding tools.
  // They are reached by route, and from the tool index — both asserted below.
  const catTo = async (key) => {
    await page.goto(`${BASE}#/c/${key}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(350);
  };
  const nav = page.locator('nav[aria-label="Features"] button');
  await navTo('render');

  // 3. The Isometric tab now has the editable prompt box.
  const promptBox = page.locator('#render-prompt');
  check('isometric tab has a prompt box', (await promptBox.count()) === 1);
  const autoPrompt = await promptBox.inputValue();
  // The isometric prompt must carry the FOOTPRINT contract, not just interior
  // preservation — protecting rooms while never naming the building's outline
  // is what let the model square off an L-shaped plan.
  check('isometric prompt names the footprint', /outer wall silhouette/i.test(autoPrompt));
  check('isometric prompt forbids squaring off an irregular plan', /do NOT simplify an irregular footprint/i.test(autoPrompt));
  check('isometric prompt treats symbols as geometry', /GEOMETRY, NOT ANNOTATION/i.test(autoPrompt));
  check('isometric prompt strips plan labels', /no text or numbers anywhere/i.test(autoPrompt));

  // 4. Edited prompt → Reset appears and restores the suggestion.
  await promptBox.fill('my custom prompt');
  const resetBtn = page.getByRole('button', { name: /^Reset$/ });
  check('editing the prompt reveals Reset', await resetBtn.isVisible());
  await resetBtn.click();
  check('Reset restores the auto prompt', /outer wall silhouette/i.test(await promptBox.inputValue()));

  // 5. Gemini generation end-to-end with the sample plan.
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForSelector('figure img[src^="data:image"]', { timeout: 20000 });
  check('gemini generation renders an output', true);
  const gBody = geminiBodies[geminiBodies.length - 1] || '';
  check('gemini request carried the no-text guard', /watermark, signature, caption or stray text/.test(gBody));
  // An isometric of ANY plan is a ~4:3 landscape composition; inheriting a
  // portrait plan's canvas is what pressured the model to compact the footprint.
  check('isometric request pins a 4:3 canvas', /"aspectRatio":"4:3"/.test(gBody));
  check('isometric request carried the footprint lock', /outer wall silhouette/.test(gBody));

  // 5b. The 2D furnished plan pins NOTHING — following the input's own ratio is
  //     correct for a flat top-down view. This exercises the normalizer's omit
  //     path, which the isometric run above cannot.
  await page.getByRole('button', { name: '2D furnished plan' }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(1200);
  const planBody = geminiBodies[geminiBodies.length - 1] || '';
  check('flat plan request omits imageConfig entirely', !/"imageConfig"/.test(planBody));
  check('flat plan request is still a real generation', /"inlineData"/.test(planBody));
  await page.getByRole('button', { name: '3D isometric' }).click();
  await page.waitForTimeout(250);

  // 6. Switch to kie.ai and generate an elevation.
  await enginePill.click();
  await page.waitForSelector('[role="dialog"]');
  await page.getByRole('radio', { name: /kie\.ai/ }).click();
  await page.fill('#kie-key', 'kie-qa-test');
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.locator('[role="dialog"] button[aria-label="Close settings"]').click();
  await page.waitForTimeout(250);
  check('header pill shows Nano Banana 2 · kie.ai', /Nano Banana 2/i.test(await enginePill.innerText()));

  await navTo('elevation');
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForSelector('figure img[src^="data:image"]', { timeout: 30000 }); // includes two 3s polls
  check('kie.ai generation renders an output', true);
  check('kie.ai input was uploaded first', kie.uploads >= 1, `${kie.uploads} uploads`);
  const kBody = kie.createBodies[kie.createBodies.length - 1] || '';
  check('kie.ai task uses model nano-banana-2', /"model":"nano-banana-2"/.test(kBody));
  check('kie.ai task carries the uploaded image URL', /kie-cdn\.mock\/in\.png/.test(kBody));
  check('elevation prompt grammar fixed', /elevation of the building shown in the input image/.test(kBody));
  check('elevation lighting scoped to the flat façade', /applied purely as illumination/.test(kBody));

  // 7. Interior: the shell lock. Staging must add furniture only — the old prompt
  //    asked for "curtains" in the same breath as "windows must not change", and
  //    the model settled that by draping blank walls, i.e. inventing windows.
  await navTo('interior');
  const interiorPrompt = page.locator('#interior-prompt');
  await page.getByRole('button', { name: 'Stage (furnish empty room)' }).click();
  await page.waitForTimeout(200);
  const stagePrompt = await interiorPrompt.inputValue();
  check('stage prompt locks the shell', /LOCK THE SHELL/.test(stagePrompt));
  check('stage prompt keeps blank walls blank', /A wall that is blank in the photo stays blank/.test(stagePrompt));
  check('stage prompt no longer asks for curtains', !/\badd\b[^.]*\bcurtains\b/i.test(stagePrompt));
  check(
    'stage prompt allows only movable objects',
    /could be carried back out of the room again/.test(stagePrompt),
  );
  check('stage prompt audits the openings at the end', /opening by opening/.test(stagePrompt));

  await page.getByRole('button', { name: 'Renovate' }).click();
  await page.waitForTimeout(200);
  check(
    'renovate may change finishes but not openings',
    /add no window or opening that is not in the photo/.test(await interiorPrompt.inputValue()),
  );

  await page.getByRole('button', { name: 'Restyle' }).click();
  await page.waitForTimeout(200);
  const restylePrompt = await interiorPrompt.inputValue();
  check('restyle prompt carries the same shell lock', /LOCK THE SHELL/.test(restylePrompt));
  check(
    'restyle may re-finish a wall but not move one',
    /Recolouring or re-finishing a wall or floor is fine; moving, adding or removing one is not/.test(restylePrompt),
  );

  // 8. The Concept Presentation tab is gone — nav, deep link and output cards.
  const navNames = await nav.allInnerTexts();
  check('sidebar has no Presentation destination', !/presentation/i.test(navNames.join(' ')));
  check(
    'every nav row carries a stable data-nav handle',
    (await page.locator('nav[aria-label="Features"] [data-nav]').first().count()) === 1,
  );
  await page.goto(BASE + '#/presentation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  check(
    'a stale #/presentation deep link does not crash or blank the app',
    (await page.locator('nav[aria-label="Features"] button').count()) > 0,
  );
  check(
    'output cards no longer offer "Add to presentation"',
    (await page.locator('[title="Add to presentation"]').count()) === 0,
  );

  // 9. First run on a phone must show the app, not a full-screen key form.
  //    The Settings drawer is w-full below 448px, so auto-opening it hid every
  //    use case behind a form on the one viewport where that is fatal.
  const mob = await browser
    .newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    .then((c) => c.newPage());
  const mobErr = [];
  mob.on('pageerror', (e) => mobErr.push(String(e)));
  await mob.goto(BASE, { waitUntil: 'domcontentloaded' });
  await mob.waitForTimeout(700);
  check('mobile first run does not auto-open Settings', (await mob.locator('[role="dialog"]').count()) === 0);
  // The evidence moved with the front door: the bare hash is the studio now, so
  // what a phone must see first is the drop zone, not the dashboard's pipeline.
  // The dashboard still exists and is still asserted — one route along.
  check(
    'mobile first run shows the drop zone',
    (await mob.locator('[data-studio-drop]').count()) === 1,
  );
  check(
    'and offers the samples that need no key',
    (await mob.locator('[data-sample]').count()) === 4,
  );
  await mob.goto(BASE + '#/home', { waitUntil: 'domcontentloaded' });
  await mob.waitForTimeout(400);
  check(
    'the full tool list is still one route away',
    (await mob.locator('[data-index-tool]').count()) > 0,
  );
  await mob.goto(BASE, { waitUntil: 'domcontentloaded' });
  await mob.waitForTimeout(300);
  const connect = mob.getByRole('button', { name: /Connect key/ });
  check('mobile top bar offers a visible Connect key button', await connect.isVisible());
  await connect.click();
  await mob.waitForTimeout(400);
  check('tapping Connect key opens Settings on mobile', (await mob.locator('[role="dialog"]').count()) === 1);
  check('no mobile page crashes', mobErr.length === 0, mobErr.slice(0, 2).join(' | '));

  // 10. The hardened request shape. These pin the wire format so the multi-image
  //     and text-only tools coming next cannot regress it silently.
  const gBodies = geminiBodies.join('\n');
  check(
    'gemini sends the input as an inlineData part',
    /"inlineData"/.test(gBodies),
  );
  check(
    'a single-input run sends exactly one image part',
    (geminiBodies[0].match(/"inlineData"/g) || []).length === 1,
  );
  check(
    'kie omits image_input only when there is nothing to send',
    kie.createBodies.every((b) => /"image_input":\[/.test(b)),
  );
  check('kie sends a resolution', kie.createBodies.every((b) => /"resolution":"/.test(b)));

  // 11. The four new Interiors tools. Each is asserted against its own live
  //     prompt box, which is also what proves the registry wired it into the
  //     nav, the route and the shell — a tool that is unreachable fails here.
  const NEW_TOOLS = [
    ['declutter', [/LOCK THE SHELL/, /Do not invent a new floor or a feature wall/]],
    ['placeObject', [/TWO IMAGES ARE ATTACHED/, /not something in its style/, /Change NOTHING else/]],
    ['targetedSwap', [/Make ONE change/, /LOCK EVERYTHING ELSE/]],
    ['specSheet', [/knolling-style flat-lay on a plain white background/, /not a mood board of similar products/]],
  ];
  for (const [key, patterns] of NEW_TOOLS) {
    await navTo(key);
    const box = page.locator(`#${key}-prompt`);
    check(`${key} is reachable and has its prompt box`, (await box.count()) === 1);
    const text = (await box.count()) ? await box.inputValue() : '';
    for (const re of patterns) {
      check(`${key} prompt carries ${re.source.slice(0, 40)}`, re.test(text));
    }
  }

  // The two-input tool must render a SECOND dropzone, not just a reference picker.
  await navTo('placeObject');
  check('placeObject offers two separate image inputs', (await page.locator('input[type=file]').count()) >= 2);

  // Massing to Render is the second two-image tool, and the order matters just
  // as much: the prompt says the FIRST image is the design and the SECOND only a
  // mood. Two dropzones, and the second one is named as the reference.
  await navTo('massingRender');
  check('massingRender offers two separate image inputs', (await page.locator('input[type=file]').count()) >= 2);
  check(
    'and names the second one as the reference',
    /the reference/i.test(await page.locator('main').innerText()),
  );

  // 12. The navigation shell. The sidebar lists CATEGORIES now — a row per tool
  //     was right at five and wrong at eleven — so reachability is two hops, and
  //     both have to hold or a tool ships invisible.
  // Strip comments before parsing, or a `//` note inside FEATURE_KEYS is read as
  // a feature key and this check fails on a tool that does not exist. Same bug
  // qa/registryLint.cjs has its own guard against — two parsers of one file.
  const keysSrc = fs
    .readFileSync(path.join(__dirname, '..', 'src', 'features', 'registry', 'keys.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
  const KEYS = (keysSrc.match(/FEATURE_KEYS = \[([^\]]+)\]/)?.[1] ?? '')
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);

  await page.goto(BASE + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const navKeys = await page.locator('nav[aria-label="Features"] [data-nav]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-nav')),
  );
  // Three fixed destinations. The categories moved into the index, one route
  // along, because nobody navigates a taxonomy to find a tool any more.
  check('the nav is three destinations, not nine', navKeys.length === 3, navKeys.join(', '));
  check('and none of them is a category row', navKeys.every((k) => !k.startsWith('cat:')));

  // "All tools" has to mean all of them. It said "Every tool, with full
  // controls" over a screen listing FOUR of thirty for as long as there were
  // more than four — a promise nothing checked until this line.
  const indexed = await page.locator('[data-index-tool]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-index-tool')),
  );
  check(
    'the tool index lists every registered tool',
    indexed.length === KEYS.length,
    `${indexed.length} listed, ${KEYS.length} registered — missing: ${KEYS.filter((k) => !indexed.includes(k)).join(', ')}`,
  );
  check('every category is a section in it', (await page.locator('[data-index-category]').count()) > 0);
  check('and each one links to its batch screen', (await page.locator('[data-index-batch]').count()) > 0);
  check(
    'no tool has its own sidebar row',
    KEYS.every((k) => !navKeys.includes(k)),
    navKeys.join(','),
  );

  // Walk every category rail and collect the tools it offers. The union must be
  // every registered tool, and no tool may appear twice — this is what proves a
  // new tool is reachable without anyone remembering to add it to a nav list.
  //
  // The walk starts from the tool index now that the categories live there, so
  // it also proves the index's batch links go where they say.
  const catKeys = await page.locator('[data-index-batch]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-index-batch')),
  );
  check('the index offers a batch link per category', catKeys.length > 0, catKeys.join(','));
  const seen = [];
  for (const row of catKeys) {
    await page.goto(`${BASE}#/c/${row}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const tools = await page
      .locator('[data-tool]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-tool')));
    seen.push(...tools);
  }
  const missing = KEYS.filter((k) => !seen.includes(k));
  const dupes = seen.filter((k, i) => seen.indexOf(k) !== i);
  check('every registered tool appears in a category rail', missing.length === 0, `missing: ${missing.join(',')}`);
  check('no tool appears in two rails', dupes.length === 0, dupes.join(','));

  // 13. Batch Synthesize and the cost guard. Back on Gemini: its mock answers
  //     instantly, so a five-tool queue does not spend a minute on kie's polls.
  await enginePill.click();
  await page.waitForSelector('[role="dialog"]');
  await page.getByRole('radio', { name: /Google Gemini/ }).click();
  await page.fill('#api-key', 'AIza-qa-test');
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.locator('[role="dialog"] button[aria-label="Close settings"]').click();
  await page.waitForTimeout(250);

  await page.goto(BASE + '#/c/interiors', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  check('a category deep link opens its tool rail', (await page.locator('[data-tool]').count()) > 0);

  // A tool needing a second image of its own can never run from the shared
  // dropzone, and the rail has to say so rather than silently dropping it.
  const placeCard = page.locator('[data-tool="placeObject"] [role="checkbox"]');
  check('a two-image tool is not selectable in the rail', await placeCard.isDisabled());
  check(
    'and the rail says why',
    /second image/i.test(await page.locator('[data-tool="placeObject"]').innerText()),
  );

  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);

  // Two tools is under the guard — it runs on the click, no dialog.
  await page.locator('[data-tool="declutter"] [role="checkbox"]').click();
  await page.locator('[data-tool="specSheet"] [role="checkbox"]').click();
  const before = geminiBodies.length;
  await page.getByRole('button', { name: /^Synthesize$/ }).click();
  await page.waitForTimeout(300);
  check('a small batch runs without a confirmation', (await page.locator('[role="alertdialog"]').count()) === 0);
  await page.waitForTimeout(2500);
  check('a two-tool batch sent two generations', geminiBodies.length - before === 2, `${geminiBodies.length - before}`);

  // Each tool in the batch must send its OWN prompt, not a shared one — this is
  // what proves the batch runs each tool rather than one prompt N times.
  const batchBodies = geminiBodies.slice(before);
  check(
    'each batched tool sent its own prompt',
    batchBodies.some((b) => /Do not invent a new floor or a feature wall/.test(b)) &&
      batchBodies.some((b) => /knolling-style flat-lay/.test(b)),
  );

  // Select all always confirms, and the dialog states the count.
  await page.getByRole('button', { name: /^Select all$/ }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /^Synthesize/ }).click();
  await page.waitForTimeout(300);
  const dialog = page.locator('[role="alertdialog"]');
  check('Select all always asks first', (await dialog.count()) === 1);
  check('the confirmation states how many images it will generate', /Generate \d+ images\?/.test(await dialog.innerText()));
  await dialog.getByRole('button', { name: /^Cancel$/ }).click();
  await page.waitForTimeout(200);
  check('cancelling the confirmation generates nothing', (await page.locator('[role="alertdialog"]').count()) === 0);

  // 14. A tool screen leads back to its category — the sidebar no longer has a
  //     row for it, so without this you open a tool and are nowhere.
  await page.locator('[data-open-tool="declutter"]').click();
  await page.waitForTimeout(400);
  check('the rail opens the tool it names', (await page.locator('#declutter-prompt').count()) === 1);
  await page.locator('[data-back-to-category="interiors"]').click();
  await page.waitForTimeout(400);
  check('a tool screen leads back to its category', (await page.locator('[data-tool]').count()) > 0);
  check('and the category deep link is in the URL', /#\/c\/interiors$/.test(page.url()));

  // 15. Input capabilities: an extra image slot, a text-only tool, and the
  //     region marker. Each is asserted through the one tool that consumes it —
  //     a capability with no consumer is a capability nothing tests.

  // 15a. Place Object's product shot lives in the STORE now. It used to be
  //      component state, and App.tsx remounts the routed feature on every tab
  //      change, so it vanished the moment you looked at another tool.
  await navTo('placeObject');
  const zones = page.locator('input[type=file]');
  check('a tool with an extra input slot renders two dropzones', (await zones.count()) >= 2);
  await zones.nth(1).setInputFiles(PLAN);
  await page.waitForTimeout(500);
  const imagesAfterUpload = await page.locator('img[src^="data:"]').count();
  await navTo('declutter');
  await navTo('placeObject');
  check(
    'the extra input survives navigating away and back',
    (await page.locator('img[src^="data:"]').count()) >= imagesAfterUpload,
  );

  // Both images go out, in the order the prompt names them.
  await zones.nth(0).setInputFiles(PLAN);
  await page.waitForTimeout(500);
  const beforeTwo = geminiBodies.length;
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(2000);
  check('a two-input run actually fired', geminiBodies.length > beforeTwo);
  const twoBody = geminiBodies[geminiBodies.length - 1] || '';
  check(
    'a two-input run sends two image parts',
    (twoBody.match(/"inlineData"/g) || []).length === 2,
    `${(twoBody.match(/"inlineData"/g) || []).length}`,
  );

  // 15b. Massing's image is OPTIONAL. It began as the one text-only tool and
  //      the typed path must still work exactly as it did — so this asserts
  //      that path first, then what attaching an image changes, and in which
  //      direction for each role.
  await navTo('massing');
  check('an optional-image tool shows exactly one dropzone', (await page.locator('input[type=file]').count()) === 1);
  const massingPrompt = page.locator('#massing-prompt');
  check('it still has its prompt box', (await massingPrompt.count()) === 1);
  check('massing prompt refuses materials and glazing', /no materials, no brick, no timber, no glazing/i.test(await massingPrompt.inputValue()));
  check('with no image, the prompt claims none', !/IMAGE IS ATTACHED/.test(await massingPrompt.inputValue()));
  check('with no image, there is no "the image is" choice', (await page.locator('[data-massing-image-role]').count()) === 0);
  const genMassing = page.getByRole('button', { name: /^Generate$/ });
  check('an EMPTY optional dropzone does not block — the form does', await genMassing.isDisabled());
  await page.fill('#massing-brief', 'A 40-unit residential block with ground-floor retail');
  await page.waitForTimeout(300);
  check('filling the form unblocks it with no image at all', !(await genMassing.isDisabled()));
  const beforeText = geminiBodies.length;
  await genMassing.click();
  await page.waitForTimeout(2000);
  check('a no-image run fired', geminiBodies.length > beforeText);
  const textBody = geminiBodies[geminiBodies.length - 1] || '';
  check('a no-image run sends NO image part', !/"inlineData"/.test(textBody));
  check('a no-image run carries what the user typed', /40-unit residential block/.test(textBody));

  // Attach a sketch: the role choice appears, the prompt follows the drawing,
  // and the brief stops being required — the drawing IS the brief.
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(600);
  check('attaching an image shows the "the image is" choice', (await page.locator('[data-massing-image-role]').count()) === 1);
  check('a sketch is followed, not reinterpreted', /SKETCH of this massing[\s\S]*BUILD EXACTLY THAT/.test(await massingPrompt.inputValue()));
  await page.fill('#massing-brief', '');
  await page.waitForTimeout(300);
  check('with a sketch, an empty brief no longer blocks', !(await genMassing.isDisabled()));
  const beforeSketch = geminiBodies.length;
  await genMassing.click();
  await page.waitForTimeout(2000);
  check('a sketch run fired', geminiBodies.length > beforeSketch);
  const sketchBody = geminiBodies[geminiBodies.length - 1] || '';
  check('a sketch run sends the image', (sketchBody.match(/"inlineData"/g) || []).length === 1);

  // Switch to reference: the prompt borrows the idea and refuses the copy, and
  // the brief is required again — a precedent says nothing about THIS project.
  await page.locator('[data-massing-image-role]').getByRole('button', { name: /reference/i }).click();
  await page.waitForTimeout(300);
  const refText = await massingPrompt.inputValue();
  check('a reference lends its strategy', /REFERENCE[\s\S]*Do not reproduce it/.test(refText));
  check('and is checked against being copied', /reads as a copy of that building/.test(refText));
  check('with a reference, an empty brief blocks again', await genMassing.isDisabled());

  // Leave the tool as it was found. The store keeps a tool's image across
  // navigation, and a later section reads every tool's DEFAULT prompt off the
  // live screen — an image left here would make it read the reference prompt.
  await page.getByRole('button', { name: 'Remove image' }).click();
  await page.waitForTimeout(300);
  check('removing the image takes the prompt back to no-image', !/IMAGE IS ATTACHED/.test(await massingPrompt.inputValue()));

  // The new category exists only because this tool put it there.
  await page.goto(BASE + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  check(
    'a new category appears once its first tool exists',
    (await page.locator('[data-index-category="concept"]').count()) === 1,
  );

  // 15c. The region marker. Dragging a box must change the PROMPT — an
  //      unexplained red rectangle is just something for the model to reproduce.
  await navTo('targetedSwap');
  const swapPrompt = page.locator('#targetedSwap-prompt');
  check('an unmarked tool says nothing about a red rectangle', !/RED RECTANGLE/.test(await swapPrompt.inputValue()));
  check('no marker canvas before there is an image', (await page.locator('[data-marker-canvas]').count()) === 0);
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(600);
  const canvas = page.locator('[data-marker-canvas]');
  check('a marker-capable tool offers the canvas once an image is there', (await canvas.count()) === 1);

  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  check('dragging leaves a mark on the image', (await page.getByRole('button', { name: /Clear mark/ }).count()) === 1);
  const markedPrompt = await swapPrompt.inputValue();
  check('marking the image tells the prompt about it', /RED RECTANGLE/.test(markedPrompt));
  check('and the prompt orders the box erased from the output', /finished image contains no red box/i.test(markedPrompt));

  // The prompt changing is half of it. The box has to reach the WIRE — it is
  // burned into the pixels at request time, and a prompt that talks about a red
  // rectangle the model cannot see is worse than no marker at all.
  await page.fill('#swap-element', 'the pendant');
  await page.fill('#swap-replacement', 'a brass dome');
  await page.waitForTimeout(300);
  const beforeMarked = geminiBodies.length;
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(2500);
  check('a marked run fired', geminiBodies.length > beforeMarked);
  const markedBody = geminiBodies[geminiBodies.length - 1] || '';

  await page.getByRole('button', { name: /Clear mark/ }).click();
  await page.waitForTimeout(400);
  check('clearing the mark takes it back out of the prompt', !/RED RECTANGLE/.test(await swapPrompt.inputValue()));

  const beforeClean = geminiBodies.length;
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(2500);
  check('an unmarked run fired', geminiBodies.length > beforeClean);
  const cleanBody = geminiBodies[geminiBodies.length - 1] || '';

  const payload = (body) => (body.match(/"data":"([^"]+)"/) || [])[1] || '';
  check(
    'the marked run sends different pixels from the unmarked one',
    payload(markedBody).length > 0 && payload(markedBody) !== payload(cleanBody),
    'same bytes means burnMarker never ran',
  );

  // 16. Plans & Drawings. Every tool here outputs an orthographic drawing, and
  //     the shared failure is that the model's prior for "building image" is a
  //     photograph — so each one is checked for its own projection lock plus the
  //     direction-specific instruction that keeps it from becoming another tool.
  const DRAWING_TOOLS = [
    // Deliberately NOT /outer wall silhouette/: reusing the isometric's footprint
    // lock here demanded an outline identical to a freehand sketch, which
    // contradicted this tool's whole job of straightening it.
    ['sketchPlan', [/Keep the outline’s topology exactly/, /NOT reshaping the plan/, /quarter-circle swing arc/]],
    ['cadElevation', [/UNDO THE PERSPECTIVE/, /this is one flat face and nothing else/]],
    ['section', [/sawn straight through/, /NOT an elevation/, /you have drawn an elevation/]],
    ['renderToPlan', [/BE HONEST ABOUT WHAT YOU CANNOT SEE/, /A plain guess is correct here/]],
  ];
  for (const [key, patterns] of DRAWING_TOOLS) {
    await navTo(key);
    const box = page.locator(`#${key}-prompt`);
    check(`${key} is reachable and has its prompt box`, (await box.count()) === 1);
    const text = (await box.count()) ? await box.inputValue() : '';
    check(`${key} locks the projection`, /no vanishing point/i.test(text));
    for (const re of patterns) check(`${key} prompt carries ${re.source.slice(0, 42)}`, re.test(text));
  }

  // Annotation is the axis every drawing tool shares. Text on a generated
  // drawing is a liability, so "No text" must really mean no text, and units
  // must not leak into a drawing that carries no dimensions.
  await navTo('sketchPlan');
  const planPrompt = page.locator('#sketchPlan-prompt');
  await page.getByRole('button', { name: /^No text$/ }).click();
  await page.waitForTimeout(300);
  const plain = await planPrompt.inputValue();
  check('no-text mode carries the no-text guard', /watermark, signature, caption or stray text/.test(plain));
  check('no-text mode asks for no labels', !/Label each room/.test(plain));
  check('no-text mode names no units', !/millimetres|feet and inches/.test(plain));

  await page.getByRole('button', { name: 'Labels + dimensions' }).click();
  await page.waitForTimeout(300);
  const dimensioned = await planPrompt.inputValue();
  check('dimensioned mode asks for dimension lines', /add a dimension line along each outer face/i.test(dimensioned));
  check('dimensioned mode names the units', /millimetres/.test(dimensioned));
  await page.getByRole('button', { name: 'Imperial (ft/in)' }).click();
  await page.waitForTimeout(300);
  check('switching units switches the clause', /feet and inches/.test(await planPrompt.inputValue()));

  // A tool that must infer says so ON the output, where scepticism is useful —
  // which means NOT before there is an output to be sceptical about.
  await navTo('renderToPlan');
  const mainText = () => page.locator('main').innerText();
  check(
    'the accuracy warning is absent before there is any output',
    !/part measurement, part inference/i.test(await mainText()),
  );
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(2500);
  check(
    'a tool that infers shows its accuracy warning once it has one',
    /part measurement, part inference/i.test(await mainText()),
  );

  // The warning varies with settings: only the rear face of a CAD elevation is
  // reconstructed, so only that face carries one.
  await navTo('cadElevation');
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(2500);
  check('a face that IS in the input carries no warning', !/reconstructed from the volume/i.test(await mainText()));
  await page.getByRole('button', { name: /^Rear$/ }).click();
  await page.waitForTimeout(400);
  check('the reconstructed rear face does carry one', /reconstructed from the volume/i.test(await mainText()));

  // Outputs must be labelled with the tool, never the fall-through 'Render'.
  check(
    'a drawing tool labels its outputs with its own name, not "Render"',
    !/Render — variation/.test(await mainText()),
  );

  // 17. Visualization. Every tool here takes a finished image and changes ONE
  //     property of it, so each is checked for the shared lock naming the right
  //     exception plus its own load-bearing instruction.
  const VIZ_TOOLS = [
    ['wireframeRender', null, [/LOCK THE GEOMETRY/, /look better balanced/]],
    ['renderRefine', 'the quality of the rendering itself', [/not making a new picture/]],
    ['atmosphere', 'the light, the sky and the season', [/Recompute everything that follows from that light/]],
    ['facadeMaterial', 'the material of the facade', [/A new material does not get new openings/]],
    ['humanScale', 'the people, vehicles and planting', [/shorter than a standard door opening/, /Nobody poses, nobody faces the lens/]],
    ['multiView', null, [/every panel shows THE SAME BUILDING/, /is a complete failure of this task/]],
    ['reflection', 'what the glazing is doing', [/Reflections break at every mullion/]],
    ['upscale', 'the amount of fine detail resolved', [/resolve detail, do not invent it/]],
  ];
  for (const [key, exception, patterns] of VIZ_TOOLS) {
    await navTo(key);
    const box = page.locator(`#${key}-prompt`);
    check(`${key} is reachable and has its prompt box`, (await box.count()) === 1);
    const text = (await box.count()) ? await box.inputValue() : '';
    if (exception) {
      check(`${key} locks everything except ${exception.slice(0, 30)}`, text.includes(`LOCK EVERYTHING EXCEPT ${exception}`));
    }
    for (const re of patterns) check(`${key} prompt carries ${re.source.slice(0, 42)}`, re.test(text));
  }

  // Wireframe to Render has an interior branch (build plan, Phase 0): the
  // exterior prompt counts storeys; a room's failure is being FURNISHED.
  await navTo('wireframeRender');
  const wirePrompt = page.locator('#wireframeRender-prompt');
  check('wireframe defaults to the exterior prompt', /architectural render from the untextured 3D model/.test(await wirePrompt.inputValue()));
  await page.getByRole('button', { name: /^An interior$/ }).click();
  await page.waitForTimeout(300);
  const wireInt = await wirePrompt.inputValue();
  check('choosing "An interior" switches to the interior prompt', /interior render from the untextured 3D model/.test(wireInt));
  check('which forbids furnishing what is not modelled', /Do NOT add furniture, rugs, cushions, art, decor/.test(wireInt));
  check('and counts the objects again before finishing', /object by object/.test(wireInt));
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  const wireBefore = geminiBodies.length;
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(2500);
  const wireBody = geminiBodies.slice(wireBefore).join('');
  check('the interior prompt is what reaches the engine', /object by object/.test(wireBody));
  check('a tool that does not ask for search sends no tools field', wireBody.length > 0 && !/"tools"/.test(wireBody));
  check('an ungrounded result shows no sources', (await page.locator('[data-grounding-sources]').count()) === 0);

  // Google Search grounding (Phase 0, G3): when the engine reports sources, the
  // result names them so the facts on the image can be checked.
  mock.sources = true;
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(2500);
  mock.sources = false;
  const src = page.locator('[data-grounding-sources]').first();
  check('a grounded result lists its sources', (await src.count()) === 1 && /Sources \(2\)/.test(await src.innerText()));
  check(
    'each source is a real link to the page',
    (await src.locator('a[href="https://example.org/history"]').count()) === 1,
  );
  // Settings persist per tool; later sections expect Wireframe's default.
  await page.getByRole('button', { name: /^A building$/ }).click();
  await page.waitForTimeout(200);

  // --- Build plan, Phase 1 ---------------------------------------------------
  const gen = () => page.getByRole('button', { name: /^Generate$/ });

  // Concept Diagram: moves are read from the form, or typed — and one typed
  // move is not a sequence, so it blocks rather than being silently dropped.
  await navTo('conceptDiagram');
  const cdPrompt = page.locator('#conceptDiagram-prompt');
  check('concept diagram reads its moves from the form by default', /WORK BACKWARDS INTO MOVES/.test(await cdPrompt.inputValue()));
  check('and ends on the input', /last panel must match the input/.test(await cdPrompt.inputValue()));
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  check('concept diagram runs with an image and no typed moves', await gen().isEnabled());
  await page.locator('#conceptDiagram-moves').fill('Fill the site');
  await page.waitForTimeout(300);
  check('one typed move blocks Generate', !(await gen().isEnabled()));
  await page.locator('#conceptDiagram-moves').fill('Fill the site\nCarve the courtyard\nStep the roofs');
  await page.waitForTimeout(300);
  check('three typed moves unblock it', await gen().isEnabled());
  check('and say the panel count follows them', /3 moves typed/.test(await page.locator('[data-moves-count]').innerText()));
  check('the typed moves reach the prompt, in order', /these 3 moves, in this order: 1\. Fill the site; 2\. Carve the courtyard; 3\. Step the roofs/.test(await cdPrompt.inputValue()));
  await page.locator('#conceptDiagram-moves').fill('');

  // Bubble to Plan: invents walls, so it says the sizes are interpreted.
  await navTo('bubblePlan');
  check('bubble plan keeps the diagram adjacencies', /the rooms share a wall with a door in it/.test(await page.locator('#bubblePlan-prompt').inputValue()));
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  await gen().click();
  await page.waitForTimeout(2500);
  check('bubble plan warns that sizes are interpreted', /interpreted from a loose diagram/i.test(await mainText()));

  // Moodboard to Space and the Concept Board both have a "Something else" that
  // must be described before it runs.
  await navTo('moodboardSpace');
  check('moodboard space refuses another collage', /DO NOT MAKE ANOTHER COLLAGE/.test(await page.locator('#moodboardSpace-prompt').inputValue()));
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Something else' }).click();
  await page.waitForTimeout(300);
  check('an undescribed room blocks Generate', !(await gen().isEnabled()));
  await page.locator('#moodboardSpace-room').fill('a boutique hotel bathroom');
  await page.waitForTimeout(300);
  check('describing it unblocks it', await gen().isEnabled());
  check('and the room reaches the prompt, without a doubled article', /one photorealistic boutique hotel bathroom that/.test(await page.locator('#moodboardSpace-prompt').inputValue()));
  await page.getByRole('button', { name: /^Living$/ }).click();

  await navTo('conceptBoard');
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  await page.locator('#conceptBoard-title').fill('Seed Pavilion');
  await page.waitForTimeout(300);
  check('a typed title reaches the concept board prompt', /the title “Seed Pavilion”/.test(await page.locator('#conceptBoard-prompt').inputValue()));
  await page.getByRole('button', { name: 'Something else' }).click();
  await page.waitForTimeout(300);
  check('an undescribed program blocks the concept board', !(await gen().isEnabled()));
  await page.getByRole('button', { name: /^Pavilion$/ }).click();
  await page.locator('#conceptBoard-title').fill('');

  // --- Build plan, Phase 2a --------------------------------------------------
  await navTo('siteLinework');
  check('site linework must overlay its source', /must overlay the input exactly/.test(await page.locator('#siteLinework-prompt').inputValue()));
  await page.getByRole('button', { name: /^Solid black$/ }).click();
  await page.waitForTimeout(300);
  check('solid buildings turn it into a figure-ground', /Fill every building footprint solid black/.test(await page.locator('#siteLinework-prompt').inputValue()));
  await page.getByRole('button', { name: /^Outlined$/ }).click();

  await navTo('siteAnalysis');
  const saPrompt = page.locator('#siteAnalysis-prompt');
  check('site analysis puts the sun on the south edge by default', /BOTTOM \(south\) edge/.test(await saPrompt.inputValue()));
  await page.getByRole('button', { name: /^South of the equator$/ }).click();
  await page.waitForTimeout(300);
  check('and on the north edge south of the equator', /TOP \(north\) edge/.test(await saPrompt.inputValue()));
  await page.getByRole('button', { name: /^North of the equator$/ }).click();
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  check('the site marker is optional — an outlined screenshot runs as is', await gen().isEnabled());
  await gen().click();
  await page.waitForTimeout(2500);
  check('site analysis warns that street names are copied, not checked', /Street names are copied from your screenshot/.test(await mainText()));

  await navTo('placeInSite');
  const siteZones = page.locator('input[type=file]');
  check('place in site takes the site photo and the building separately', (await siteZones.count()) >= 2);
  // The building slot first: once a zone holds an image its file input goes,
  // so the indices shift (the same order Place Object's test uses).
  await siteZones.nth(1).setInputFiles(PLAN);
  await page.waitForTimeout(400);
  check('it will not run on the building alone', !(await gen().isEnabled()));
  await siteZones.nth(0).setInputFiles(PLAN);
  await page.waitForTimeout(400);
  check('with the site photo added it runs', await gen().isEnabled());
  const pisPrompt = page.locator('#placeInSite-prompt');
  check('the photo outside the plot is locked', /Everything outside the plot stays exactly/.test(await pisPrompt.inputValue()));
  check('landscape is off unless asked for', !/add a considered landscape/.test(await pisPrompt.inputValue()));
  await page.getByRole('button', { name: /^Golden hour$/ }).click();
  await page.waitForTimeout(300);
  check('golden hour releases the light, not the geometry', /the light is the only thing that changes there/.test(await pisPrompt.inputValue()));
  check('and never claims the photo is unchanged', !/Everything outside the plot stays exactly/.test(await pisPrompt.inputValue()));
  await page.getByRole('button', { name: /^Match the photo$/ }).click();

  // --- Build plan, Phase 2b --------------------------------------------------
  // S1: a coordinates box reads back what it understood, and blocks on what it
  // cannot read rather than sending it to be "interpreted".
  await navTo('sitePhoto');
  const coords = page.locator('#sitePhoto-coords');
  const coordsRead = page.locator('[data-coords-read]');
  check('site photo has no image dropzone', (await page.locator('input[type=file]').count()) === 0);
  check('and will not run with no location', !(await gen().isEnabled()));
  await coords.fill('Taj Mahal');
  await page.waitForTimeout(300);
  check('a place name is not read as coordinates', (await coordsRead.getAttribute('data-coords-read')) === 'invalid' && !(await gen().isEnabled()));
  await coords.fill('38°53′52″N 77°2′11″W');
  await page.waitForTimeout(300);
  check('degrees-minutes-seconds are read back', (await coordsRead.getAttribute('data-coords-read')) === '38.8978° N, 77.0364° W', await coordsRead.getAttribute('data-coords-read'));
  check('and unblock Generate', await gen().isEnabled());
  const spPrompt = page.locator('#sitePhoto-prompt');
  check('the prompt states the place in one normal form', /site photograph of the place at 38\.8978° N, 77\.0364° W/.test(await spPrompt.inputValue()));
  check('search is on by default where the engine has it', /Use Google Search to look these coordinates up/.test(await spPrompt.inputValue()));
  // G3 end to end: the request asks for search, and the sources come back.
  const spBefore = geminiBodies.length;
  mock.sources = true;
  await gen().click();
  await page.waitForTimeout(2500);
  mock.sources = false;
  const spBody = geminiBodies.slice(spBefore).join('');
  check('a searching tool sends the google_search tool', /"tools":\[\{"google_search":\{\}\}\]/.test(spBody));
  check('its result lists the sources', (await page.locator('[data-grounding-sources]').count()) >= 1);
  check('and says it is a plausible picture, not a photograph', /not a photograph of it/.test(await mainText()));
  await page.getByRole('switch', { name: /Look it up with Google Search/ }).click();
  await page.waitForTimeout(300);
  check('search off: the prompt says it works from memory', /From what you know about these coordinates/.test(await spPrompt.inputValue()));
  const spOff = geminiBodies.length;
  await gen().click();
  await page.waitForTimeout(2500);
  check('and no tools field is sent', !/"tools"/.test(geminiBodies.slice(spOff).join('')));
  check('and the warning says so', /drawn from the model’s memory/.test(await mainText()));
  await page.getByRole('switch', { name: /Look it up with Google Search/ }).click();
  await coords.fill('');

  await navTo('siteHistory');
  await page.locator('#siteHistory-coords').fill('https://www.google.com/maps/place/Taj/@27.1751,78.0421,17z');
  await page.waitForTimeout(300);
  check('a Google Maps link is read as coordinates', (await page.locator('[data-coords-read]').getAttribute('data-coords-read')) === '27.1751° N, 78.0421° E');
  const shBefore = geminiBodies.length;
  await gen().click();
  await page.waitForTimeout(2500);
  check('site history researches with search', /google_search/.test(geminiBodies.slice(shBefore).join('')));
  check('and tells you to check every date', /check every one before you publish/.test(await mainText()));
  await page.locator('#siteHistory-coords').fill('');

  // S2: an OPTIONAL second slot never blocks, and the prompt knows if it is filled.
  await navTo('siteAnalysis3d');
  const s3Prompt = page.locator('#siteAnalysis3d-prompt');
  check('3D site draws no wind unless it is set', !/Prevailing wind/.test(await s3Prompt.inputValue()));
  await page.getByRole('button', { name: /^NW$/ }).click();
  await page.waitForTimeout(300);
  check('setting it draws wind from that side', /Prevailing wind from the north-west/.test(await s3Prompt.inputValue()));
  await page.getByRole('button', { name: /^Not shown$/ }).click();
  check('3D site offers the optional reference slot', (await page.locator('input[type=file]').count()) >= 2);
  await page.locator('input[type=file]').first().setInputFiles(PLAN);
  await page.waitForTimeout(400);
  check('it runs with the map alone — the reference is optional', await gen().isEnabled());
  check('and the prompt does not mention a reference it has not got', !/SECOND image is a reference diagram/.test(await s3Prompt.inputValue()));
  await page.locator('input[type=file]').last().setInputFiles(PLAN);
  await page.waitForTimeout(400);
  check('adding one tells the prompt to copy its look, not its place', /SECOND image is a reference diagram/.test(await s3Prompt.inputValue()));
  await page.locator('#siteAnalysis3d-coords').fill('-33.8568, 151.2153');
  await page.waitForTimeout(300);
  check('a southern latitude leans the sun arc north', /to the NORTH of overhead/.test(await s3Prompt.inputValue()));
  await page.locator('#siteAnalysis3d-coords').fill('');

  // S3: a send preset opens the next step of a two-step tool.
  await navTo('urbanLayers');
  const ulPrompt = page.locator('#urbanLayers-prompt');
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  for (const name of ['Green network', 'Circulation', 'Blocks']) await page.getByRole('switch', { name }).click();
  await page.waitForTimeout(300);
  check('one layer is not an analysis — it blocks', !(await gen().isEnabled()));
  for (const name of ['Green network', 'Circulation', 'Blocks']) await page.getByRole('switch', { name }).click();
  await page.waitForTimeout(300);
  check('four layers share one extent', /they must stack perfectly/.test(await ulPrompt.inputValue()));
  await gen().click();
  await page.waitForTimeout(2500);
  const stackBtn = page.locator('[data-send-preset="urbanLayers"]').first();
  check('the layer sheet offers "Stack these layers"', (await stackBtn.count()) === 1 && /Stack these layers/.test(await stackBtn.innerText()));
  await stackBtn.click();
  await page.waitForTimeout(600);
  check('which opens the stack step', /Rearrange those same maps/.test(await ulPrompt.inputValue()));
  check('with the sheet already loaded', await gen().isEnabled());
  await page.getByRole('button', { name: /^Layer maps$/ }).click();

  // --- Build plan, Phase 3a --------------------------------------------------
  // Construction Phasing: one request per stage, each ending on its own stage.
  await navTo('phasing');
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  const phBefore = geminiBodies.length;
  await gen().click();
  await page.waitForTimeout(4500);
  const phBodies = geminiBodies.slice(phBefore);
  check('three stages send three generations', phBodies.length === 3, `${phBodies.length}`);
  check(
    'each ends on its own stage, in order',
    /THE STAGE: EXCAVATION/.test(phBodies[0] ?? '') && /THE STAGE: STRUCTURAL FRAME/.test(phBodies[1] ?? '') && /THE STAGE: ENVELOPE/.test(phBodies[2] ?? ''),
  );
  check('and every one locks the camera', phBodies.every((b) => /THE CAMERA IS THE PART THAT DRIFTS/.test(b)));
  check('the results are labelled by stage', /Structural frame/.test(await mainText()));
  for (const name of ['Excavation', 'Structural frame', 'Envelope']) await page.getByRole('switch', { name }).click();
  await page.waitForTimeout(300);
  check('no stage chosen blocks Generate', !(await gen().isEnabled()));
  for (const name of ['Excavation', 'Structural frame', 'Envelope']) await page.getByRole('switch', { name }).click();

  // Reframe (R1): the INPUT that reaches the engine is the padded canvas, and
  // the result is the original pasted back at the new ratio.
  const pngSize = (b64) => {
    const b = Buffer.from(b64, 'base64');
    return b.toString('ascii', 1, 4) === 'PNG' ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null;
  };
  await navTo('reframe');
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  const rfBefore = geminiBodies.length;
  await gen().click();
  await page.waitForTimeout(3500);
  const rfBody = JSON.parse(geminiBodies[rfBefore] || '{}');
  const sentImg = rfBody.contents?.[0]?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  const sentSize = sentImg ? pngSize(sentImg) : null;
  check('reframe sends the input padded to 9:16', !!sentSize && Math.abs(sentSize.w / sentSize.h - 9 / 16) < 0.01, JSON.stringify(sentSize));
  check('keeping the original width (nothing scaled down)', sentSize?.w === 1300, JSON.stringify(sentSize));
  check('and asks the engine for 9:16', rfBody.generationConfig?.imageConfig?.aspectRatio === '9:16');
  const outSize = await page.locator('main figure img[src^="data:image/jpeg"]').first().evaluate((i) => ({ w: i.naturalWidth, h: i.naturalHeight })).catch(() => null);
  check('the result is the original pasted back at 9:16', !!outSize && outSize.w === 1300 && Math.abs(outSize.w / outSize.h - 9 / 16) < 0.01, JSON.stringify(outSize));

  // Ground-Floor Program: the box is required, and the fascia stays blank.
  await navTo('groundFloor');
  check('ground floor keeps the fascia blank', /fascia above the shopfront is left blank/.test(await page.locator('#groundFloor-prompt').inputValue()));
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  check('ground floor will not run without the box', !(await gen().isEnabled()) && /Mark the area on the image/.test(await mainText()));
  const gfCanvas = page.locator('[data-marker-canvas]');
  const gfBox = await gfCanvas.boundingBox();
  await page.mouse.move(gfBox.x + gfBox.width * 0.1, gfBox.y + gfBox.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(gfBox.x + gfBox.width * 0.5, gfBox.y + gfBox.height * 0.85, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  check('drawing the box unblocks it', await gen().isEnabled());

  // --- Build plan, Phase 3b --------------------------------------------------
  await navTo('systemsCutaway');
  const scPrompt = page.locator('#systemsCutaway-prompt');
  check('the cutaway cuts rather than draws over', /CUT IT OPEN/.test(await scPrompt.inputValue()));
  await page.getByRole('button', { name: /^Soil & water$/ }).click();
  await page.waitForTimeout(300);
  check('soil & water reveals the substrate and the irrigation', /soil substrate/.test(await scPrompt.inputValue()) && /irrigation pipes/.test(await scPrompt.inputValue()));
  await page.getByRole('switch', { name: /Labels and a legend/ }).click();
  await page.waitForTimeout(300);
  check('labels off asks for no words', !/Spell every word/.test(await scPrompt.inputValue()) && /No labels/.test(await scPrompt.inputValue()));
  await page.getByRole('switch', { name: /Labels and a legend/ }).click();
  await page.getByRole('button', { name: /^Sun & air$/ }).click();

  await navTo('marketingBoard');
  const mbPrompt = page.locator('#marketingBoard-prompt');
  check('with no facts the board prints none', /Print no numbers, dates, places or names at all/.test(await mbPrompt.inputValue()));
  await page.locator('#marketingBoard-facts').fill('Bengaluru · 320 m² · 2026');
  await page.locator('#marketingBoard-title').fill('Hillside House');
  await page.waitForTimeout(300);
  check('typed facts are the only facts', /Facts: Bengaluru · 320 m² · 2026\. Print only these facts/.test(await mbPrompt.inputValue()));
  check('and the typed title is used', /Title: “Hillside House”/.test(await mbPrompt.inputValue()));
  await page.getByRole('button', { name: /^16:9 slide$/ }).click();
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  const mbBefore = geminiBodies.length;
  await gen().click();
  await page.waitForTimeout(2500);
  check('the chosen format is the ratio asked for', /"aspectRatio":"16:9"/.test(geminiBodies.slice(mbBefore).join('')));
  check('and the board warns to check the facts', /prints only the facts you typed/.test(await mainText()));
  await page.locator('#marketingBoard-facts').fill('');
  await page.locator('#marketingBoard-title').fill('');
  await page.getByRole('button', { name: /^4:5 post$/ }).click();

  await navTo('magazine');
  const mgPrompt = page.locator('#magazine-prompt');
  check('the magazine page bans invented brands and prices', /No invented brand names, prices/.test(await mgPrompt.inputValue()));
  await page.getByRole('button', { name: /^A building$/ }).click();
  await page.waitForTimeout(300);
  check('a building page reads the building', /READ THE BUILDING FIRST/.test(await mgPrompt.inputValue()));
  await page.getByRole('button', { name: /^An interior$/ }).click();

  // The shared lock must not name a thing the tool exists to change. This is the
  // contradiction that the static gate catches across all 624 variants; here it
  // is checked once, live, on the two tools most likely to regress.
  await navTo('facadeMaterial');
  check(
    'the material study does not lock the material it changes',
    !/its materials come through completely unchanged/.test(await page.locator('#facadeMaterial-prompt').inputValue()),
  );
  await navTo('atmosphere');
  check(
    'but a tool that does not change materials still locks them',
    /the same brick under a different sun/.test(await page.locator('#atmosphere-prompt').inputValue()),
  );

  // Toggles must not leak their clause when off.
  await navTo('humanScale');
  const scalePrompt = page.locator('#humanScale-prompt');
  check('an off toggle contributes nothing', !/Add one or two vehicles/.test(await scalePrompt.inputValue()));
  // SwitchRow renders role="switch", not a plain button.
  await page.getByRole('switch', { name: 'Vehicles' }).click();
  await page.waitForTimeout(300);
  check('and switching it on does', /Add one or two vehicles/.test(await scalePrompt.inputValue()));

  // The one tool that sends `resolution` — and says so when the engine ignores it.
  await navTo('upscale');
  check(
    'the upscaler warns when the active engine takes no resolution',
    /takes no resolution parameter/i.test(await page.locator('main').innerText()),
  );
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  const beforeUp = geminiBodies.length;
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(2500);
  check('the upscaler still runs on an engine without it', geminiBodies.length > beforeUp);

  // 18. Every tool's DECLARED contracts, asserted against its LIVE prompt box.
  //
  //     This was a fifth hand-typed table of regexes copied off the registry —
  //     in the same change that added qa/verifyContracts.cjs to delete exactly
  //     that. Two of the copies had already drifted shorter than the contracts
  //     they mirrored, so the live gate asserted less than the static one while
  //     looking like it asserted more.
  //
  //     Reading the contracts from the registry instead makes this the same kind
  //     of check as section 12: a new tool is covered by existing. It is not
  //     redundant with verifyContracts — that one evaluates the builder's return
  //     value, this one evaluates what actually reaches the textarea, and a
  //     shell that dropped buildPrompt would pass the first and fail this.
  const contractsBundle = path.join(os.tmpdir(), `and-e2e-contracts-${process.pid}.cjs`);
  execFileSync(
    'npx',
    ['esbuild', '--bundle', '--platform=node', '--format=cjs', '--log-level=error',
     path.join(__dirname, 'dumpContracts.ts'), `--outfile=${contractsBundle}`],
    { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const declared = JSON.parse(
    execFileSync('node', [contractsBundle], { cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }),
  );
  fs.unlinkSync(contractsBundle);

  // A (sample, tool) pair with NO prepared result — DERIVED, not named. Two
  // sections below depend on the GENERATED path, and both were hard-coded to
  // "the plan sample plus Floor Analysis" until Floor Analysis gained a worked
  // example from that same plan and the pair became instant.
  const unpreparedBundle = path.join(os.tmpdir(), `and-e2e-unprepared-${process.pid}.cjs`);
  execFileSync(
    'npx',
    // examples.ts and samples.ts resolve asset paths through
    // `import.meta.env.BASE_URL`, which does not exist outside Vite - so unlike
    // dumpContracts (registry only) this bundle has to define it.
    ['esbuild', '--bundle', '--platform=node', '--format=cjs', '--log-level=error',
     '--define:import.meta.env.BASE_URL="/"',
     path.join(__dirname, 'dumpUnpreparedPair.ts'), `--outfile=${unpreparedBundle}`],
    { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const unprepared = JSON.parse(
    execFileSync('node', [unpreparedBundle], { cwd: path.join(__dirname, '..'), encoding: 'utf8' }),
  );
  fs.unlinkSync(unpreparedBundle);

  for (const tool of declared) {
    await navTo(tool.key);
    const box = page.locator(`#${tool.key}-prompt`);
    const present = (await box.count()) === 1;
    check(`${tool.key} is reachable and has its prompt box`, present);
    const text = present ? await box.inputValue() : '';
    for (const c of tool.contracts) {
      check(`${tool.key} live prompt: ${c.name}`, new RegExp(c.source, c.flags).test(text));
    }
  }

  // Diagrams & Boards is the first category where text on the output is the
  // point rather than a liability, so its labels switch has to flip the prompt
  // between two mutually exclusive clauses. Getting this wrong ships a prompt
  // that demands correct spelling and forbids text at once — the shaded-section
  // bug in a new costume, which is why the static gate now carries that pair.
  await navTo('explodedAxon');
  const axonPrompt = page.locator('#explodedAxon-prompt');
  check('a boards tool asks for spelling by default', /Spell every word correctly/.test(await axonPrompt.inputValue()));
  check(
    'and does not also forbid text',
    !/Do not add any watermark, signature, caption or stray text/.test(await axonPrompt.inputValue()),
  );
  await page.getByRole('switch', { name: 'Label each layer' }).click();
  await page.waitForTimeout(300);
  const axonOff = await axonPrompt.inputValue();
  check('switching labels off swaps in the no-text guard', /Do not add any watermark/.test(axonOff));
  check('and drops the spelling demand', !/Spell every word correctly/.test(axonOff));

  // A free-text field the prompt depends on must block Generate while it is
  // empty, or the tool silently runs on a placeholder.
  await navTo('annotation');
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  check('annotation runs on a named subject', await page.getByRole('button', { name: /^Generate$/ }).isEnabled());
  await page.getByRole('button', { name: 'Something else' }).click();
  await page.waitForTimeout(300);
  check(
    'but blocks on an undescribed custom subject',
    !(await page.getByRole('button', { name: /^Generate$/ }).isEnabled()),
  );

  // 19. The axonometric now reads its input two ways, and the two branches share
  //     almost no prompt text. From an elevation the depth is absent and must be
  //     invented; from a modelled viewport it is present, and inventing one means
  //     instructing the model to ignore its own input. Assert the switch really
  //     swaps the branch rather than appending a sentence to it.
  await navTo('axonometric');
  const axonBox = page.locator('#axonometric-prompt');
  const fromElevation = await axonBox.inputValue();
  check('from an elevation the axonometric infers a depth', /INFER THE DEPTH, AND ONLY THE DEPTH/.test(fromElevation));
  check('and does not claim to read one off the image', !/read them off the image/.test(fromElevation));
  await page.getByRole('button', { name: 'A 3D model' }).click();
  await page.waitForTimeout(300);
  const fromModel = await axonBox.inputValue();
  check('from a model it reads the depth off the image', /read them off the image and reproduce them/.test(fromModel));
  check('and stops inventing one', !/INFER THE DEPTH/.test(fromModel));
  check('both branches still forbid a flat elevation', /do NOT reproduce a flat, front-on elevation/.test(fromModel));

  // 20. Output labels, and the refine block that had no escape.
  //
  //     Both are regressions the eight mockup tools shipped with. Every one of
  //     them passed an internal settings axis as `options.style`, which defeats
  //     the derived galleryLabel fallback in providers/labels.ts — so a Program
  //     Diagram set to "isometric" was labelled "Isometric", the name of a
  //     different tool, in the grid, the pool and the gallery.
  await navTo('programDiagram');
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Exploded isometric' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(2500);
  const pdText = await mainText();
  check('a boards tool labels its outputs with its own name', /Program diagram/i.test(pdText));
  check('and not with another tool\'s name', !/\bIsometric\b/.test(pdText));

  //     A settings-based block must not survive into refine mode: the refine
  //     panel REPLACES the tool's controls, so the field that would satisfy it
  //     is no longer on screen and Generate is disabled with no way out.
  await navTo('annotation');
  await page.setInputFiles('input[type=file]', PLAN);
  await page.waitForTimeout(400);
  // navTo only changes the hash, so this is a same-document navigation and the
  // store survives it — section 19 left this tool on the blank custom subject.
  await page.getByRole('button', { name: 'Circulation' }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Generate$/ }).click();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Something else' }).click();
  await page.waitForTimeout(300);
  check(
    'an undescribed custom subject still blocks compose',
    !(await page.getByRole('button', { name: /^Generate$/ }).isEnabled()),
  );
  await page.getByRole('button', { name: 'Refine this image' }).first().click();
  await page.waitForTimeout(400);
  check(
    'but refine is not blocked by a control refine has removed',
    await page.getByRole('button', { name: /^Generate$/ }).isEnabled(),
  );

  // 21. THE THESIS. From an empty front door, TWO clicks reach a result.
  //
  //     This is the one assertion the whole front door exists to satisfy, and
  //     the only one that fails if someone later adds a step — a confirmation,
  //     an interstitial, a "choose a category first". It counts clicks
  //     explicitly rather than describing a flow, because a flow description
  //     stays true while the click count doubles.
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  check('the front door is the drop zone', (await page.locator('[data-studio-drop]').count()) === 1);
  check('and no tool taxonomy is in the way', (await page.locator('[data-card]').count()) === 0);

  let clicks = 0;
  await page.locator('[data-sample="plan"]').click();
  clicks += 1;
  await page.waitForTimeout(900);
  check('one click fills the input and shows the shortlist', (await page.locator('[data-card]').count()) > 0);
  // The visible six must be tools that are ABOUT what was dropped. Upscale for
  // Print accepts all six input kinds and used to sit fourth for a floor plan —
  // a utility taking a slot from an answer. Ordering by how many kinds a tool
  // accepts pushes the catch-alls past the fold; this asserts the outcome
  // rather than the sort.
  //
  //     Asserted as ORDER, not membership: only seven tools accept a plan and
  //     six cards are shown, so the catch-alls cannot all be hidden — the first
  //     draft of this check demanded that and failed on a shortlist that was
  //     already correct. What matters is that they rank last.
  const visible = await page.locator('[data-card]').evaluateAll((els) => els.map((e) => e.getAttribute('data-card')));
  const leading = visible.slice(0, 4);
  const catchAlls = ['upscale', 'annotation', 'moodboard'];
  check(
    'no catch-all tool is in the leading cards for a plan',
    catchAlls.every((k) => !leading.includes(k)),
    `leading: ${leading.join(', ')}`,
  );
  check(
    'the widest-reaching tool is not shown at all before "show all"',
    !visible.includes('upscale'),
    `visible: ${visible.join(', ')}`,
  );
  check('and a plan-specific tool leads', visible[0] === 'render', `first card: ${visible[0]}`);

  check('the shortlist is a shortlist, not all thirty', (await page.locator('[data-card]').count()) <= 6);
  check('a floor plan offers Make it 3D', (await page.locator('[data-card="render"]').count()) === 1);
  check('and does not offer a tool that cannot read a plan', (await page.locator('[data-card="birdsEye"]').count()) === 0);

  // This section is about the GENERATED path, so its tool must be one with no
  // prepared result — otherwise the front door correctly answers instantly, no
  // request is sent, and "it actually generated" fails on a working app. Named
  // literally until adding examples made the named tool instant; derived now.
  const beforeStudio = geminiBodies.length;
  await page.locator(`[data-card="${unprepared.feature}"]`).click();
  clicks += 1;
  await page.waitForTimeout(3000);
  check('two clicks reach a result', (await page.locator('[data-studio-result]').count()) === 1, `clicks: ${clicks}`);
  check('exactly two', clicks === 2);
  check('and it actually generated', geminiBodies.length > beforeStudio);

  // A diagram is honestly an end of the chain: `outputKind: null` means the app
  // has no input kind for what came out, and offering next steps anyway would
  // be offering to run tools on something they cannot read. Section 23 asserts
  // the other side — a tool that DOES produce a chainable kind offers them.
  check('a diagram offers no next step, because it is an end', (await page.locator('[data-chain]').count()) === 0);
  check('and never offers itself', (await page.locator('[data-chain="floorAnalysis"]').count()) === 0);

  // Correcting the guess re-derives the cards rather than filtering a fixed list.
  await page.locator('[data-replace]').count().then(() => {});
  await page.getByRole('button', { name: 'Something else' }).click();
  await page.waitForTimeout(400);
  await page.locator('[data-kind="room"]').click();
  await page.waitForTimeout(400);
  check('changing the kind changes the cards', (await page.locator('[data-card="interior"]').count()) === 1);
  check('and drops the ones that no longer apply', (await page.locator('[data-card="render"]').count()) === 0);
  // Phase 1 added a kind for things to design FROM. Its chip leads somewhere.
  await page.locator('[data-kind="inspiration"]').click();
  await page.waitForTimeout(400);
  check('a mood board or inspiration offers Moodboard to Space', (await page.locator('[data-card="moodboardSpace"]').count()) === 1);
  check('and the Concept Board', (await page.locator('[data-card="conceptBoard"]').count()) === 1);
  check('and no facade tool', (await page.locator('[data-card="facadeMaterial"]').count()) === 0);
  await page.locator('[data-kind="site"]').click();
  await page.waitForTimeout(400);
  check('a site photo offers Place in Real Site', (await page.locator('[data-card="placeInSite"]').count()) === 1);

  // 22. The key is asked at the first generation, not on arrival — and pasting
  //     it continues the run the user already started, with no second tap.
  const fresh = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const fp = await fresh.newPage();
  const freshBodies = [];
  await fp.route('**generativelanguage.googleapis.com/**', (r) => {
    freshBodies.push(r.request().postData() || '');
    return r.fulfill({
      status: 200,
      headers: CORS,
      body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG_1PX.toString('base64') } }] } }] }),
    });
  });
  await fp.goto(BASE, { waitUntil: 'domcontentloaded' });
  await fp.waitForTimeout(500);
  check('a keyless visitor still sees the app', (await fp.locator('[data-studio-drop]').count()) === 1);
  // The one way to reach a tool before dropping anything. It is derived from
  // input mode, and it vanished silently once already: Massing gained an
  // optional sketch and the old "declares no input kinds" filter dropped it.
  check(
    'the front door still offers a way in with no image',
    (await fp.locator('[data-no-image-tool="massing"]').count()) === 1,
  );
  await fp.locator(`[data-sample="${unprepared.sampleKind}"]`).click();
  await fp.waitForTimeout(900);
  await fp.locator(`[data-card="${unprepared.feature}"]`).click();
  await fp.waitForTimeout(600);
  check(
    `the key is asked in the result slot (${unprepared.sampleKind} -> ${unprepared.feature})`,
    (await fp.locator('[data-key-gate]').count()) === 1,
  );
  check('remembering is on by default', await fp.getByRole('switch', { name: /Remember/ }).getAttribute('aria-checked') === 'true');
  const beforeKey = freshBodies.length;
  await fp.fill('#studio-key', 'AIza-qa-studio');
  await fp.getByRole('button', { name: /^Continue$/ }).click();
  await fp.waitForTimeout(3000);
  check('pasting the key continues the run with no second tap', freshBodies.length > beforeKey);
  check('and the result appears', (await fp.locator('[data-studio-result]').count()) === 1);
  await fresh.close();

  // 23. The instant demo. A visitor who has given the app NOTHING gets a real
  //     result in two clicks, and no request is made on their behalf.
  //
  //     This is the ten seconds that decides whether the link gets forwarded,
  //     so it is asserted as a whole: the badge is on the card before the tap,
  //     the result says out loud that it was prepared, and the network stayed
  //     silent. A prepared result that did not say so would pass a weaker
  //     version of this check and still be a lie.
  const demo = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const dp = await demo.newPage();
  let demoCalls = 0;
  await dp.route('**generativelanguage.googleapis.com/**', (r) => {
    demoCalls += 1;
    return r.fulfill({ status: 200, headers: CORS, body: '{}' });
  });
  await dp.route('**api.kie.ai/**', (r) => {
    demoCalls += 1;
    return r.fulfill({ status: 200, headers: CORS, body: '{}' });
  });
  await dp.goto(BASE, { waitUntil: 'domcontentloaded' });
  await dp.waitForTimeout(500);

  let demoClicks = 0;
  await dp.locator('[data-sample="plan"]').click();
  demoClicks += 1;
  await dp.waitForTimeout(900);
  check('a sample card is marked as needing no key', (await dp.locator('[data-card="render"] [data-instant]').count()) === 1);
  check('and it is the first card offered', (await dp.locator('[data-card]').first().getAttribute('data-card')) === 'render');

  await dp.locator('[data-card="render"]').click();
  demoClicks += 1;
  await dp.waitForTimeout(1200);
  check('two clicks reach a result with no key at all', (await dp.locator('[data-studio-result]').count()) === 1);
  check('in exactly two', demoClicks === 2);
  check('nothing was asked of any engine', demoCalls === 0, `${demoCalls} call(s)`);
  check('and no key was demanded', (await dp.locator('[data-key-gate]').count()) === 0);

  // Honesty: the result must say what it is, and offer the real thing.
  const demoText = await dp.locator('main').innerText();
  check('the result says it was prepared earlier', /prepared earlier/i.test(demoText));
  check('and says the visitor\'s own image runs for real', /your own image runs for real/i.test(demoText));
  check('and offers that as the primary action', await dp.getByRole('button', { name: /Try it on your own image/ }).isVisible());
  check('the prepared result is marked in the DOM', (await dp.locator('[data-studio-prepared]').count()) === 1);

  // A prepared result can chain and stay prepared: sketch → elevation →
  // axonometric is two free steps, because the elevation it produced is itself
  // the bundled input of the axonometric pair.
  await dp.goto(BASE, { waitUntil: 'domcontentloaded' });
  await dp.waitForTimeout(400);
  await dp.locator('[data-sample="sketch"]').click();
  await dp.waitForTimeout(900);
  await dp.locator('[data-card="elevation"]').click();
  await dp.waitForTimeout(1200);
  check('the sketch sample is prepared too', (await dp.locator('[data-studio-prepared]').count()) === 1);
  check('a rendered elevation offers next steps', (await dp.locator('[data-chain]').count()) > 0);
  check('from what it PRODUCED, not what went in', (await dp.locator('[data-chain="axonometric"]').count()) === 1);
  check('and never the sketch tools it came from', (await dp.locator('[data-chain="sketchRender"]').count()) === 0);
  check('and its result offers a prepared next step', (await dp.locator('[data-chain-instant]').count()) > 0);
  await dp.locator('[data-chain="axonometric"]').click();
  await dp.waitForTimeout(1200);
  check('chaining stays free', (await dp.locator('[data-studio-prepared]').count()) === 1);
  check('still with no engine call', demoCalls === 0, `${demoCalls} call(s)`);

  // The chain row is capped, so the overflow link has to carry the RESULT
  // forward — not send you back to the cards for the image that made it.
  check('a capped chain offers a way to see the rest', (await dp.locator('[data-continue]').count()) === 1);
  await dp.locator('[data-continue]').click();
  await dp.waitForTimeout(700);
  // The axonometric produces a 3D model view, so the list is the model tools —
  // not the sketch tools three steps back.
  check('which lists what the RESULT can become', (await dp.locator('[data-card="wireframeRender"]').count()) === 1);
  check('and not what its first input could', (await dp.locator('[data-card="sketchRender"]').count()) === 0);

  // A user's OWN image is never served a prepared result — that would be
  // handing them someone else's building and calling it theirs.
  await dp.goto(BASE, { waitUntil: 'domcontentloaded' });
  await dp.waitForTimeout(400);
  await dp.setInputFiles('input[type=file]', PLAN);
  await dp.waitForTimeout(1400);
  check('an uploaded image gets no instant badges', (await dp.locator('[data-instant]').count()) === 0);
  await dp.locator('[data-card]').first().click();
  await dp.waitForTimeout(700);
  check('and is asked for a key rather than shown a sample', (await dp.locator('[data-key-gate]').count()) === 1);
  check('with the network still untouched', demoCalls === 0, `${demoCalls} call(s)`);
  await demo.close();

  // 24. Remix links. A shared URL carries the transformation, and the app has to
  //     honour it without the sender's image — which it does not have and must
  //     never pretend to.
  const link = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const lp = await link.newPage();
  let linkCalls = 0;
  await lp.route('**generativelanguage.googleapis.com/**', (r) => {
    linkCalls += 1;
    return r.fulfill({ status: 200, headers: CORS, body: '{}' });
  });
  await lp.route('**api.kie.ai/**', (r) => {
    linkCalls += 1;
    return r.fulfill({ status: 200, headers: CORS, body: '{}' });
  });

  // Every remix hop is a FULL load. `page.goto` to a URL that differs only in
  // the hash is a same-document navigation, so the store — and the previous
  // link's image — would survive into the next case and make it pass for the
  // wrong reason. Bouncing through about:blank forces a real document load with
  // the hash already in place, which is also what a recipient actually does.
  const openLink = async (hash) => {
    await lp.goto('about:blank');
    await lp.goto(`${BASE}${hash}`, { waitUntil: 'domcontentloaded' });
  };

  // (a) A link that names an image AND a tool is the whole point: the recipient
  //     lands on the finished result having clicked nothing.
  await openLink('#/do/axonometric?from=elev-rendered.jpg');
  await lp.waitForTimeout(2000);
  check('a remix link lands on a finished result with no clicks', (await lp.locator('[data-studio-result]').count()) === 1);
  check('and it is the prepared one', (await lp.locator('[data-studio-prepared]').count()) === 1);
  check('costing nothing', linkCalls === 0, `${linkCalls} call(s)`);
  check('and asking for no key', (await lp.locator('[data-key-gate]').count()) === 0);
  check(
    'the link consumes itself rather than re-firing',
    lp.url().endsWith('#/studio'),
    lp.url(),
  );

  // (b) A link to a user's own result cannot carry the image, so it carries the
  //     tool. The recipient's first drop must then go STRAIGHT to it.
  await openLink('#/do/interior');
  await lp.waitForTimeout(700);
  check('a tool-only link lands on the drop zone', (await lp.locator('[data-studio-drop]').count()) === 1);
  check('and says what is queued', (await lp.locator('[data-studio-queued="interior"]').count()) === 1);
  await lp.locator('[data-sample="room"]').click();
  await lp.waitForTimeout(1400);
  check('one click then reaches the result, not the card grid', (await lp.locator('[data-studio-result]').count()) === 1);
  check('and it is the queued tool that ran', /Restyle|stage|interior/i.test(await lp.locator('main').innerText()));

  // (c) The queued tool is an offer, never a trap.
  await openLink('#/do/interior');
  await lp.waitForTimeout(700);
  await lp.locator('[data-studio-unqueue]').click();
  await lp.waitForTimeout(300);
  check('the queued tool can be dismissed', (await lp.locator('[data-studio-queued]').count()) === 0);
  await lp.locator('[data-sample="room"]').click();
  await lp.waitForTimeout(1200);
  check('after which a sample goes to the cards as usual', (await lp.locator('[data-card]').count()) > 0);

  // (d) Links age badly and nobody can edit one they were sent. Every malformed
  //     shape has to land somewhere usable rather than on a blank screen.
  for (const [hash, why] of [
    ['#/do/notatool', 'an unknown tool'],
    ['#/do/massing', 'a tool whose image is optional'],
    ['#/do/render?from=deleted.jpg', 'an asset that no longer ships'],
  ]) {
    await openLink(hash);
    await lp.waitForTimeout(700);
    check(`${why} still lands on the front door`, (await lp.locator('[data-studio-drop]').count()) === 1, hash);
  }
  check('a stale asset name keeps the tool it named', (await lp.locator('[data-studio-queued="render"]').count()) === 1);
  await link.close();

  // 25. The share card. Composed in the browser from the actual pair, so this
  //     asserts the picture that would travel — not just that a button exists.
  const shareCtx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const shp = await shareCtx.newPage();
  // Headless Chromium has no share sheet, so the file path would never be
  // exercised. Stubbing the OS hand-off is the only way to see what it is
  // actually handed — and decoding the file proves the canvas really composed.
  await shp.addInitScript(() => {
    window.__shared = null;
    navigator.canShare = () => true;
    navigator.share = async (data) => {
      const f = data.files[0];
      const url = URL.createObjectURL(f);
      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
        img.src = url;
      });
      window.__shared = { name: f.name, type: f.type, size: f.size, w: img.naturalWidth, h: img.naturalHeight, text: data.text };
    };
  });
  await shp.goto(BASE, { waitUntil: 'domcontentloaded' });
  await shp.waitForTimeout(500);
  await shp.locator('[data-sample="plan"]').click();
  await shp.waitForTimeout(900);
  await shp.locator('[data-card="render"]').click();
  await shp.waitForTimeout(1200);
  check('a result offers to be shared', (await shp.locator('[data-share]').count()) === 1);
  await shp.locator('[data-share]').click();
  await shp.waitForTimeout(2500);
  const shared = await shp.evaluate(() => window.__shared);
  check('sharing hands over a real image file', Boolean(shared) && shared.type === 'image/jpeg', JSON.stringify(shared));
  check('composed square, at card size', shared?.w === 1080 && shared?.h === 1080, `${shared?.w}×${shared?.h}`);
  check('with actual pixels in it', (shared?.size ?? 0) > 20000, `${shared?.size} bytes`);
  check(
    'and the message carries the remix link',
    (shared?.text ?? '').includes('#/do/render?from=plan-input.jpg'),
    shared?.text,
  );

  // The link on its own is the other half — some people paste a URL, not a JPEG.
  await shp.locator('[data-share-link]').click();
  await shp.waitForTimeout(600);
  const clip = await shp.evaluate(() => navigator.clipboard.readText());
  check('copy link puts the remix URL on the clipboard', clip.includes('#/do/render?from=plan-input.jpg'), clip);
  check('and says so', (await shp.locator('[data-share-link]').innerText()).includes('Link copied'));
  await shareCtx.close();

  // 26. The Tweak sheet. Two ways to change a result, and NEITHER fires on its
  //     own — the whole point of an explicit button on a tool that bills per
  //     image is that a chip tap cannot spend money.
  const tweak = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const tp = await tweak.newPage();
  let tweakCalls = 0;
  const tweakBodies = [];
  await tp.route('**generativelanguage.googleapis.com/**', (r) => {
    tweakCalls += 1;
    tweakBodies.push(r.request().postData() || '');
    return r.fulfill({
      status: 200,
      headers: CORS,
      body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG_1PX.toString('base64') } }] } }] }),
    });
  });
  await tp.route('**api.kie.ai/**', (r) => {
    tweakCalls += 1;
    return r.fulfill({ status: 200, headers: CORS, body: '{}' });
  });

  await tp.goto(BASE, { waitUntil: 'domcontentloaded' });
  await tp.waitForTimeout(500);

  // A prepared result offers the sheet too — but it cannot demonstrate the
  // buttons, because on a prepared pair every button here is a real run. So
  // this checks the affordance, then starts again from a real generation.
  await tp.locator('[data-sample="plan"]').click();
  await tp.waitForTimeout(900);
  await tp.locator('[data-card="render"]').click();
  await tp.waitForTimeout(1200);
  check('a prepared result offers to be tweaked', (await tp.locator('[data-tweak-open]').count()) === 1);
  check('and nothing has been spent to get there', tweakCalls === 0, `${tweakCalls} call(s)`);

  // The user's own image, a key, a real result — the path the sheet is for.
  await tp.goto('about:blank');
  await tp.goto(BASE, { waitUntil: 'domcontentloaded' });
  await tp.waitForTimeout(400);
  await tp.setInputFiles('input[type=file]', PLAN);
  await tp.waitForTimeout(1400);
  await tp.locator('[data-card="render"]').click();
  await tp.waitForTimeout(600);
  await tp.fill('#studio-key', 'AIza-qa-tweak');
  await tp.getByRole('button', { name: /^Continue$/ }).click();
  await tp.waitForTimeout(3000);
  check('a generated result is on screen', (await tp.locator('[data-studio-result]').count()) === 1);
  const afterFirstRun = tweakCalls;

  check('a generated result offers to be tweaked', (await tp.locator('[data-tweak-open]').count()) === 1);
  await tp.locator('[data-tweak-open]').click();
  await tp.waitForTimeout(400);
  check('the sheet opens', (await tp.locator('[data-tweak-sheet]').count()) === 1);

  // The axes come from the registry declaration, so the isometric tool's own
  // output-view chips are here — the same ones its tool screen renders.
  check('it carries the tool\'s declared axes', (await tp.locator('[data-tweak-sheet] [aria-pressed]').count()) > 0);
  const planChip = tp.locator('[data-tweak-sheet] button', { hasText: '2D furnished plan' });
  check('including this tool\'s own output view', (await planChip.count()) === 1);
  await planChip.click();
  await tp.waitForTimeout(300);
  check('changing a setting spends nothing on its own', tweakCalls === afterFirstRun, `${tweakCalls - afterFirstRun} extra call(s)`);

  // Refine is the OTHER run, and it too waits to be asked.
  check('refine starts disabled', await tp.locator('[data-tweak-refine]').isDisabled());
  await tp.locator('[data-tweak-sheet] button', { hasText: 'Warmer light' }).click();
  await tp.waitForTimeout(200);
  check('picking a change enables it', !(await tp.locator('[data-tweak-refine]').isDisabled()));
  check('and still spends nothing', tweakCalls === afterFirstRun, `${tweakCalls - afterFirstRun} extra call(s)`);

  // Advanced holds the prompt, keyed to the feature like the tool screen's own.
  await tp.locator('[data-tweak-advanced]').click();
  await tp.waitForTimeout(250);
  check('advanced reveals the prompt', (await tp.locator('#render-prompt').count()) === 1);
  const sheetPrompt = await tp.locator('#render-prompt').inputValue();
  check('which is the real assembled prompt', /floor plan|isometric|plan/i.test(sheetPrompt), sheetPrompt.slice(0, 60));

  // Only the button spends. This one re-runs the TOOL on the original input.
  await tp.locator('[data-tweak-rerun]').click();
  await tp.waitForTimeout(3000);
  check('the run button is what spends', tweakCalls > afterFirstRun, `${tweakCalls - afterFirstRun} extra call(s)`);
  check('and the sheet closes behind it', (await tp.locator('[data-tweak-sheet]').count()) === 0);
  // The settings change has to reach the request, or the sheet is decorative.
  check(
    'the changed setting reached the prompt',
    /furnish/i.test(tweakBodies[tweakBodies.length - 1] ?? ''),
    'a 2D furnished plan was asked for; the last request should say so',
  );

  // Refine sends the RESULT back through, not the original input — a different
  // run from the same sheet, and the distinction is the reason there are two
  // buttons rather than one "Regenerate".
  await tp.locator('[data-tweak-open]').click();
  await tp.waitForTimeout(400);
  const beforeRefine = tweakCalls;
  await tp.locator('[data-tweak-refine]').click();
  await tp.waitForTimeout(3000);
  check('refine runs too', tweakCalls > beforeRefine);
  check(
    'and it carries the refine instruction',
    /warmer|keep everything|change only/i.test(tweakBodies.slice(beforeRefine).join(' ')),
  );
  await tweak.close();

  // 27. The phone. Not "it renders at 390px" — three specific things that were
  //     wrong when this was measured rather than assumed.
  const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pp = await ph.newPage();
  await pp.route('**generativelanguage.googleapis.com/**', (r) => r.fulfill({ status: 200, headers: CORS, body: '{}' }));
  await pp.route('**api.kie.ai/**', (r) => r.fulfill({ status: 200, headers: CORS, body: '{}' }));

  await pp.goto(BASE, { waitUntil: 'domcontentloaded' });
  await pp.waitForTimeout(600);
  await pp.locator('[data-sample="plan"]').click();
  await pp.waitForTimeout(1200);

  // (a) The screen must not scroll sideways. A one-line scrollable chip row
  //     inside a grid item defaults to `min-width: auto`, so its ~700px
  //     min-content width stretched the whole column.
  //
  //     Measured on the app's OWN scroll container, not `documentElement`. The
  //     first version of this check asked the document, which never overflows
  //     here — the root is `overflow-hidden` and `<main>` does the scrolling —
  //     so it passed with both `min-w-0` guards removed and the bug fully
  //     present. Caught by breaking the fix and finding the gate silent.
  const overflows = await pp.evaluate(() => {
    const main = document.querySelector('main');
    const el = main ?? document.documentElement;
    return { over: el.scrollWidth > el.clientWidth + 1, w: el.scrollWidth, c: el.clientWidth };
  });
  check('the phone layout does not scroll sideways', !overflows.over, `${overflows.w}px in a ${overflows.c}px column`);

  // (b) "Make it…" is the question this screen exists to answer, so at least one
  //     card has to be on the first screen. It was past 1,000px.
  const firstCard = await pp.locator('[data-card]').first().boundingBox();
  check('a tool card is above the fold', Boolean(firstCard) && firstCard.y < 844, `y=${firstCard?.y}`);

  // (c) The instant badge is a mark on the image, not a sentence: at 390px the
  //     full wording covered most of the card and hid the preview.
  const badge = await pp.locator('[data-instant]').first().boundingBox();
  const card = await pp.locator('[data-card="render"]').boundingBox();
  check(
    'the no-key badge does not cover the card preview',
    Boolean(badge) && Boolean(card) && badge.width < card.width * 0.45,
    `badge ${badge?.width}px of a ${card?.width}px card`,
  );

  // (d) The action bar stays under the thumb. `position: fixed` was silently
  //     broken by a finished entrance animation leaving an identity matrix on
  //     the wrapper — so this measures the box before and after a scroll rather
  //     than trusting the class list.
  await pp.locator('[data-card="render"]').click();
  await pp.waitForTimeout(1400);
  const barTop = await pp.locator('[data-result-actions]').boundingBox();
  await pp.evaluate(() => {
    let n = document.querySelector('[data-result-actions]')?.parentElement;
    while (n && n !== document.body) {
      if (/(auto|scroll)/.test(getComputedStyle(n).overflowY)) { n.scrollTop = n.scrollHeight; return; }
      n = n.parentElement;
    }
  });
  await pp.waitForTimeout(500);
  const barEnd = await pp.locator('[data-result-actions]').boundingBox();
  check(
    'the result actions stay pinned while the page scrolls',
    Boolean(barTop) && Boolean(barEnd) && Math.abs(barTop.y - barEnd.y) < 2,
    `y ${barTop?.y} -> ${barEnd?.y}`,
  );
  check(
    'and sit at the bottom of the screen',
    Boolean(barEnd) && Math.abs(barEnd.y + barEnd.height - 844) < 2,
    `bottom=${barEnd ? barEnd.y + barEnd.height : '?'}`,
  );
  await ph.close();

  check('no page crashes', perr.length === 0, perr.slice(0, 2).join(' | '));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
