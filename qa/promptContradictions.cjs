// Assert that no prompt asks for a thing and forbids it in the same breath.
//
// Run: node qa/promptContradictions.cjs
//
// This exists because the two worst bugs this app has shipped were both
// SELF-CONTRADICTORY PROMPTS, not missing ones:
//
//   "windows must not change"  +  "add curtains"   -> drapery on blank walls,
//                                                     read as invented windows
//   "add restrained tonal shading" + "no shading"  -> the Shaded control does
//                                                     nothing at all
//
// Neither was catchable by anything already in the suite. `promptContracts`
// asserts a prompt CONTAINS a string; the snapshot asserts it has not CHANGED.
// A prompt can satisfy both while instructing the model to do and not do the
// same thing — and the model resolves that however it likes, usually by
// following whichever clause came last.
//
// So this gate works on pairs. For each variant, if BOTH sides of a pair are
// present, that variant is a contradiction. The pairs are specific phrases, not
// keywords: a general "no X / add X" detector would drown in false positives
// from prose, and a rule nobody trusts gets switched off.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SNAPSHOT = path.join(__dirname, 'prompt-snapshot.txt');

/**
 * Each pair is [asks, forbids, why]. A variant containing both fails.
 *
 * Every entry here is a bug that reached a commit, or the direct generalisation
 * of one. Do not add speculative pairs — an unfalsifiable rule is worse than no
 * rule, because it makes the failures look like noise.
 */
const PAIRS = [
  [
    'restrained tonal shading',
    'No shading, no gradients',
    'the Shaded section style is cancelled by the drawing-craft clause that follows it',
  ],
  [
    'add a curtain',
    'stays blank',
    'the original drapery bug: asking for window treatments while locking the shell',
  ],
  [
    'do not rotate it',
    'directly overhead',
    'a tool that must change viewpoint cannot also be told to keep the input viewpoint',
  ],
  [
    'do not rotate it',
    'LEFT of the building',
    'drawing a different face IS a rotation; forbidding rotation forbids the tool',
  ],
  [
    'do not rotate it',
    'RIGHT of the building',
    'drawing a different face IS a rotation; forbidding rotation forbids the tool',
  ],
  [
    'must be identical in shape',
    'Straighten every wobbly line',
    'straightening a hand sketch changes the outline; the lock clause outranks it and wins',
  ],
  [
    'full width and full depth',
    'one flat face and nothing else',
    'a plan-shaped dimension instruction reused on an elevation, which has no depth',
  ],
  // The Visualization category's shared lock enumerates what must not change.
  // Any tool whose job IS to change one of those things needs it dropped from
  // the list, not carved out afterwards.
  [
    'its materials come through completely unchanged',
    'ONLY THEN CHANGE THE MATERIAL',
    'the material study locks materials and then changes them',
  ],
  [
    'its materials come through completely unchanged',
    'ONLY THEN ADJUST THE GLASS',
    'glass is a material; the shared lock forbids touching it',
  ],
  [
    'its materials come through completely unchanged',
    'real material texture where the input only suggests it',
    'the upscaler is told to resolve material detail and to leave materials alone',
  ],
  [
    'its materials come through completely unchanged',
    'Fix the materials specifically',
    'the refiner is told to fix materials and to leave materials alone',
  ],
  // Diagrams & Boards is the first category where labels default ON, which puts
  // it one careless `.join()` away from the shaded-section bug in a new costume:
  // a mode's clause cancelled by a blanket clause appended after it. There the
  // blanket clause was "no shading"; here it is the no-text guard every other
  // category ends with.
  [
    'Spell every word correctly',
    'Do not add any watermark, signature, caption or stray text',
    'a prompt cannot demand correct spelling and forbid text in the same breath',
  ],
];

/**
 * Modes that claim to be stricter than another mode must actually forbid at
 * least as much. `none` emitting only the no-text guard while `labels` forbids
 * a north arrow and a scale bar means picking "No text" RELAXES the prompt.
 */
const MONOTONIC = [
  {
    stricter: /^(sketchplan|rendertoplan|cadelev|section):.*:none:/,
    looser: /^(sketchplan|rendertoplan|cadelev|section):.*:labels:/,
    mustForbid: ['no north arrow', 'no scale bar', 'no title block'],
    why: 'the no-text mode has to forbid everything the labelled mode forbids, and more',
  },
];

function loadVariants() {
  if (!fs.existsSync(SNAPSHOT)) {
    console.error('No prompt snapshot. Run: node qa/promptSnapshot.cjs --update');
    process.exit(1);
  }
  const out = new Map();
  const blocks = fs.readFileSync(SNAPSHOT, 'utf8').split('\n\n### ');
  blocks.forEach((b, i) => {
    const text = i === 0 ? b.replace(/^#+\s*/, '') : b;
    const nl = text.indexOf('\n');
    out.set(text.slice(0, nl).trim(), text.slice(nl + 1));
  });
  return out;
}

const variants = loadVariants();
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ ok, name });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '\n      ' + detail : ''}`);
};

for (const [asks, forbids, why] of PAIRS) {
  const hits = [];
  for (const [key, body] of variants) {
    if (body.includes(asks) && body.includes(forbids)) hits.push(key);
  }
  check(
    `no variant both asks "${asks.slice(0, 34)}" and states "${forbids.slice(0, 34)}"`,
    hits.length === 0,
    hits.length ? `${hits.length} variant(s), e.g. ${hits.slice(0, 3).join(', ')}\n      → ${why}` : '',
  );
}

for (const rule of MONOTONIC) {
  const missing = [];
  for (const [key, body] of variants) {
    if (!rule.stricter.test(key)) continue;
    for (const phrase of rule.mustForbid) {
      if (!body.includes(phrase)) missing.push(`${key} lacks "${phrase}"`);
    }
  }
  check(
    'the strictest annotation mode forbids at least as much as the looser one',
    missing.length === 0,
    missing.length ? `${missing.length} gap(s), e.g. ${missing.slice(0, 3).join('; ')}\n      → ${rule.why}` : '',
  );
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} contradiction checks passed  (${variants.size} variants scanned)`);
process.exit(failed === 0 ? 0 : 1);
