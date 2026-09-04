// Assert that every quick axis is real: its key is a real setting, and moving
// it actually changes the prompt.
//
// Run: node qa/verifyQuick.cjs
//
// WHY THIS EXISTS. `quick` is a declaration that two surfaces render — the tool
// screen and the front door's Tweak sheet. Nothing connects it to the prompt
// builders. So an axis can name a key no builder reads, or offer a value
// outside the settings union, and the result is a chip row that looks correct,
// responds to taps, and changes nothing about the image.
//
// That failure is invisible in every other gate here: tsc sees a valid key,
// registryLint sees a well-formed object, the snapshot sees no change (there
// isn't one), and the contracts check only the default prompt. It is also
// invisible on screen — a control that does nothing looks exactly like a model
// that ignored the instruction, which is the excuse it would hide behind.

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(os.tmpdir(), `and-quick-${process.pid}.cjs`);

execFileSync(
  'npx',
  ['esbuild', '--bundle', '--platform=node', '--format=cjs', '--log-level=error',
   path.join(__dirname, 'dumpQuick.ts'), `--outfile=${TMP}`],
  { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
);
const tools = JSON.parse(execFileSync('node', [TMP], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
fs.unlinkSync(TMP);

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ ok, name });
  if (!ok) console.log(`FAIL  ${name}${detail ? '\n      ' + detail : ''}`);
};

let axisCount = 0;
let toolsWithAxes = 0;

for (const tool of tools) {
  if (tool.axes.length === 0) continue;
  toolsWithAxes += 1;
  for (const axis of tool.axes) {
    axisCount += 1;

    // 1. The key is a real setting. `Extract<keyof S, string>` already makes a
    //    typo a build error — this catches the other direction, a key that is
    //    typed correctly against a settings interface the tool does not use.
    check(
      `${tool.key}.${axis.key} is a real setting`,
      tool.defaultKeys.includes(axis.key),
      `not in defaultSettings: ${tool.defaultKeys.join(', ')}`,
    );

    // 2. A choice with one option is a label, not a control.
    check(`${tool.key}.${axis.key} offers a choice`, axis.values.length >= 2, `${axis.values.length} value(s)`);

    // 3. Moving it changes the REQUEST — prompt, provider options and pinned
    //    aspect ratio together. Distinct, not merely "some pair differs": two
    //    options that build the same request are two chips that do the same
    //    thing, which is its own kind of lie.
    const seen = new Map();
    for (const v of axis.values) {
      const twin = seen.get(v.shape);
      check(
        `${tool.key}.${axis.key}="${v.value}" changes the request`,
        twin === undefined,
        twin === undefined ? '' : `builds exactly what "${twin}" builds — two chips, one behaviour`,
      );
      if (twin === undefined) seen.set(v.shape, v.value);
    }
  }
}

const failed = results.filter((r) => !r.ok).length;
console.log(
  `${failed ? '\n' : ''}${results.length - failed}/${results.length} quick-axis checks passed  ` +
    `(${axisCount} axes across ${toolsWithAxes} tools)`,
);
process.exit(failed === 0 ? 0 : 1);
