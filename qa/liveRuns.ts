// The 15 risk-first live runs, driven through the app's OWN request builder and
// provider — not a reimplementation of them.
//
// WHY NOT THE BROWSER. `qa/liveVerify.cjs` drives the real UI, which is the
// better test and is still the right tool wherever it can run. It cannot run
// here: this sandbox reaches the API from Node (curl and fetch both return 200)
// but the egress proxy resets the browser's TLS tunnels — `ERR_CONNECTION_RESET`
// on every https request Chromium makes, matching the `ws_closed_mid_exchange`
// entries the proxy's own status page reports. Two runs were spent establishing
// that, and neither reached Google, so neither was billed.
//
// What is lost by dropping the DOM is the button wiring, and that is the one
// layer already covered exhaustively — 385 mocked end-to-end checks drive every
// screen. What is NOT lost is the thing worth paying for: `buildFeatureRequest`,
// each tool's own `buildPrompt` and `toOptions`, the real aspect-ratio pinning,
// and the real provider. Those build the request byte for byte as the app does.

import fs from 'node:fs';
import path from 'node:path';
import { ALL_FEATURES, buildFeatureRequest, featureDef } from '../src/features/registry';
import type { FeatureKind } from '../src/types';
import { setGeminiConfig } from '../src/providers/runtimeConfig';
import { getActiveProvider } from '../src/providers';
import { jobsFor } from '../src/providers/shared';

// Bundled to a temp file before running (esbuild → CJS), so `__dirname` points
// at the bundle, not the repo. Run from the repo root.
const ROOT = process.cwd();
const EXAMPLES = path.join(ROOT, 'public', 'examples');
const OUT = path.join(ROOT, 'qa', 'live-results');

interface Run {
  id: string;
  tool: FeatureKind;
  title: string;
  input: string | null;
  /** Settings overrides — the non-default variant, when that IS the risk. */
  settings?: Record<string, unknown>;
  verdicts: string[];
}

const RUNS: Run[] = [
  {
    id: '01', tool: 'massing', input: null,
    title: 'Does text-only generation work on an image-editing model at all?',
    verdicts: ['PASS — a white massing model matching the typed brief', 'FAIL — no image, or an image unrelated to the brief'],
    settings: {
      brief: 'A 40-unit residential block with ground-floor retail around a courtyard',
      siteSize: '45m x 60m corner plot',
      context: 'Four-storey terraces on two sides, a park to the south',
    },
  },
  {
    id: '02', tool: 'multiView', input: 'elev-rendered.jpg',
    title: 'Six panels of one building. Do they agree with each other?',
    verdicts: ['PASS — every panel is the same building; storey count and window rhythm match', 'FAIL — panels disagree, or a single image came back'],
  },
  {
    id: '03', tool: 'cadElevation', input: 'elev-rendered.jpg', settings: { face: 'rear' },
    title: 'The rear face is not in the input. Reconstructed, or hallucinated?',
    verdicts: ['PASS — a flat orthographic rear elevation consistent with the front', 'FAIL — the front returned unchanged, or an unrelated building'],
  },
  {
    id: '04', tool: 'section', input: 'elev-rendered.jpg',
    title: 'Can a section be cut from one exterior view with no storey heights given?',
    verdicts: ['PASS — a cut section with a consistent floor rhythm and a poched cut line', 'FAIL — an elevation with no cut, or incoherent floors'],
  },
  {
    id: '05', tool: 'renderToPlan', input: 'elev-rendered.jpg',
    title: 'Running the pipeline BACKWARDS — does a usable plan come out?',
    verdicts: ['PASS — a top-down 2D plan whose footprint matches the massing', 'FAIL — a 3D/angled drawing, or a generic unrelated plan'],
  },
  {
    id: '06', tool: 'urbanContext', input: 'elev-rendered.jpg',
    title: 'Signage was asked for while stray text was forbidden. Does it stay clean?',
    verdicts: ['PASS — a street with neighbours and NO invented lettering', 'FAIL — shopfront signage or garbled text appears'],
  },
  {
    id: '07', tool: 'floorAnalysis', input: 'plan-input.jpg', settings: { layer: 'zoning' },
    title: 'The zoning layer demanded a keyed legend from outside the labels branch.',
    verdicts: ['PASS — coloured zones with a legend that matches them', 'FAIL — a legend naming zones that are not marked, or an obscured plan'],
  },
  {
    id: '08', tool: 'explodedAxon', input: 'elev-rendered.jpg', settings: { axis: 'layered' },
    title: 'Outward explodes diagonally; the prompt used to ask for VERTICAL guides.',
    verdicts: ['PASS — layers separated outward, guides following the explode direction', 'FAIL — vertical guides on a diagonal explode, or nothing exploded'],
  },
  {
    id: '09', tool: 'annotation', input: 'elev-rendered.jpg',
    title: 'The one tool that MUST write on the image. Is the text real words?',
    verdicts: ['PASS — arrows and legible, correctly spelled labels', 'FAIL — gibberish label-shapes, or no labels at all'],
  },
  {
    id: '10', tool: 'sketchPlan', input: 'sketch-input.jpg',
    title: 'Does a rough sketch become a CAD-style plan without inventing rooms?',
    verdicts: ['PASS — clean linework whose layout matches the sketch', 'FAIL — an invented plan, or the sketch barely changed'],
  },
  {
    id: '11', tool: 'sketchRender', input: 'sketch-input.jpg',
    title: "Does the render keep the sketch's masses, or replace them?",
    verdicts: ['PASS — same viewpoint and masses, resolved into a finished image', 'FAIL — a handsome building that is not the one drawn'],
  },
  {
    id: '12', tool: 'declutter', input: 'room-input.jpg',
    title: 'Does a strip-out keep the architecture and remove only the movable?',
    verdicts: ['PASS — same room, same windows and camera, emptied', 'FAIL — the shell changed, or furniture remains'],
  },
  {
    id: '13', tool: 'specSheet', input: 'room-input.jpg',
    title: 'A knolling flat-lay must not become a mood board — and it carries text.',
    verdicts: ["PASS — items from THIS room, flat on white, spelled correctly", 'FAIL — a collage of similar products, or gibberish labels'],
  },
  {
    id: '14', tool: 'facadeMaterial', input: 'elev-rendered.jpg',
    title: 'Does a material swap leave the geometry completely alone?',
    verdicts: ['PASS — identical building, different facade material', 'FAIL — geometry moved with the material, or nothing changed'],
  },
  {
    id: '15', tool: 'watercolour', input: 'elev-rendered.jpg',
    title: 'Does a stylised pass keep the building, or reinvent it?',
    verdicts: ['PASS — the same building, rendered as a watercolour', 'FAIL — a different building, or an unchanged photo'],
  },
];

function dataUrl(file: string): string {
  const buf = fs.readFileSync(path.join(EXAMPLES, file));
  const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

(async () => {
  const dry = process.argv.includes('--dry');
  const key = process.env.GEMINI_API_KEY;
  if (!key && !dry) throw new Error('No GEMINI_API_KEY — nothing run, nothing spent.');
  if (!dry && !process.argv.includes('--yes-spend')) throw new Error('Paid. Re-run with --yes-spend.');

  const only = (process.argv.find((a) => a.startsWith('--runs=')) ?? '').replace('--runs=', '').split(',').filter(Boolean);
  setGeminiConfig({ engine: 'gemini', key: key ?? 'dry-run', remember: false });
  const provider = getActiveProvider();
  if (!provider) throw new Error('No active provider after configuring the key.');

  fs.mkdirSync(OUT, { recursive: true });
  const report: unknown[] = [];
  let spent = 0;
  let planned = 0;

  for (const run of RUNS) {
    if (only.length && !only.includes(run.id)) continue;
    const def = featureDef(run.tool);
    const settings = { ...def.defaultSettings, ...(run.settings ?? {}) } as never;
    const ctx = { refine: false };
    const prompt = def.buildPrompt(settings, { useMoodboard: false, useStyleRef: false, hasMarker: false });
    const req = buildFeatureRequest(run.tool, settings, {
      inputImages: run.input ? [dataUrl(run.input)] : [],
      prompt,
      ctx,
    });

    // How many API calls this ONE request becomes. `provider.generate` expands a
    // request into per-image jobs internally, so a tool that returns a sheet of
    // six views bills six times. Counting it here — with the app's own
    // `jobsFor` — is the difference between a 15-call budget and a 40-call one.
    const jobs = jobsFor(req, prompt);
    process.stdout.write(`\n─── ${run.id} · ${run.tool}  (${jobs.length} call${jobs.length === 1 ? '' : 's'})\n    ${run.title}\n`);
    fs.writeFileSync(path.join(OUT, `run-${run.id}-prompt.txt`), jobs.map((j) => `# ${j.label}\n${j.prompt}`).join('\n\n---\n\n'));
    // The input is NOT copied here: every fixture already ships in
    // `public/examples/`, and `report.json` names the one each run used.
    if (dry) {
      planned += jobs.length;
      continue;
    }

    try {
      const result = await provider.generate(req);
      spent += jobs.length;
      const failures = result.failures ?? [];
      for (const f of failures) console.log(`    FAILED  ${f.label} — ${f.error.slice(0, 160)}`);
      if (!result.images.length) {
        report.push({ ...run, status: 'no-image', calls: jobs.length, failures });
        continue;
      }
      // Every panel is saved, not just the first: a six-view sheet that agrees
      // with itself can only be judged from all six.
      const saved: string[] = [];
      result.images.forEach((img, i) => {
        const b64 = img.url.split(',')[1];
        const suffix = result.images.length > 1 ? `-${String(i + 1).padStart(2, '0')}` : '';
        const file = `run-${run.id}-output${suffix}.png`;
        fs.writeFileSync(path.join(OUT, file), Buffer.from(b64, 'base64'));
        saved.push(file);
        console.log(`    OK  ${img.label}  ${Math.round((b64.length * 0.75) / 1024)}KB  → ${file}`);
      });
      report.push({
        ...run,
        status: failures.length ? 'partial' : 'generated',
        calls: jobs.length,
        labels: result.images.map((i) => i.label),
        files: saved,
        failures,
      });
    } catch (err) {
      console.log(`    ERROR — ${String(err).slice(0, 200)}`);
      report.push({ ...run, status: 'error', calls: jobs.length, why: String(err).slice(0, 400) });
    }
  }

  if (dry) {
    console.log(`\n${planned} API call(s) would be billed. Nothing was sent.`);
    return;
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ runs: report, generations: spent }, null, 2));
  console.log(`\n${spent} generation(s) attempted. Results in qa/live-results/`);
})();
