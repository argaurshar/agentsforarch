// Snapshot every prompt the app can generate and diff against qa/prompt-snapshot.txt.
//
// Run:  node qa/promptSnapshot.cjs            (verify)
//       node qa/promptSnapshot.cjs --update   (accept an intentional change)
//
// Prompt text is the app's real product surface and the layer TypeScript is
// blind to. Two shipped bugs — a squared-off floor plan and invented windows —
// were prompt-wording problems that compiled perfectly. This is the only gate
// that can catch a third.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SNAPSHOT = path.join(__dirname, 'prompt-snapshot.txt');
const TMP = path.join(ROOT, 'node_modules', '.cache', 'prompt-dump.cjs');

fs.mkdirSync(path.dirname(TMP), { recursive: true });
execFileSync(
  'npx',
  ['esbuild', '--bundle', '--platform=node', '--format=cjs', '--log-level=error',
   path.join(__dirname, 'dumpPrompts.ts'), `--outfile=${TMP}`],
  { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
);
const actual = execFileSync('node', [TMP], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

if (process.argv.includes('--update')) {
  fs.writeFileSync(SNAPSHOT, actual);
  console.log(`Snapshot updated — ${actual.split('\n\n').length} prompt variants.`);
  process.exit(0);
}

if (!fs.existsSync(SNAPSHOT)) {
  console.error('No prompt snapshot. Run: node qa/promptSnapshot.cjs --update');
  process.exit(1);
}

const expected = fs.readFileSync(SNAPSHOT, 'utf8');
if (actual === expected) {
  console.log(`PASS  ${actual.split('\n\n').length} prompt variants byte-identical to the snapshot`);
  process.exit(0);
}

// Report which named variants changed, not a wall of prose.
const parse = (t) => new Map(t.split('\n\n### ').map((b, i) => {
  const s = i === 0 ? b.replace(/^### /, '') : b;
  const nl = s.indexOf('\n');
  return [s.slice(0, nl), s.slice(nl + 1)];
}));
const [a, e] = [parse(actual), parse(expected)];
const changed = [...e.keys()].filter((k) => a.has(k) && a.get(k) !== e.get(k));
const removed = [...e.keys()].filter((k) => !a.has(k));
const added = [...a.keys()].filter((k) => !e.has(k));

console.error('FAIL  prompt text changed\n');
for (const k of changed.slice(0, 10)) console.error(`  ~ ${k}`);
for (const k of removed.slice(0, 10)) console.error(`  - ${k}`);
for (const k of added.slice(0, 10)) console.error(`  + ${k}`);
console.error(
  `\n${changed.length} changed, ${removed.length} removed, ${added.length} added.\n` +
  'If intentional: node qa/promptSnapshot.cjs --update, and say so in the commit.',
);
process.exit(1);
