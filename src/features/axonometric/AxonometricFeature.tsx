import { RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { CompareSection } from '../../components/Output/CompareSection';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { RefineChips } from '../../components/Scene/RefineChips';
import { SceneControls } from '../../components/Scene/SceneControls';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Select } from '../../components/ui/Select';
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

  const { viewpoints: selected, style, section, scene } = settings;

  // Auto-assembled from the style + section toggle + scene, or (in refine mode)
  // from the refine chips. Each viewpoint is added per-image by the provider.
  const suggestedPrompt = useMemo(
    () => (mode === 'refine' ? buildRefinePrompt(refine) : buildAxonometricPrompt({ section, style, ...scene })),
    [mode, refine, section, style, scene],
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
        eyebrow="Elevation to Axonometric"
        title="Elevation → Axonometric"
        description="Generate axonometric and section-axonometric views from an elevation. Upload an elevation directly — running feature 02 first is never required."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <p className="mono-meta mb-3">Input</p>
            <ImageDropzone
              value={input}
              onImage={(url) => setFeatureInput('axonometric', url)}
              onClear={() => setFeatureInput('axonometric', null)}
            />
          </div>

          <Select
            label="Axonometric style"
            value={style}
            options={STYLE_OPTIONS}
            onChange={(v) => updateFeatureSettings('axonometric', { style: v })}
          />

          {/* Viewpoints — multi-select (spec §8.03). */}
          <div className="flex flex-col gap-2">
            <span className="mono-meta">Viewpoints</span>
            <div className="grid grid-cols-4 gap-2">
              {VIEWPOINTS.map((vp) => {
                const active = selected.includes(vp);
                return (
                  <button
                    key={vp}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleViewpoint(vp)}
                    className={`border py-2.5 text-sm font-medium transition-colors focus-visible:outline-ochre ${
                      active
                        ? 'border-ochre bg-ochre text-bone'
                        : 'border-hairline bg-paper text-graphite hover:bg-drafting'
                    }`}
                  >
                    {vp}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-mist">
              One view is generated per selected viewpoint ({orderedSelection.length || 'none'} selected).
            </p>
          </div>

          {/* Section axonometric toggle. */}
          <div className="flex items-center justify-between border border-hairline bg-paper px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Section axonometric</p>
              <p className="text-xs text-mist">Adds a cut plane and labels views “— section”.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={section}
              onClick={() => updateFeatureSettings('axonometric', { section: !section })}
              className={`relative h-6 w-11 border transition-colors focus-visible:outline-ochre ${
                section ? 'border-ochre bg-ochre' : 'border-hairline bg-drafting'
              }`}
            >
              <span
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 bg-bone transition-all ${
                  section ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {mode === 'refine' ? (
            <div className="flex flex-col gap-3 border border-ochre bg-drafting p-4">
              <div className="flex items-center justify-between">
                <span className="mono-meta text-ochre">Refining · {refine.sourceLabel}</span>
                <button
                  type="button"
                  onClick={() => exitRefine('axonometric')}
                  className="text-xs text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
                >
                  Exit refine
                </button>
              </div>
              <RefineChips value={refine} onChange={(patch) => patchFeatureRun('axonometric', { refine: { ...refine, ...patch } })} />
            </div>
          ) : style === 'realistic' ? (
            <SceneControls
              value={scene}
              onChange={(patch) => updateFeatureSettings('axonometric', { scene: patch })}
              show={{ materials: true, mood: true }}
            />
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="axon-prompt" className="mono-meta">
                Prompt · auto-generated
              </label>
              {promptEdited ? (
                <button
                  type="button"
                  onClick={() => setFeaturePrompt('axonometric', suggestedPrompt, false)}
                  className="flex items-center gap-1 text-[0.7rem] text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
                >
                  <RotateCcw size={12} strokeWidth={1.75} /> Reset
                </button>
              ) : null}
            </div>
            <textarea
              id="axon-prompt"
              value={prompt}
              onChange={(e) => setFeaturePrompt('axonometric', e.target.value, true)}
              rows={4}
              className="resize-none border border-hairline bg-paper px-3 py-2.5 text-sm leading-relaxed text-graphite placeholder:text-mist focus-visible:outline-ochre"
            />
          </div>

          <div className="flex items-center gap-3">
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
              <span className="text-xs text-mist">Upload an elevation to begin.</span>
            ) : orderedSelection.length === 0 ? (
              <span className="text-xs text-mist">Select at least one viewpoint.</span>
            ) : !engineReady ? (
              <span className="text-xs text-ochre">Add your Gemini key in Settings to generate.</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="mono-meta">Output</p>
          {error ? <ErrorBanner message={error} onRetry={handleGenerate} /> : null}
          {warning ? (
            <p className="border border-hairline bg-drafting px-3 py-2 text-xs leading-relaxed text-graphite">{warning}</p>
          ) : null}
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
            <div className="flex flex-1 items-center justify-center border border-dashed border-hairline bg-paper px-6 py-16 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-mist">
                Axonometric views will appear here, one per viewpoint.
              </p>
            </div>
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
