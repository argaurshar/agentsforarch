// Emits a (sample, tool) pair that has NO prepared result.
//
// Two e2e sections need one: the key gate must appear at the first REAL
// generation, and "two clicks reach a result" must exercise the generated path
// rather than the instant one. Both were hard-coded to the plan sample plus
// Floor Analysis, and both rotted the moment Floor Analysis gained a worked
// example from that very plan — the pair became instant, a keyless visitor
// correctly got an image instead of a key prompt, no request was sent, and a
// working app failed two of its own tests.
//
// A test whose subject is a literal cannot survive the data changing underneath
// it. This reads the same table `instant.ts` reads, so adding an example can
// never turn these red again.
//
// Emitted as JSON: { sampleKind, sampleFile, feature }.

import { ALL_FEATURES } from '../src/features/registry';
import { EXAMPLES } from '../src/lib/examples';
import { STUDIO_SAMPLES } from '../src/features/studio/samples';

/** `${asset}::${feature}` for every pair the front door can answer for free. */
const instant = new Set<string>();
for (const [feature, set] of Object.entries(EXAMPLES)) {
  for (const c of set?.cases ?? []) {
    if (!c.input) continue;
    instant.add(`${c.input.slice(c.input.lastIndexOf('/') + 1)}::${feature}`);
  }
}

// The caller's section also asserts that a DIAGRAM offers no next step, so the
// pair must be one whose tool is an end of the chain (`outputKind: null`).
// Requiring it rather than preferring it keeps that coverage guaranteed: a
// silent fallback to a chainable tool would quietly drop two real checks while
// still reporting green.
let found: { sampleKind: string; sampleFile: string; feature: string } | null = null;
for (const sample of STUDIO_SAMPLES) {
  // The shortlist offers tools that accept this kind. A tool needing a second
  // image or a marked region never runs from the drop zone, so it cannot be the
  // subject here either.
  const candidates = ALL_FEATURES.filter(
    (f) =>
      f.inputKind.includes(sample.kind) &&
      f.inputMode === 'image' &&
      f.marker !== 'required' &&
      f.outputKind === null &&
      !instant.has(`${sample.file}::${f.key}`),
  );
  if (candidates.length) {
    found = { sampleKind: sample.kind, sampleFile: sample.file, feature: candidates[0].key };
    break;
  }
}

if (!found) {
  // Not a failure to paper over: it would mean every sample's diagram tools can
  // all be answered for free, leaving the generated path and the key gate with
  // no reachable subject at all.
  throw new Error(
    'no (sample, diagram-tool) pair without a prepared result — the generated-path tests have no subject',
  );
}
console.log(JSON.stringify(found));
