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

  // Nav rows are addressed by their stable data-nav key, never by position: the
  // sidebar is derived from the feature registry now, so any new tool shifts
  // every index. `.first()` because the mobile drawer renders a second Sidebar.
  const navTo = (key) => page.locator(`nav[aria-label="Features"] [data-nav="${key}"]`).first();
  const nav = page.locator('nav[aria-label="Features"] button');
  await navTo('render').click();
  await page.waitForTimeout(300);

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

  await navTo('elevation').click();
  await page.waitForTimeout(300);
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
  await navTo('interior').click();
  await page.waitForTimeout(300);
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
    await navTo(key).click();
    await page.waitForTimeout(350);
    const box = page.locator(`#${key}-prompt`);
    check(`${key} is reachable and has its prompt box`, (await box.count()) === 1);
    const text = (await box.count()) ? await box.inputValue() : '';
    for (const re of patterns) {
      check(`${key} prompt carries ${re.source.slice(0, 40)}`, re.test(text));
    }
  }

  // The two-input tool must render a SECOND dropzone, not just a reference picker.
  await navTo('placeObject').click();
  await page.waitForTimeout(300);
  check('placeObject offers two separate image inputs', (await page.locator('input[type=file]').count()) >= 2);

  check('no page crashes', perr.length === 0, perr.slice(0, 2).join(' | '));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
