import { Boxes, FileImage, RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { CompareSection } from '../../components/Output/CompareSection';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { RefineChips } from '../../components/Scene/RefineChips';
import { SceneControls } from '../../components/Scene/SceneControls';
import { StyleRefPicker } from '../../components/Scene/StyleRefPicker';
import { Button } from '../../components/ui/Button';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { Notice } from '../../components/ui/Notice';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Switch } from '../../components/ui/Switch';
import { loadDemoPlan } from '../../lib/demoPlan';
import { buildRefinePrompt, buildRenderPrompt } from '../../lib/prompts';
import { ARCH_STYLES } from '../../lib/scene';
import { useProjectStore } from '../../store/useProjectStore';
import type { ArchStyleKey } from '../../store/generation';
import { useGenerate, usePresentationAdder, useStyleRef } from '../hooks';

// This feature turns a 2D floor plan into either a 3D isometric cutaway
// ("dollhouse") or a fully furnished top-down 2D marketing plan. The prompt is
// assembled from the view + architecture-style choices and stays visible and
// editable in the prompt box, same as every other generation tab.

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
    <Button
      variant="ghost"
      size="sm"
      className="self-start"
      icon={<FileImage size={14} strokeWidth={1.75} />}
      // `loading` also disables the button, so a slow fetch cannot fire
      // loadDemoPlan() several times over on the first-run happy path.
      loading={loading}
      onClick={() => {
        setLoading(true);
        void loadDemoPlan()
          .then((url) => setFeatureInput('render', url))
          .finally(() => setLoading(false));
      }}
    >
      {loading ? 'Loading sample…' : 'No plan handy? Try with a sample plan'}
    </Button>
  );
}

export function RenderFeature() {
  const { input, settings, mode, refine, prompt, promptEdited } = useProjectStore((s) => s.generation.render);
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const updateFeatureSettings = useProjectStore((s) => s.updateFeatureSettings);
  const setFeaturePrompt = useProjectStore((s) => s.setFeaturePrompt);
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
  const atCompareCap = compareSel.length >= MAX_COMPARE;

  const toggleCompareKey = (key: ArchStyleKey) =>
    setCompareSel((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length >= MAX_COMPARE ? prev : [...prev, key],
    );

  // Reference-chaining — match a pooled image's style. Mutually exclusive with
  // compare-styles (which varies the style, so a fixed reference makes no sense).
  const { url: styleRefUrl } = useStyleRef('render');
  const useRef = mode !== 'refine' && !compareActive && Boolean(styleRefUrl);

  // The prompt is assembled from the controls but stays visible and editable in
  // the textarea below (same as every other generation tab). In compare mode the
  // base prompt carries no style — the provider appends one per variant.
  const suggestedPrompt = useMemo(
    () =>
      mode === 'refine'
        ? buildRefinePrompt(refine)
        : buildRenderPrompt({ style, ...scene, ...(compareActive ? { archStyle: 'none' as const } : {}), useStyleRef: useRef }),
    [mode, refine, style, scene, compareActive, useRef],
  );
  useEffect(() => {
    if (!promptEdited && suggestedPrompt !== prompt) setFeaturePrompt('render', suggestedPrompt, false);
  }, [suggestedPrompt, promptEdited, prompt, setFeaturePrompt]);

  const { status, error, warning, outputs, inputUsed, engineReady, run, cancel } = useGenerate('render');
  const { addToPresentation, addedIds } = usePresentationAdder();

  const loading = status === 'loading';
  const needsMoreStyles = compare && mode !== 'refine' && compareSel.length < 2;

  const handleGenerate = () => {
    if (!input) return;
    void run({
      feature: 'render',
      inputImage: input,
      prompt: prompt.trim() || undefined,
      options: {
        style,
        variations: 1,
        refine: mode === 'refine' ? true : undefined,
        referenceImage: useRef ? (styleRefUrl ?? undefined) : undefined,
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
        {/* Input & controls — ONE card with hairline dividers. Six separately
            elevated boxes down a column gave every group the same weight and
            made the page read as a stack of unrelated widgets. */}
        <div className="flex flex-col rounded-card border border-hairline bg-paper shadow-card">
          {/* Everything upstream of the action row goes dead during a run: the
              options are already locked into the in-flight request. */}
          <fieldset
            disabled={loading}
            className={`flex min-w-0 flex-col divide-y divide-hairline transition-opacity ${loading ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-col gap-3 p-5">
              <div>
                <p className="section-heading">Input</p>
                <p className="mt-1 text-caption text-mist">2D floor plan</p>
              </div>
              <ImageDropzone
                value={input}
                onImage={(url) => setFeatureInput('render', url)}
                onClear={() => setFeatureInput('render', null)}
                hint="Upload a top-down 2D floor plan."
              />
              {!input ? <SamplePlanButton /> : null}
            </div>

            {mode === 'refine' ? (
              <div className="p-5">
                {/* Refine is a mode, not an alert — a soft accent wash, not a
                    border heavier than every hairline around it. */}
                <div className="flex flex-col gap-3 rounded-field border border-ochre/15 bg-ochre/[0.05] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="section-heading">Refining</p>
                      <p className="mt-1 truncate text-caption text-mist">{refine.sourceLabel}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<X size={14} strokeWidth={1.75} />}
                      onClick={() => exitRefine('render')}
                    >
                      Exit refine
                    </Button>
                  </div>
                  <RefineChips value={refine} onChange={(patch) => patchFeatureRun('render', { refine: { ...refine, ...patch } })} />
                </div>
              </div>
            ) : (
              <>
                <div className="p-5">
                  <ChipGroup
                    label="Output view"
                    value={style}
                    options={VIEW_OPTIONS}
                    onChange={(v) => updateFeatureSettings('render', { style: v })}
                  />
                </div>

                {/* Compare styles — one plan × several design languages in one batch. */}
                <div className="flex flex-col gap-4 p-5">
                  <Switch checked={compare} onChange={setCompare} label="Compare styles">
                    <span className="flex flex-col text-left">
                      <span className="section-heading">Compare styles</span>
                      <span className="mt-1 text-caption text-mist">One image per style</span>
                    </span>
                  </Switch>
                  {compare ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {COMPARE_KEYS.map((key) => {
                          const active = compareSel.includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-pressed={active}
                              // At the cap the toggle silently no-ops, so the
                              // unselected chips have to stop looking live.
                              disabled={atCompareCap && !active}
                              onClick={() => toggleCompareKey(key)}
                              className={`pill border px-3.5 py-1.5 text-label transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                                active
                                  ? 'border-ochre-deep bg-ochre-deep text-white'
                                  : 'border-hairline bg-paper text-graphite hover:border-mist/40 hover:bg-drafting'
                              }`}
                            >
                              {ARCH_STYLES[key].label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-body text-mist">
                        {compareSel.length < 2
                          ? 'Pick at least 2 styles.'
                          : `${compareSel.length} styles → ${compareSel.length} images in one run (max ${MAX_COMPARE}).`}
                      </p>
                    </>
                  ) : null}
                </div>

                {!compareActive ? (
                  <>
                    <div className="p-5">
                      <StyleRefPicker feature="render" />
                    </div>
                    <div className="p-5">
                      <SceneControls
                        value={scene}
                        onChange={(patch) => updateFeatureSettings('render', { scene: patch })}
                        show={{ archStyle: true }}
                      />
                    </div>
                  </>
                ) : null}
              </>
            )}

            {/* Prompt — visible + editable, same as every other generation tab. */}
            <div className="flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label htmlFor="render-prompt" className="section-heading">
                    Prompt
                  </label>
                  <p className="mt-1 text-caption text-mist">Auto-generated from the controls — edit freely</p>
                </div>
                {promptEdited ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw size={14} strokeWidth={1.75} />}
                    onClick={() => setFeaturePrompt('render', suggestedPrompt, false)}
                  >
                    Reset
                  </Button>
                ) : null}
              </div>
              {/* Assembled prompts run well past four lines — let the box grow
                  rather than hiding the tail behind an internal scrollbar. */}
              <textarea
                id="render-prompt"
                value={prompt}
                onChange={(e) => setFeaturePrompt('render', e.target.value, true)}
                className="min-h-[7rem] resize-y rounded-field border border-hairline bg-drafting/50 px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-hairline p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                icon={<Sparkles size={16} strokeWidth={1.75} />}
                onClick={handleGenerate}
                loading={loading}
                disabled={!input || loading || needsMoreStyles}
              >
                {loading ? 'Generating…' : compareActive ? `Generate ${compareSel.length} styles` : 'Generate'}
              </Button>
              {loading ? (
                <Button variant="secondary" size="sm" icon={<X size={14} strokeWidth={1.75} />} onClick={cancel}>
                  Cancel
                </Button>
              ) : null}
              {!input ? (
                <span className="text-body text-mist">Upload a floor plan to begin.</span>
              ) : needsMoreStyles ? (
                <span className="text-body text-mist">Pick at least 2 styles to compare.</span>
              ) : null}
            </div>
            {/* A blocked run is a warning state, not an accent one — and it names
                a destination, so it gets its own readable line. */}
            {!engineReady ? <Notice tone="warning" message="Add your Gemini key in Settings to generate." /> : null}
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="section-heading">Output</p>
            <p className="mt-1 text-caption text-mist">{style === 'plan2d' ? '2D furnished plan' : '3D isometric'}</p>
          </div>
          {error ? <ErrorBanner message={error} onRetry={handleGenerate} /> : null}
          {warning ? <Notice tone="warning" message={warning} /> : null}
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
            <EmptyState
              icon={Boxes}
              title={style === 'plan2d' ? 'No furnished plan yet' : 'No isometric view yet'}
              description={`Upload a floor plan and press Generate — your ${
                style === 'plan2d' ? 'furnished plan' : '3D isometric view'
              } will appear here.`}
            />
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
