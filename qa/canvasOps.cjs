// Runs the APP'S OWN canvas code headlessly, for tests that need it.
//
// The live harness runs in Node, and two things the app does in the browser
// have to happen to a fixture before (or after) a paid call:
//   burn   — the red marker rectangle (src/lib/images.ts burnMarker)
//   pad    — Reframe's grey-margin canvas (src/lib/reframe.ts padToRatio)
//   paste  — Reframe's paste-back of the original (src/lib/reframe.ts pasteBack)
// Reimplementing them here would test a copy. Instead both modules are bundled
// to an IIFE and executed in Chromium, byte for byte the code the app ships.
//
//   node qa/canvasOps.cjs burn  <in> <x,y,w,h> <out.png>
//   node qa/canvasOps.cjs pad   <in> <ratio> <anchor> <out.png>      → prints the placement JSON
//   node qa/canvasOps.cjs paste <original> <result> '<placement>' <out.jpg>
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function bundle() {
  const entry = path.join(os.tmpdir(), `and-canvas-entry-${process.pid}.ts`);
  const out = path.join(os.tmpdir(), `and-canvas-${process.pid}.js`);
  fs.writeFileSync(
    entry,
    `export { burnMarker } from '${path.join(ROOT, 'src/lib/images').replace(/\\/g, '/')}';\n` +
      `export { padToRatio, pasteBack } from '${path.join(ROOT, 'src/lib/reframe').replace(/\\/g, '/')}';\n`,
  );
  execFileSync('npx', ['esbuild', '--bundle', '--format=iife', '--global-name=AndCanvas', '--log-level=error', entry, `--outfile=${out}`], {
    cwd: ROOT,
  });
  const code = fs.readFileSync(out, 'utf8');
  fs.unlinkSync(entry);
  fs.unlinkSync(out);
  return code;
}

const toDataURL = (file) =>
  `data:${file.endsWith('.png') ? 'image/png' : 'image/jpeg'};base64,${fs.readFileSync(file).toString('base64')}`;
const writeDataURL = (url, file) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));

(async () => {
  const [op, ...args] = process.argv.slice(2);
  const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  try {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await page.addScriptTag({ content: bundle() });
    if (op === 'burn') {
      const [input, rect, out] = args;
      const [x, y, w, h] = rect.split(',').map(Number);
      const url = await page.evaluate(([u, r]) => window.AndCanvas.burnMarker(u, r), [toDataURL(input), { x, y, w, h }]);
      writeDataURL(url, out);
    } else if (op === 'pad') {
      const [input, ratio, anchor, out] = args;
      const res = await page.evaluate(([u, r, a]) => window.AndCanvas.padToRatio(u, r, a), [toDataURL(input), ratio, anchor]);
      writeDataURL(res.dataURL, out);
      process.stdout.write(JSON.stringify(res.place));
    } else if (op === 'paste') {
      const [original, result, place, out] = args;
      const url = await page.evaluate(([o, r, p]) => window.AndCanvas.pasteBack(o, r, p), [
        toDataURL(original),
        toDataURL(result),
        JSON.parse(place),
      ]);
      writeDataURL(url, out);
    } else {
      throw new Error(`unknown op "${op}" — burn | pad | paste`);
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
