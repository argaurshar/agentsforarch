// Design-system lint for the app chrome. Guards the "clean modern SaaS" pass so
// the dated patterns the studio rejected (square hard-bordered boxes, shouty
// all-caps letterspaced mono labels, flat unlayered surfaces) cannot creep back.
//
// Run: node qa/designLint.cjs
//
// Scope note: client-facing print artefacts are intentionally editorial and are
// NOT linted — src/lib/deckRender.ts (deck pages) and src/lib/moodboard.ts
// (collage board) draw on canvas in a serif/mono print language by design.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const EXCLUDE = [
  path.join('lib', 'deckRender.ts'),
  path.join('lib', 'moodboard.ts'),
  path.join('lib', 'skill'),
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

function findAll(regex, label) {
  const hits = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (regex.test(line)) hits.push(`${path.relative(ROOT, f)}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
  }
  return hits;
}

// 1. No shouty all-caps letterspaced labels in the chrome. The dated signature
//    was `uppercase tracking-[0.14em]` (or wider) on every field label.
const shouty = findAll(/uppercase[^"'`]*tracking-\[0\.1[2-9]em\]|tracking-\[0\.2\d*em\][^"'`]*uppercase/);
check('no all-caps letterspaced mono labels in app chrome', shouty.length === 0, shouty.slice(0, 6).join('\n      '));

// 2. Interactive surfaces carry a radius. Catch bordered panels/buttons that
//    never got rounded during the modernization sweep. A `rounded-*` anywhere in
//    the same class list satisfies the rule (order within the list is arbitrary).
const squarePanels = findAll(
  /className=["'`][^"'`]*\bborder border-(?:hairline|ochre) bg-(?:paper|drafting|ochre)\b[^"'`]*["'`]/,
).filter((hit) => !/\brounded-/.test(hit));
check('bordered panels are rounded', squarePanels.length === 0, squarePanels.slice(0, 6).join('\n      '));

// 3. The accent must be legible: ochre backgrounds pair with white text, never
//    the cream `text-bone` used by the old palette.
const badAccent = findAll(/bg-ochre[^"'`]*text-bone/);
check('accent surfaces use white text', badAccent.length === 0, badAccent.slice(0, 6).join('\n      '));

// 4. Tokens: the modern palette + elevation scale must exist.
const css = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8');
check('modern palette tokens present', /--paper:\s*#ffffff/i.test(css) && /--ochre:\s*#e0561f/i.test(css));
check('card + pill component classes present', /\.card\s*{/.test(css) && /\.pill\s*{/.test(css));

const tw = fs.readFileSync(path.join(ROOT, 'tailwind.config.js'), 'utf8');
check('elevation tokens defined', /shadow-?[Cc]ard|card:/.test(tw) && /btn:/.test(tw));
check('radius scale not zeroed out', !/borderRadius:\s*{[^}]*DEFAULT:\s*'0'/s.test(tw));
check('shadow scale not zeroed out', !/boxShadow:\s*{[^}]*DEFAULT:\s*'none'/s.test(tw));

// 5. Display font wired up for headings.
check('display font configured', /Sora/.test(tw) && /Sora/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} design checks passed`);
process.exit(failed === 0 ? 0 : 1);
