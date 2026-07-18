import { FileImage, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { CompareSection } from '../../components/Output/CompareSection';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { RefineChips } from '../../components/Scene/RefineChips';
import { SceneControls } from '../../components/Scene/SceneControls';
import { Button } from '../../components/ui/Button';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { loadDemoPlan } from '../../lib/demoPlan';
import { buildRefinePrompt, buildRenderPrompt } from '../../lib/prompts';
import { ARCH_STYLES } from '../../lib/scene';
import { useProjectStore } from '../../store/useProjectStore';
import type { ArchStyleKey } from '../../store/generation';
import { useGenerate, usePresentationAdder } from '../hooks';

// This feature turns a 2D floor plan into either a 3D isometric cutaway
// ("dollhouse") or a fully furnished top-down 2D marketing plan. No prompt box —
// the prompt is assembled internally from the view + architecture-style choices.

const VIEW_OPTIONS = [
  { value: 'isometric', label: '3D isometric' },
  { value: 'plan2d', label: '2D furnished plan' },
];

const VIEW_LABEL: Record<string, string> = { isometric: 'Isometric', plan2d: 'Furnished plan' };

// Compare-styles vocabulary — the concrete design languages (no none/custom).
const COMPARE_KEYS = (Object.keys(ARCH_STYLES) as ArchStyleKey[]).filter((k) => k !== 'none' && k !== 'custom');
const MAX_COMPARE = 4;

/** "Try with a sample plan" — first-success-in-30-seconds path (no assets needed). */
function SamplePlanButton() {
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        setLoading(true);
        void loadDemoPlan()
          .then((url) => setFeatureInput('render', url))
          .finally(() => setLoading(false));
      }}
      className="mt-2 flex items-center gap-1.5 text-xs text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
    >
      <FileImage size={13} strokeWidth={1.75} /> {loading ? 'Loading sample…' : 'No plan handy? Try with a sample plan'}
    </button>
  );
}

export function RenderFeature() {
  const { input, settings, mode, refine } = useProjectStore((s) => s.generation.render);
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const updateFeatureSettings = useProjectStore((s) => s.updateFeatureSettings);
  const patchFeatureRun = useProjectStore((s) => s.patchFeatureRun);
  const beginRefine = useProjectStore((s) => s.beginRefine);
  const exitRefine = useProjectStore((s) => s.exitRefine);
  const sendToFeature = useProjectStore((s) => s.sendToFeature);
  const removeImage = useProjectStore((s) => s.removeImage);

  const { style, scene } = settings;

  // Compare-styles batch: one input rendered in several design languages at once
  // so the client picks a direction from a single grid.
  const [compare, setCompare] = useState(false);
  const [compareSel, setCompareSel] = useState<ArchStyleKey[]>(['contemporary', 'bauhaus', 'indian']);
  const compareActive = mode !== 'refine' && compare && compareSel.length >= 2;

  const toggleCompareKey = (key: ArchStyleKey) =>
    setCompareSel((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length >= MAX_COMPARE ? prev : [...prev, key],
    );

  // The prompt is assembled internally (no prompt box). In compare mode the base
  // prompt carries no style — the provider appends one per variant.
  const builtPrompt = useMemo(
    () =>
      mode === 'refine'
        ? buildRefinePrompt(refine)
        : buildRenderPrompt({ style, ...scene, ...(compareActive ? { archStyle: 'none' as const } : {}) }),
    [mode, refine, style, scene, compareActive],
  );

  const { status, error, warning, outputs, inputUsed, engineReady, run, cancel } = useGenerate('render');
  const { addToPresentation, addedIds } = usePresentationAdder();

  const loading = status === 'loading';

  const handleGenerate = () => {
    if (!input) return;
    void run({
      feature: 'render',
      inputImage: input,
      prompt: builtPrompt,
      options: {
        style,
        variations: 1,
        refine: mode === 'refine' ? true : undefined,
        styleVariants: compareActive
          ? compareSel.map((k) => ({ label: `${ARCH_STYLES[k].label} — ${VIEW_LABEL[style]}`, clause: ARCH_STYLES[k].clause }))
          : undefined,
      },
    });
  };

  return (
    <div>
      <SectionHeader
        index="01"
        eyebrow="Plan to 3D Isometric · 2D Furnished Plan"
        title="Floor Plan → 3D Isometric"
        description="Turn a 2D floor plan into a 3D isometric cutaway — or a fully furnished top-down 2D marketing plan. Upload directly — no prior step required."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input & controls */}
        <div className="flex flex-col gap-6">
          <div>
            <p className="mono-meta mb-3">Input · 2D floor plan</p>
            <ImageDropzone
              value={input}
              onImage={(url) => setFeatureInput('render', url)}
              onClear={() => setFeatureInput('render', null)}
              hint="Upload a top-down 2D floor plan."
            />
            {!input ? <SamplePlanButton /> : null}
          </div>

          {mode === 'refine' ? (
            <div className="flex flex-col gap-3 border border-ochre bg-drafting p-4">
              <div className="flex items-center justify-between">
                <span className="mono-meta text-ochre">Refining · {refine.sourceLabel}</span>
                <button
                  type="button"
                  onClick={() => exitRefine('render')}
                  className="text-xs text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
                >
                  Exit refine
                </button>
              </div>
              <RefineChips value={refine} onChange={(patch) => patchFeatureRun('render', { refine: { ...refine, ...patch } })} />
            </div>
          ) : (
            <>
              <ChipGroup
                label="Output view"
                value={style}
                options={VIEW_OPTIONS}
                onChange={(v) => updateFeatureSettings('render', { style: v })}
              />

              {/* Compare styles — one plan × several design languages in one batch. */}
              <div className="flex flex-col gap-3 border border-hairline bg-paper p-4">
                <div className="flex items-center justify-between">
                  <span className="mono-meta text-ochre">Compare styles · one image per style</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={compare}
                    aria-label="Compare styles"
                    onClick={() => setCompare((v) => !v)}
                    className={`relative h-6 w-11 border transition-colors focus-visible:outline-ochre ${
                      compare ? 'border-ochre bg-ochre' : 'border-hairline bg-drafting'
                    }`}
                  >
                    <span
                      className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 bg-bone transition-all ${
                        compare ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {compare ? (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {COMPARE_KEYS.map((key) => {
                        const active = compareSel.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleCompareKey(key)}
                            className={`border px-3 py-1.5 text-xs transition-colors focus-visible:outline-ochre ${
                              active ? 'border-ochre bg-ochre text-bone' : 'border-hairline bg-paper text-graphite hover:bg-drafting'
                            }`}
                          >
                            {ARCH_STYLES[key].label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-mist">
                      {compareSel.length < 2
                        ? 'Pick at least 2 styles.'
                        : `${compareSel.length} styles → ${compareSel.length} images in one run (max ${MAX_COMPARE}).`}
                    </p>
                  </>
                ) : null}
              </div>

              {!compareActive ? (
                <SceneControls
                  value={scene}
                  onChange={(patch) => updateFeatureSettings('render', { scene: patch })}
                  show={{ archStyle: true }}
                />
              ) : null}
            </>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={<Sparkles size={16} strokeWidth={1.75} />}
              onClick={handleGenerate}
              loading={loading}
              disabled={!input || loading || (compare && mode !== 'refine' && compareSel.length < 2)}
            >
              {loading ? 'Generating…' : compareActive ? `Generate ${compareSel.length} styles` : 'Generate'}
            </Button>
            {loading ? (
              <Button variant="secondary" size="sm" icon={<X size={14} strokeWidth={1.75} />} onClick={cancel}>
                Cancel
              </Button>
            ) : null}
            {!input ? (
              <span className="text-xs text-mist">Upload a floor plan to begin.</span>
            ) : !engineReady ? (
              <span className="text-xs text-ochre">Add your Gemini key in Settings to generate.</span>
            ) : null}
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-4">
          <p className="mono-meta">Output · {style === 'plan2d' ? '2D furnished plan' : '3D isometric'}</p>
          {error ? <ErrorBanner message={error} onRetry={handleGenerate} /> : null}
          {warning ? (
            <p className="border border-hairline bg-drafting px-3 py-2 text-xs leading-relaxed text-graphite">{warning}</p>
          ) : null}
          {loading || outputs.length > 0 ? (
            <OutputGrid
              outputs={outputs}
              loading={loading}
              loadingCount={compareActive ? compareSel.length : 1}
              onAddToPresentation={addToPresentation}
              addedIds={addedIds}
              onDelete={removeImage}
              onRefine={(image) => beginRefine('render', image)}
              sendTargets={[{ label: 'Send to Elevation', target: 'elevation' }]}
              onSend={(target, image) => sendToFeature(target, image.url)}
            />
          ) : !error ? (
            <div className="flex flex-1 items-center justify-center border border-dashed border-hairline bg-paper px-6 py-16 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-mist">
                Your {style === 'plan2d' ? 'furnished plan' : '3D isometric view'} will appear here. Upload a floor plan
                and press Generate.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Before / after — the signature fidelity moment (spec §8.01). */}
      {inputUsed && outputs.length > 0 ? (
        <CompareSection
          before={inputUsed}
          after={outputs[0].url}
          beforeLabel="Plan"
          afterLabel={VIEW_LABEL[style] ?? 'Isometric'}
        />
      ) : null}
    </div>
  );
}
