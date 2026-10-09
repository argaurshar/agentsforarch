// Draws the bubble-diagram fixture for Bubble to Plan: public/examples/bubble-input.jpg
//
// The guide's own bubble diagram (#60) is test-only — the repo is public — so
// the worked example needs one we own. This draws it: a two-bedroom flat as
// loose, wobbly bubbles in marker, with the three relationships the prompt is
// built around all present, so the live run can check each one:
//   TOUCHING  living–kitchen, hall–living, hall–both bedrooms  → shared door
//   LINKED    entry–living, bath–hall, living–balcony (lines)   → an opening
//   APART     bedroom 1 and bedroom 2, kitchen and the bedrooms → no door
// It also carries handwriting that must NOT survive into the plan: a title, a
// note and a north mark.
//
// Deterministic: the wobble comes from a seeded generator, so re-running the
// script reproduces the same image byte for byte.
//
// Run: node qa/makeBubble.cjs
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'examples', 'bubble-input.jpg');
const W = 1000, H = 750;

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** A hand-drawn ellipse: a closed wobbly path, drawn twice slightly offset. */
function bubble(cx, cy, rx, ry) {
  const pass = () => {
    const pts = [];
    const start = rand() * Math.PI * 2;
    for (let i = 0; i <= 40; i += 1) {
      const t = start + (i / 40) * Math.PI * 2.08; // overshoot, like a pen does
      const wob = 1 + (rand() - 0.5) * 0.05;
      pts.push(`${(cx + Math.cos(t) * rx * wob).toFixed(1)},${(cy + Math.sin(t) * ry * wob).toFixed(1)}`);
    }
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="#1d1d1f" stroke-width="${(2.2 + rand()).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  };
  return pass() + pass();
}
function line(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2 + (rand() - 0.5) * 14, my = (y1 + y2) / 2 + (rand() - 0.5) * 14;
  return `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" fill="none" stroke="#1d1d1f" stroke-width="2.4" stroke-linecap="round"/>`;
}
function label(x, y, text, size = 26, rot = 0) {
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" transform="rotate(${rot} ${x} ${y})">${text}</text>`;
}

const B = {
  bed1: [230, 215, 135, 105], bath: [495, 160, 85, 88], bed2: [770, 225, 130, 100],
  hall: [490, 302, 192, 52], living: [330, 482, 195, 132], kitchen: [628, 500, 112, 96],
  entry: [585, 668, 72, 44], balcony: [92, 640, 66, 40],
};
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f7f5ef"/>
  <g font-family="'DejaVu Sans', sans-serif" font-style="italic" fill="#1d1d1f" letter-spacing="1">
    ${Object.values(B).map((b) => bubble(...b)).join('')}
    ${line(560, 640, 470, 590)}
    ${line(495, 245, 495, 262)}
    ${line(150, 590, 175, 565)}
    ${label(230, 223, 'BED 1')}
    ${label(495, 168, 'BATH', 22)}
    ${label(770, 233, 'BED 2')}
    ${label(490, 311, 'HALL', 20)}
    ${label(330, 492, 'LIVING', 32)}
    ${label(628, 498, 'KITCHEN', 22)}
    ${label(628, 524, '+ DINING', 18)}
    ${label(585, 676, 'ENTRY', 20)}
    ${label(92, 646, 'balcony', 16)}
    ${label(150, 60, '2 BED FLAT — zoning', 22, -2)}
    ${label(830, 690, 'living gets the sun!', 18, -4)}
    <path d="M930,120 L930,50 M918,66 L930,50 L942,66" fill="none" stroke="#1d1d1f" stroke-width="2.4" stroke-linecap="round"/>
    ${label(930, 145, 'N', 22)}
  </g>
</svg>`;

(async () => {
  const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.locator('svg').screenshot({ path: OUT, type: 'jpeg', quality: 88 });
  await browser.close();
  console.log(`Wrote ${path.relative(process.cwd(), OUT)} — ${W}×${H}, ${Math.round(fs.statSync(OUT).size / 1024)}KB`);
})();
