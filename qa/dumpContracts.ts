// Emits, as JSON, every tool's DEFAULT prompt alongside the contracts it
// declares — so qa/verifyContracts.cjs can check that each tool's own prompt
// actually satisfies its own promise.
//
// `promptContracts` sat on 30 tools and 81 entries with nothing evaluating a
// single regex: qa/registryLint.cjs only asserted the array was non-empty, and
// qa/verifyEngines.cjs re-typed a subset of the same patterns by hand into
// four hard-coded tables. So a contract could name a phrase the prompt had
// never contained, or had stopped containing, and everything stayed green.

import { ALL_FEATURES } from '../src/features/registry';

const ctx = { useMoodboard: false, useStyleRef: false };
const out = ALL_FEATURES.map((def) => ({
  key: def.key,
  prompt: def.buildPrompt(def.defaultSettings, ctx),
  contracts: def.promptContracts.map((c) => ({
    name: c.name,
    source: c.pattern.source,
    flags: c.pattern.flags,
  })),
}));
console.log(JSON.stringify(out, null, 2));
