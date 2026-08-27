// Live verification — the only script in this repo that spends money.
//
// Everything else in qa/ runs against a mocked network and proves things about
// the REQUEST: the words sent, the payload shape, the reachability of a screen.
// None of it can prove anything about the picture that comes back. This can, and
// it costs real credits on your own key, so it refuses to run without both a key
// and an explicit --yes-spend.
//
//   GEMINI_API_KEY=... node qa/liveVerify.cjs --yes-spend
//   GEMINI_API_KEY=... node qa/liveVerify.cjs --yes-spend --runs=01
//
// It drives the built app in a real browser rather than reimplementing the
// request, so what gets tested is the exact code path a user takes — same prompt
// builder, same request shape, same provider. A harness that assembled its own
// call would verify the harness.
//
// Outputs land in qa/live-results/ as input/output pairs plus a report.

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
const fs = require('fs');
const path = require('path');

const BASE = process.env.QA_BASE_URL || 'http://localhost:4173/';
const KEY = process.env.GEMINI_API_KEY || '';
const OUT = path.join(__dirname, 'live-results');
const EXAMPLES = path.join(__dirname, '..', 'public', 'examples');

const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--runs=')) || '').replace('--runs=', '').split(',').filter(Boolean);

if (!KEY) {
  console.error('No GEMINI_API_KEY in the environment. Nothing was run and nothing was spent.');
  process.exit(1);
}
if (!args.includes('--yes-spend')) {
  console.error('This script performs PAID image generations. Re-run with --yes-spend to confirm.');
  process.exit(1);
}

/**
 * The schedule. Each run states the question it answers and the specific shapes
 * a failure takes — scoring is against these, never against whether the picture
 * looks good.
 */
const RUNS = {
  '01': {
    tool: 'targetedSwap',
    title: 'Does the model read a burned-in red rectangle as an instruction?',
    input: 'room-input.jpg',
    // The room holds several cushions, so "the cushion" is genuinely ambiguous
    // in language alone. That is what makes ONE image decisive: only the box can
    // say which one. A test where the words already single the target out would
    // prove nothing about the box.
    marker: { x: 0.15, y: 0.48, w: 0.11, h: 0.16 },
    verdicts: [
      'PASS — only the cushion inside the box changed, and no red rectangle is in the output',
      'FAIL (reproduced) — a red rectangle appears in the output; the box was read as content, not instruction',
      'FAIL (ignored) — a different cushion changed, or all of them did; the box carried no weight',
    ],
    async setUp(page) {
      await page.fill('#swap-element', 'the cushion');
      await page.fill('#swap-replacement', 'a plain black cushion of the same size');
    },
  },
  '03': {
    tool: 'massing',
    title: 'Does text-only generation work on an image-editing model at all?',
    input: null, // deliberately none — that is the whole question
    verdicts: [
      'PASS — a white massing model, recognisably matching the typed brief',
      'FAIL (refused) — an error, or a response carrying no image at all',
      'FAIL (unrelated) — an image with no relation to the brief; the text was not used',
    ],
    async setUp(page) {
      await page.fill('#massing-brief', 'A 40-unit residential block with ground-floor retail around a courtyard');
      await page.fill('#massing-site', '45m x 60m corner plot');
      await page.fill('#massing-context', 'Four-storey terraces on two sides, a park to the south');
    },
  },
};

const wanted = only.length ? only : Object.keys(RUNS);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const exe = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    : undefined;
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const page = await browser.newContext({ viewport: { width: 1440, height: 1100 } }).then((c) => c.newPage());

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // Deliberately NO route mocking. That is the entire point.
  const requests = [];
  page.on('request', (r) => {
    if (r.url().includes('generativelanguage.googleapis.com')) requests.push(r.url());
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[role="dialog"]');
  await page.fill('#api-key', KEY);
  await page.getByRole('button', { name: /^Save$/ }).click();
  await page.locator('[role="dialog"] button[aria-label="Close settings"]').click();
  await page.waitForTimeout(400);

  const report = [];
  let spent = 0;

  for (const id of wanted) {
    const run = RUNS[id];
    if (!run) {
      console.error(`No such run: ${id}`);
      continue;
    }
    console.log(`\n─── Run ${id} · ${run.tool}`);
    console.log(`    ${run.title}`);

    await page.goto(`${BASE}#/${run.tool}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    if (run.input) {
      await page.setInputFiles('input[type=file]', path.join(EXAMPLES, run.input));
      await page.waitForTimeout(900);
      fs.copyFileSync(path.join(EXAMPLES, run.input), path.join(OUT, `run-${id}-input.jpg`));
    }

    if (run.marker) {
      const canvas = page.locator('[data-marker-canvas]');
      const box = await canvas.boundingBox();
      const m = run.marker;
      await page.mouse.move(box.x + box.width * m.x, box.y + box.height * m.y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * (m.x + m.w), box.y + box.height * (m.y + m.h), { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(400);
      // Prove the mark took before paying for a generation that assumes it.
      const marked = (await page.getByRole('button', { name: /Clear mark/ }).count()) === 1;
      if (!marked) {
        console.error('    Marker did not register — skipping, nothing spent on this run.');
        report.push({ id, status: 'skipped', why: 'marker did not register' });
        continue;
      }
      await page.screenshot({ path: path.join(OUT, `run-${id}-marked.png`), fullPage: false });
    }

    await run.setUp(page);
    await page.waitForTimeout(400);

    const prompt = await page.locator(`#${run.tool}-prompt`).inputValue();
    fs.writeFileSync(path.join(OUT, `run-${id}-prompt.txt`), prompt);

    const before = requests.length;
    await page.getByRole('button', { name: /^Generate$/ }).click();
    try {
      await page.waitForSelector('figure img[src^="data:image"]', { timeout: 90000 });
    } catch {
      const err = await page.locator('main').innerText();
      console.error('    No image came back.');
      report.push({ id, status: 'no-image', why: err.slice(0, 400), calls: requests.length - before });
      spent += requests.length - before;
      continue;
    }
    spent += requests.length - before;

    const src = await page.locator('figure img[src^="data:image"]').first().getAttribute('src');
    const b64 = src.split(',')[1];
    fs.writeFileSync(path.join(OUT, `run-${id}-output.png`), Buffer.from(b64, 'base64'));
    console.log(`    Output saved. Judge it against:`);
    run.verdicts.forEach((v) => console.log(`      · ${v}`));
    report.push({ id, status: 'generated', tool: run.tool, title: run.title, verdicts: run.verdicts });
  }

  fs.writeFileSync(
    path.join(OUT, 'report.json'),
    JSON.stringify({ runs: report, generations: spent, pageErrors: errors }, null, 2),
  );
  console.log(`\n${spent} paid generation(s). Results in qa/live-results/`);
  if (errors.length) console.log(`Page errors: ${errors.slice(0, 2).join(' | ')}`);
  await browser.close();
})();
