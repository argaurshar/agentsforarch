import { Box, RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { CompareSection } from '../../components/Output/CompareSection';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { RefineChips } from '../../components/Scene/RefineChips';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { Notice } from '../../components/ui/Notice';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { buildAxonometricPrompt, buildRefinePrompt } from '../../lib/prompts';
import { useProjectStore } from '../../store/useProjectStore';
import { useGenerate, usePresentationAdder } from '../hooks';

const VIEWPOINTS = ['NE', 'NW', 'SE', 'SW'] as const;

const STYLE_OPTIONS = [
  { value: 'realistic', label: 'Realistic render' },
  { value: 'lineart', label: 'Line art' },
  { value: 'bw', label: 'Black & white lines' },
];

export function AxonometricFeature() {
  const { input, settings, mode, refine, prompt, promptEdited } = useProjectStore((s) => s.generation.axonometric);
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const updateFeatureSettings = useProjectStore((s) => s.updateFeatureSettings);
  const setFeaturePrompt = useProjectStore((s) => s.setFeaturePrompt);
  const patchFeatureRun = useProjectStore((s) => s.patchFeatureRun);
  const beginRefine = useProjectStore((s) => s.beginRefine);
  const exitRefine = useProjectStore((s) => s.exitRefine);
  const removeImage = useProjectStore((s) => s.removeImage);

  const { viewpoints: selected, style, section } = settings;

  // Auto-assembled from the style + section toggle, or (in refine mode) from the
  // refine chips. Each viewpoint is added per-image by the provider. This is a
  // pure conversion of the input, so there are no materials/scene controls — the
  // input's materials are preserved.
  const suggestedPrompt = useMemo(
    () => (mode === 'refine' ? buildRefinePrompt(refine) : buildAxonometricPrompt({ section, style })),
    [mode, refine, section, style],
  );
  useEffect(() => {
    if (!promptEdited && suggestedPrompt !== prompt) setFeaturePrompt('axonometric', suggestedPrompt, false);
  }, [suggestedPrompt, promptEdited, prompt, setFeaturePrompt]);

  const { status, error, warning, outputs, inputUsed, engineReady, run, cancel } = useGenerate('axonometric');
  const { addToPresentation, addedIds } = usePresentationAdder();

  const loading = status === 'loading';

  // Preserve the NE,NW,SE,SW ordering regardless of click order.
  const orderedSelection = VIEWPOINTS.filter((vp) => selected.includes(vp));
  const canGenerate = input !== null && (mode === 'refine' || orderedSelection.length > 0);

  const toggleViewpoint = (vp: string) => {
    const next = selected.includes(vp) ? selected.filter((v) => v !== vp) : [...selected, vp];
    updateFeatureSettings('axonometric', { viewpoints: next });
  };

  const handleGenerate = () => {
    if (!canGenerate || !input) return;
    void run({
      feature: 'axonometric',
      inputImage: input,
      prompt: prompt.trim() || undefined,
      options:
        mode === 'refine'
          ? { style, section, refine: true }
          : { viewpoints: orderedSelection, style, section },
    });
  };

  return (
    <div>
      <SectionHeader
        index="03"
        eyebrow="Drawing conversion"
        title="Elevation → Axonometric"
        description="Generate axonometric and section-axonometric views from an elevation. Upload an elevation directly — running feature 02 first is never required."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input & controls — ONE card with hairline dividers, matching the
            Isometric tab. Separately elevated boxes gave each group equal
            weight and read as a stack of unrelated widgets. */}
        <div className="flex flex-col rounded-card border border-hairline bg-paper shadow-card">
          {/* The options are already locked into an in-flight request, so the
              whole control stack goes dead while one is running. */}
          <fieldset
            disabled={loading}
            className={`flex min-w-0 flex-col divide-y divide-hairline transition-opacity ${loading ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-col gap-3 p-5">
              <div>
                <p className="section-heading">Input</p>
                <p className="mt-1 text-caption text-mist">Elevation drawing or render</p>
              </div>
              <ImageDropzone
                value={input}
                onImage={(url) => setFeatureInput('axonometric', url)}
                onClear={() => setFeatureInput('axonometric', null)}
              />
            </div>

            {/* Refine replaces the controls rather than sitting under them —
                the same shape as the Isometric and Elevation tabs, and the
                controls below are ignored by handleGenerate in this mode. */}
            {mode === 'refine' ? (
              <div className="p-5">
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
                      onClick={() => exitRefine('axonometric')}
                    >
                      Exit refine
                    </Button>
                  </div>
                  <RefineChips
                    value={refine}
                    onChange={(patch) => patchFeatureRun('axonometric', { refine: { ...refine, ...patch } })}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="p-5">
                  <Select
                    label="Axonometric style"
                    value={style}
                    options={STYLE_OPTIONS}
                    onChange={(v) => updateFeatureSettings('axonometric', { style: v })}
                  />
                </div>

                {/* Viewpoints — multi-select (spec §8.03), rendered as a
                    segmented control so the four options read as one field. */}
                <div className="flex flex-col gap-2 p-5">
                  <div>
                    <p className="section-heading">Viewpoints</p>
                    <p className="mt-1 text-caption text-mist">One view per selected corner</p>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 rounded-field border border-hairline bg-drafting/60 p-1">
                    {VIEWPOINTS.map((vp) => {
                      const active = selected.includes(vp);
                      return (
                        <button
                          key={vp}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleViewpoint(vp)}
                          className={`rounded-control py-2 text-label transition-colors active:scale-[0.98] ${
                            active ? 'bg-ochre-deep text-white' : 'text-graphite hover:bg-paper'
                          }`}
                        >
                          {vp}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-body text-mist">
                    {orderedSelection.length || 'No'} viewpoint{orderedSelection.length === 1 ? '' : 's'} selected.
                  </p>
                </div>

                {/* Section axonometric toggle. */}
                <div className="p-5">
                  <Switch
                    checked={section}
                    onChange={(next) => updateFeatureSettings('axonometric', { section: next })}
                    label="Section axonometric"
                  >
                    <span className="flex flex-col text-left">
                      <span className="section-heading">Section axonometric</span>
                      <span className="mt-1 text-caption text-mist">Adds a cut plane and labels views “— section”.</span>
                    </span>
                  </Switch>
                </div>
              </>
            )}

            <div className="flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label htmlFor="axon-prompt" className="section-heading">
                    Prompt
                  </label>
                  <p className="mt-1 text-caption text-mist">Auto-generated from the controls — edit freely</p>
                </div>
                {promptEdited ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw size={14} strokeWidth={1.75} />}
                    onClick={() => setFeaturePrompt('axonometric', suggestedPrompt, false)}
                  >
                    Reset
                  </Button>
                ) : null}
              </div>
              {/* Assembled prompts run past four lines — let the box grow rather
                  than hide the tail behind an internal scrollbar. */}
              <textarea
                id="axon-prompt"
                value={prompt}
                onChange={(e) => setFeaturePrompt('axonometric', e.target.value, true)}
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
                disabled={!canGenerate || loading}
              >
                {loading ? 'Generating…' : 'Generate'}
              </Button>
              {loading ? (
                <Button variant="secondary" size="sm" icon={<X size={14} strokeWidth={1.75} />} onClick={cancel}>
                  Cancel
                </Button>
              ) : null}
              {!input ? (
                <span className="text-body text-mist">Upload an elevation to begin.</span>
              ) : mode !== 'refine' && orderedSelection.length === 0 ? (
                <span className="text-body text-mist">Select at least one viewpoint.</span>
              ) : null}
            </div>
            {/* Blocked, not wrong — a warning tone, and it names a destination. */}
            {!engineReady ? <Notice tone="warning" message="Add your Gemini key in Settings to generate." /> : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="section-heading">Output</p>
            <p className="mt-1 text-caption text-mist">One image per viewpoint</p>
          </div>
          {error ? <ErrorBanner message={error} onRetry={handleGenerate} /> : null}
          {warning ? <Notice tone="warning" message={warning} /> : null}
          {loading || outputs.length > 0 ? (
            <OutputGrid
              outputs={outputs}
              loading={loading}
              loadingCount={mode === 'refine' ? 1 : orderedSelection.length}
              onAddToPresentation={addToPresentation}
              addedIds={addedIds}
              onDelete={removeImage}
              onRefine={(image) => beginRefine('axonometric', image)}
            />
          ) : !error ? (
            <EmptyState
              icon={Box}
              title="No axonometric views yet"
              description="Upload an elevation, pick the corners you want and press Generate — one view appears here per viewpoint."
            />
          ) : null}
        </div>
      </div>

      {/* Before / after — compare the axonometric against the elevation input. */}
      {inputUsed && outputs.length > 0 ? (
        <CompareSection before={inputUsed} after={outputs[0].url} beforeLabel="Elevation" afterLabel="Axonometric" />
      ) : null}
    </div>
  );
}
