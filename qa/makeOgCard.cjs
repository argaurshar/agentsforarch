// Build `public/og.jpg` — the 1200×630 image every link preview shows.
//
// Run: node qa/makeOgCard.cjs
//
// This is a BUILD-TIME asset, generated and committed, not produced on the fly:
// a crawler fetches it before any JavaScript runs, so it has to be a real file
// sitting at a real URL.
//
// Two things it deliberately does not do. It does not invent a picture — the
// pair on the left is `plan-input.jpg` and `iso-3d.jpg`, a real input and the
// real output this app produced from it, so the preview is a screenshot of the
// product rather than an illustration of it. And it does not restate the
// promise: the name and the tool count are read out of `src/lib/brand.ts` and
// `src/features/registry/keys.ts`, so a renamed app or a thirty-first tool
// regenerates correctly instead of shipping a stale claim.
//
// Rendered through headless Chromium because laying out type on a raw canvas in
// Node needs a native image library this project does not depend on, and the
// browser is already here for the e2e suite.

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'og.jpg');
const W = 1200;
const H = 630;

// --- Read the brand out of the source, never restate it ----------------------

const brandSrc = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'brand.ts'), 'utf8');
const keysSrc = fs.readFileSync(path.join(ROOT, 'src', 'features', 'registry', 'keys.ts'), 'utf8');

const NAME = brandSrc.match(/name: '([^']+)'/)?.[1];
const ACCENT = brandSrc.match(/accent: '([^']+)'/)?.[1];
const INK = brandSrc.match(/ink: '([^']+)'/)?.[1];
const BONE = brandSrc.match(/bone: '([^']+)'/)?.[1];
const TOOL_COUNT = (keysSrc.replace(/^[ \t]*\/\/.*$/gm, '').match(/FEATURE_KEYS = \[([^\]]+)\]/)?.[1] ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean).length;

if (!NAME || !ACCENT || !INK || !BONE || TOOL_COUNT === 0) {
  console.error('Could not read the brand out of src/lib/brand.ts — refusing to guess.');
  process.exit(1);
}

const PROMISE = `One image in, ${TOOL_COUNT} drawings out.`;

const dataUri = (file) => {
  const buf = fs.readFileSync(path.join(ROOT, 'public', 'examples', file));
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
};

const html = `<!doctype html><meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Sora:wght@600;700&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${W}px; height: ${H}px; display: flex; background: ${INK}; overflow: hidden;
         font-family: Inter, system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  .pair { width: 540px; height: ${H}px; display: grid; grid-template-rows: 1fr 1fr; gap: 2px; background: ${INK}; }
  /* min-height:0 or a grid item refuses to shrink below its intrinsic
     height and the first panel eats the second's track. */
  .pair img { width: 100%; height: 100%; min-height: 0; object-fit: cover; display: block; }
  .tag { position: absolute; left: 18px; font-size: 15px; font-weight: 500; color: ${BONE};
         background: rgba(17,17,17,0.72); padding: 6px 12px; }
  .copy { flex: 1; padding: 64px 60px; display: flex; flex-direction: column; justify-content: center; gap: 20px; }
  .tick { width: 64px; height: 5px; background: ${ACCENT}; }
  h1 { font-family: Sora, Inter, system-ui, sans-serif; font-weight: 700; font-size: 54px; line-height: 1.08;
       color: ${BONE}; letter-spacing: -0.02em; }
  .name { font-size: 21px; font-weight: 500; color: ${ACCENT}; letter-spacing: 0.14em; text-transform: uppercase; }
  p { font-size: 22px; line-height: 1.5; color: #a8a29a; max-width: 30ch; }
</style>
<div class="pair" style="position: relative">
  <img src="${dataUri('plan-input.jpg')}" alt="" />
  <img src="${dataUri('iso-3d.jpg')}" alt="" />
  <span class="tag" style="top: 18px">before</span>
  <span class="tag" style="top: 334px">after</span>
</div>
<div class="copy">
  <span class="name">${NAME}</span>
  <h1>${PROMISE}</h1>
  <div class="tick"></div>
  <p>Drop a plan, a sketch or a photo of a room. Two clicks later you have the drawing.</p>
</div>`;

(async () => {
  const exe = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    : undefined;
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  // Webfonts may or may not be reachable from a sandboxed build box; either way
  // the fallback stack renders, so this waits briefly rather than requiring it.
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.screenshot({ path: OUT, type: 'jpeg', quality: 88 });
  await browser.close();
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`Wrote ${path.relative(ROOT, OUT)} — ${W}×${H}, ${kb}KB, "${NAME} — ${PROMISE}"`);
})();
