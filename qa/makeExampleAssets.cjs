// Turns the live-run PNGs into shipped, web-sized example assets.
//
// The app's worked-example showcase reads `src/lib/examples.ts`, and until now
// only the original five tools had entries — the other twenty-five showed
// nothing, because a worked example needs a real generation and generations
// cost money. Three rounds of live verification produced twenty-eight of them,
// with known inputs. This puts them to work.
//
// WHY A BROWSER. There is no image library in this project and none is worth
// adding for a build-time script. The raw outputs are 380-790KB PNGs and the
// shipped assets top out around 94KB, so they must be resized and re-encoded.
// Chromium is already installed, and a canvas does both: draw at a bounded
// width, `toDataURL('image/jpeg', q)`, and read the result back out of the DOM
// with `--dump-dom`. No network, no new dependency.
//
// The manifest below names the BEST run per tool, which is not always the first
// one: where a round-1 run failed and the fix was verified later, the verified
// image is the one that ships. Shipping the failure as a worked example would be
// advertising a bug.
//
// Run: node qa/makeExampleAssets.cjs [--force]

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'qa', 'live-results');
const OUT = path.join(ROOT, 'public', 'examples');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const MAX_W = 1200;
const QUALITY = 0.82;

/** [source PNG in qa/live-results, asset name in public/examples, why this run]. */
const MANIFEST = [
  ['run-01-output.png', 'ex-massing.jpg', 'massing — text-only, no input image'],
  ['run-02-output.png', 'ex-multiview.jpg', 'multiView'],
  ['run-03-output.png', 'ex-cad-elevation.jpg', 'cadElevation — rear face'],
  ['run-04-output.png', 'ex-section.jpg', 'section'],
  ['run-05-output.png', 'ex-render-to-plan.jpg', 'renderToPlan'],
  ['run-V1-output.png', 'ex-urban-context.jpg', 'urbanContext — the FIXED run; 06 invented shopfronts'],
  ['run-07-output.png', 'ex-floor-analysis.jpg', 'floorAnalysis — zoning'],
  ['run-V2-output.png', 'ex-exploded-axon.jpg', 'explodedAxon — the FIXED run; 08 hipped the roof'],
  ['run-09-output.png', 'ex-annotation.jpg', 'annotation'],
  ['run-10-output.png', 'ex-sketch-plan.jpg', 'sketchPlan'],
  ['run-11-output.png', 'ex-sketch-render.jpg', 'sketchRender'],
  ['run-V3-output.png', 'ex-declutter.jpg', 'declutter — the FIXED run; 12 moved the camera'],
  ['run-13-output.png', 'ex-spec-sheet.jpg', 'specSheet'],
  ['run-14-output.png', 'ex-facade-material.jpg', 'facadeMaterial'],
  ['run-15-output.png', 'ex-watercolour.jpg', 'watercolour'],
  ['fixture-room-marked.png', 'ex-room-marked.jpg', 'INPUT for targetedSwap — the red box'],
  ['run-V5-output.png', 'ex-targeted-swap.jpg', 'targetedSwap'],
  // V4 (interior/stage) is deliberately NOT here: `interior` already ships a
  // Stage case from an earlier session, and a second staging example would be a
  // duplicate shipped only because the image happened to exist.
  ['run-V7-output.png', 'ex-upscale.jpg', 'upscale — the FIXED run; V6 rendered the drawing'],
  ['run-W6-output.png', 'ex-atmosphere.jpg', 'atmosphere — the FIXED run; W1 hipped the roof'],
  ['run-W2-output.png', 'ex-human-scale.jpg', 'humanScale'],
  ['run-W3-output.png', 'ex-reflection.jpg', 'reflection'],
  ['run-W4-output.png', 'ex-render-refine.jpg', 'renderRefine'],
  ['run-W5-output.png', 'ex-program-diagram.jpg', 'programDiagram'],
];

function encode(srcFile, tmpDir) {
  const b64 = fs.readFileSync(path.join(SRC, srcFile)).toString('base64');
  const html = path.join(tmpDir, 'e.html');
  fs.writeFileSync(html, `<div id="o"></div><script>
window.addEventListener('load', function () {
  var i = new Image();
  i.onload = function () {
    var s = Math.min(1, ${MAX_W} / i.width);
    var c = document.createElement('canvas');
    c.width = Math.round(i.width * s); c.height = Math.round(i.height * s);
    var x = c.getContext('2d');
    // Flatten onto white: a PNG with alpha would otherwise composite to black
    // in JPEG, which has no alpha channel.
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(i, 0, 0, c.width, c.height);
    document.getElementById('o').textContent = c.toDataURL('image/jpeg', ${QUALITY});
  };
  i.src = 'data:image/png;base64,${b64}';
});
</script>`);
  const dom = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--virtual-time-budget=15000', '--dump-dom', `file://${html}`,
  ], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  const m = /data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/.exec(dom);
  if (!m) throw new Error(`no JPEG came back for ${srcFile}`);
  return Buffer.from(m[1], 'base64');
}

const force = process.argv.includes('--force');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'and-examples-'));
let written = 0, skipped = 0, total = 0;
for (const [srcFile, outName, why] of MANIFEST) {
  const dest = path.join(OUT, outName);
  if (!force && fs.existsSync(dest)) {
    skipped += 1;
    total += fs.statSync(dest).size;
    continue;
  }
  if (!fs.existsSync(path.join(SRC, srcFile))) {
    throw new Error(`${srcFile} is missing — re-run the live harness before this script`);
  }
  const buf = encode(srcFile, tmpDir);
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error(`${outName} is not a JPEG`);
  fs.writeFileSync(dest, buf);
  written += 1;
  total += buf.length;
  console.log(`${outName.padEnd(26)} ${String(Math.round(buf.length / 1024)).padStart(4)}KB   ${why}`);
}
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(`\n${written} written, ${skipped} already present. ${Math.round(total / 1024)}KB total.`);
