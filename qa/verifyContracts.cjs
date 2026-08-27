// Assert that every tool's DEFAULT prompt satisfies every contract it declares.
//
// Run: node qa/verifyContracts.cjs
//
// The gap this closes: `promptContracts` existed on every FeatureDef and NOTHING
// ran the regexes. registryLint checked only that the array was non-empty;
// verifyEngines re-typed a subset by hand into four tables, which is duplication
// pretending to be coverage — a tool whose contract nobody remembered to copy
// across was guarded by nothing at all.
//
// Deliberately checked against DEFAULT settings, and deliberately static. A
// contract that only holds for one non-default combination is a mis-scoped
// contract: the thing it guards belongs in the snapshot (which covers every
// variant) or in a per-variant assertion, not in a field named after the tool.
// Failing here on such an entry is the gate working, not a false positive.

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(os.tmpdir(), `and-contracts-${process.pid}.cjs`);

execFileSync(
  'npx',
  ['esbuild', '--bundle', '--platform=node', '--format=cjs', '--log-level=error',
   path.join(__dirname, 'dumpContracts.ts'), `--outfile=${TMP}`],
  { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
);
const tools = JSON.parse(execFileSync('node', [TMP], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
fs.unlinkSync(TMP);

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ ok, name });
  if (!ok) console.log(`FAIL  ${name}${detail ? '\n      ' + detail : ''}`);
};

let contractCount = 0;
for (const tool of tools) {
  // A tool with no contracts is already a registryLint failure; assert it here
  // too so this script is meaningful on its own.
  check(`${tool.key} declares at least one contract`, tool.contracts.length > 0);
  for (const c of tool.contracts) {
    contractCount += 1;
    const re = new RegExp(c.source, c.flags);
    check(
      `${tool.key}: ${c.name}`,
      re.test(tool.prompt),
      `/${c.source}/${c.flags} does not match this tool's default prompt`,
    );
  }
}

const failed = results.filter((r) => !r.ok).length;
console.log(
  `${failed ? '\n' : ''}${results.length - failed}/${results.length} contract checks passed  ` +
    `(${contractCount} contracts across ${tools.length} tools)`,
);
process.exit(failed === 0 ? 0 : 1);
