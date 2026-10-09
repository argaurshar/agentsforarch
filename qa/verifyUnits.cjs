// Run the pure-function unit checks in qa/units.ts.
//
// Run: node qa/verifyUnits.cjs
//
// Same mechanism as verifyContracts: bundle the TypeScript with esbuild, run it
// under node. No browser and no network — these are the checks that should be
// instant and should never flake.

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(os.tmpdir(), `and-units-${process.pid}.cjs`);

execFileSync(
  'npx',
  ['esbuild', '--bundle', '--platform=node', '--format=cjs', '--log-level=error',
   "--define:import.meta.env.BASE_URL='/'",
   path.join(__dirname, 'units.ts'), `--outfile=${TMP}`],
  { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
);
try {
  execFileSync('node', [TMP], { cwd: ROOT, stdio: 'inherit' });
} catch {
  process.exitCode = 1;
} finally {
  fs.unlinkSync(TMP);
}
