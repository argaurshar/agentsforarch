// Builds the red-rectangle fixture the marker test needs.
//
// The app burns the box with `burnMarker` in src/lib/images.ts, which is
// canvas-based and therefore browser-only. This reproduces its output
// headlessly: same pure red, same stroke scaled to the image, same PNG output
// (PNG, not JPEG, because JPEG ringing around pure red on a light ground is
// exactly the artefact that would make the model read the mark as part of the
// drawing).
//
// Two Chromium quirks are handled here rather than left as surprises:
//   1. `--window-size` sets the WINDOW, and the viewport is ~85px shorter. So
//      the window is oversized by that band and the band is cropped back off.
//   2. An <img> with an explicit CSS height did not honour it under headless.
//      A full-bleed background-size:100% 100% does, and cannot letterbox.
//
// Run: node qa/makeMarker.cjs
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'examples', 'room-input.jpg');
const OUT = path.join(ROOT, 'qa', 'live-results', 'fixture-room-marked.png');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CHROME_BAND = 85; // window height minus viewport height, measured
const W = 860, H = 470;
// The sofa, in fractions of the image — the same 0..1 rect the UI stores.
const RECT = { x: 0.07, y: 0.3, w: 0.35, h: 0.55 };

function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error('no SOF marker');
}

/** Crop rows off the BOTTOM of a PNG. Safe without un-filtering: a PNG row
 *  filter only ever references the row ABOVE, so every retained row keeps its
 *  reference. Cropping from the top would not be safe. */
function cropBottom(inFile, outFile, drop) {
  const buf = fs.readFileSync(inFile);
  let i = 8, ihdr = null;
  const idat = [], others = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    const data = buf.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') ihdr = Buffer.from(data);
    else if (type === 'IDAT') idat.push(data);
    else if (type !== 'IEND') others.push({ type, data });
    i += 12 + len;
  }
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4);
  if (ihdr[8] !== 8) throw new Error(`expected 8-bit PNG, got ${ihdr[8]}`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr[9]];
  const stride = 1 + w * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const newH = h - drop;
  ihdr.writeUInt32BE(newH, 4);
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    out.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])) >>> 0, 8 + data.length);
    return out;
  };
  fs.writeFileSync(outFile, Buffer.concat([
    buf.subarray(0, 8),
    chunk('IHDR', ihdr),
    ...others.map((o) => chunk(o.type, o.data)),
    chunk('IDAT', zlib.deflateSync(raw.subarray(0, newH * stride), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
  return { w, from: h, to: newH };
}

const size = jpegSize(SRC);
if (size.w !== W || size.h !== H) throw new Error(`fixture is ${size.w}x${size.h}, expected ${W}x${H}`);
const stroke = Math.max(3, Math.round(Math.min(W, H) * 0.006)); // matches burnMarker
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'and-marker-'));
const html = path.join(tmpDir, 'mark.html');
const rawPng = path.join(tmpDir, 'raw.png');
fs.writeFileSync(html, `<style>
html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}
body{background:url("data:image/jpeg;base64,${fs.readFileSync(SRC).toString('base64')}") no-repeat center/100% 100%}
#r{position:absolute;left:${RECT.x * 100}%;top:${RECT.y * 100}%;width:${RECT.w * 100}%;height:${RECT.h * 100}%;
   border:${stroke}px solid #ff0000;box-sizing:border-box}
</style><div id="r"></div>`);

execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--window-size=${W},${H + CHROME_BAND}`, `--screenshot=${rawPng}`, `file://${html}`,
], { stdio: ['ignore', 'ignore', 'ignore'] });

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const r = cropBottom(rawPng, OUT, CHROME_BAND);
fs.rmSync(tmpDir, { recursive: true, force: true });
if (r.to !== H) throw new Error(`cropped to ${r.to}, expected ${H}`);
console.log(`fixture-room-marked.png  ${r.w}x${r.to}  stroke ${stroke}px  rect ${JSON.stringify(RECT)}`);
