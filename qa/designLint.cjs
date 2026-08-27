// Design-system lint for the app chrome. Guards the "clean modern SaaS" pass so
// the dated patterns the studio rejected (square hard-bordered boxes, shouty
// all-caps letterspaced mono labels, flat unlayered surfaces) cannot creep back.
//
// Run: node qa/designLint.cjs
//
// Scope note: client-facing print artefacts are intentionally editorial and are
// NOT linted — src/lib/moodboard.ts (the collage board) draws on canvas in a
// serif/mono print language by design.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const EXCLUDE = [
  path.join('lib', 'moodboard.ts'),
  path.join('lib', 'social.ts'),
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = walk(SRC).filter((f) => !EXCLUDE.some((x) => f.includes(x)));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ ok, name });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '\n      ' + detail : ''}`);
};

// Hits carry the FULL source line. Truncating here would hide class names from
// downstream filters (e.g. a `rounded-*` sitting past column 100).
function findAll(regex) {
  const hits = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (regex.test(line)) hits.push(`${path.relative(ROOT, f)}:${i + 1}  ${line.trim()}`);
    });
  }
  return hits;
}

/** Trim hits only for display. */
const show = (hits, n = 6) => hits.slice(0, n).map((h) => h.slice(0, 130)).join('\n      ');

// 1. No shouty all-caps letterspaced labels in the chrome. The dated signature
//    was `uppercase tracking-[0.14em]` (or wider) on every field label.
const shouty = findAll(/uppercase[^"'`]*tracking-\[0\.1[2-9]em\]|tracking-\[0\.2\d*em\][^"'`]*uppercase/);
check('no all-caps letterspaced mono labels in app chrome', shouty.length === 0, show(shouty));

// 2. Interactive surfaces carry a radius. Catch bordered panels/buttons that
//    never got rounded during the modernization sweep. A `rounded-*` anywhere in
//    the same class list satisfies the rule (order within the list is arbitrary),
//    and so do the `card` / `pill` component classes, which set the radius
//    themselves in index.css — flagging those was the rule reporting on where the
//    radius is written rather than on whether there is one.
const squarePanels = findAll(
  /className=["'`][^"'`]*\bborder border-(?:hairline|ochre) bg-(?:paper|drafting|ochre)\b[^"'`]*["'`]/,
).filter((hit) => !/\brounded-|\b(?:card|pill)\b/.test(hit));
check('bordered panels are rounded', squarePanels.length === 0, show(squarePanels));

// 3. The accent must be legible: ochre backgrounds pair with white text, never
//    the cream `text-bone` used by the old palette.
const badAccent = findAll(/bg-ochre[^"'`]*text-bone/);
check('accent surfaces use white text', badAccent.length === 0, show(badAccent));

// 4. Tokens: the modern palette + elevation scale must exist.
const css = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8');
check(
  'modern palette tokens present',
  /--paper-rgb:\s*255 255 255/.test(css) && /--ochre-rgb:\s*224 86 31/.test(css),
);
check('card + pill component classes present', /\.card\s*{/.test(css) && /\.pill\s*{/.test(css));

const tw = fs.readFileSync(path.join(ROOT, 'tailwind.config.js'), 'utf8');
check('elevation tokens defined', /shadow-?[Cc]ard|card:/.test(tw) && /btn:/.test(tw));
check('radius scale not zeroed out', !/borderRadius:\s*{[^}]*DEFAULT:\s*'0'/s.test(tw));
check('shadow scale not zeroed out', !/boxShadow:\s*{[^}]*DEFAULT:\s*'none'/s.test(tw));

// 5. Display font wired up for headings.
check('display font configured', /Sora/.test(tw) && /Sora/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));

// 6. Colour tokens must be RGB channels mapped with <alpha-value>. Mapping them
//    to bare `var(--x)` hex makes Tailwind's colour parser bail and silently
//    drops EVERY alpha modifier (`bg-ink/70`, `bg-ochre/10`) from the build —
//    scrims stop dimming and tinted panels render with no background at all.
check(
  'colour tokens support alpha modifiers',
  /<alpha-value>/.test(tw) && /--ink-rgb:/.test(css),
  'map colours as rgb(var(--x-rgb) / <alpha-value>) and publish channel tokens',
);

// 7. A semantic ramp must exist — the brand accent means "primary action",
//    never "error"/"warning"/"success".
check('semantic state tokens present', /--danger-rgb:/.test(css) && /--warning-rgb:/.test(css) && /--success-rgb:/.test(css));

// 8. The accent glow is reserved for the primary Button. Everywhere else it is
//    noise that flattens the visual hierarchy.
const glow = findAll(/shadow-btn/).filter((h) => !/components\/ui\/(Button|IconButton)\.tsx/.test(h));
check('accent glow reserved for the primary button', glow.length === 0, show(glow));

// 9. The editorial serif belongs to client deliverables (the board), not chrome.
const serif = findAll(/font-serif/);
check('no editorial serif in app chrome', serif.length === 0, show(serif));

// 10. Focus is handled globally by :focus-visible in index.css. `focus:outline-none`
//     removes it, and a bare `focus-visible:outline-ochre` only sets a colour.
const focusKilled = findAll(/focus:outline-none/);
check('global focus ring never suppressed', focusKilled.length === 0, show(focusKilled));

// 11. Type comes from the registered scale, not arbitrary rem values.
const arbitraryType = findAll(/text-\[[0-9.]+rem\]/);
check(
  'type uses the registered scale',
  arbitraryType.length === 0,
  `${arbitraryType.length} arbitrary sizes; use text-body / text-label / text-caption / text-title\n      ` +
    arbitraryType.slice(0, 5).join('\n      '),
);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} design checks passed`);
process.exit(failed === 0 ? 0 : 1);
