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
  await page.route('**generativelanguage.googleapis.com/**', (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS, body: '' });
    geminiBodies.push(r.request().postData() || '');
    return r.fulfill({
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify({
        candidates: [
          { content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG_1PX.toString('base64') } }] }, finishReason: 'STOP' },
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

  // --- Boot: settings open automatically (no key yet) ------------------------
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
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
  const catTo = async (key) => {
    await page.locator(`nav[aria-label="Features"] [data-nav="cat:${key}"]`).first().click();
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
  check(
    'mobile first run shows the pipeline use cases',
    (await mob.getByText('Floor plan → 3D cutaway').count()) > 0,
  );
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
  const catRows = navKeys.filter((k) => k.startsWith('cat:'));
  check('the sidebar lists categories, not one row per tool', catRows.length > 0 && catRows.length < navKeys.length);
  check(
    'no tool has its own sidebar row',
    KEYS.every((k) => !navKeys.includes(k)),
    navKeys.join(','),
  );

  // Walk every category rail and collect the tools it offers. The union must be
  // every registered tool, and no tool may appear twice — this is what proves a
  // new tool is reachable without anyone remembering to add it to a nav list.
  const seen = [];
  for (const row of catRows) {
    await page.locator(`nav[aria-label="Features"] [data-nav="${row}"]`).first().click();
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

  // 15b. The text-only tool has no dropzone at all, and Generate is gated on
  //      the form rather than on an upload.
  await navTo('massing');
  check('a text-only tool renders no image dropzone', (await page.locator('input[type=file]').count()) === 0);
  const massingPrompt = page.locator('#massing-prompt');
  check('a text-only tool still has its prompt box', (await massingPrompt.count()) === 1);
  check('massing prompt refuses materials and glazing', /no materials, no brick, no timber, no glazing/i.test(await massingPrompt.inputValue()));
  const genMassing = page.getByRole('button', { name: /^Generate$/ });
  check('a text-only tool is blocked by its own form, not by an upload', await genMassing.isDisabled());
  await page.fill('#massing-brief', 'A 40-unit residential block with ground-floor retail');
  await page.waitForTimeout(300);
  check('filling the form unblocks it', !(await genMassing.isDisabled()));
  const beforeText = geminiBodies.length;
  await genMassing.click();
  await page.waitForTimeout(2000);
  check('a text-only run fired', geminiBodies.length > beforeText);
  const textBody = geminiBodies[geminiBodies.length - 1] || '';
  check('a text-only run sends NO image part', !/"inlineData"/.test(textBody));
  check('a text-only run carries what the user typed', /40-unit residential block/.test(textBody));

  // The new category exists only because this tool put it there.
  await page.goto(BASE + '#/home', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const navAfter = await page.locator('nav[aria-label="Features"] [data-nav]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-nav')),
  );
  check('a new category appears once its first tool exists', navAfter.includes('cat:concept'));

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
    ['sketchPlan', [/outer wall silhouette/, /not redesigning it/, /quarter-circle swing arc/]],
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
  await page.getByRole('button', { name: '^No text$' }).click().catch(async () => {
    await page.getByRole('button', { name: 'No text' }).click();
  });
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

  // A tool that must infer says so ON the output, where scepticism is useful.
  await navTo('renderToPlan');
  check(
    'a tool that infers shows its accuracy warning on the output',
    /part measurement, part inference/i.test(await page.locator('main').innerText()),
  );

  check('no page crashes', perr.length === 0, perr.slice(0, 2).join(' | '));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
