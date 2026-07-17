import { RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { SceneControls } from '../../components/Scene/SceneControls';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { buildAxonometricPrompt } from '../../lib/prompts';
import { useProjectStore } from '../../store/useProjectStore';
import { useGenerate, usePresentationAdder } from '../hooks';

const VIEWPOINTS = ['NE', 'NW', 'SE', 'SW'] as const;

export function AxonometricFeature() {
  const { input, settings, prompt, promptEdited } = useProjectStore((s) => s.generation.axonometric);
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const updateFeatureSettings = useProjectStore((s) => s.updateFeatureSettings);
  const setFeaturePrompt = useProjectStore((s) => s.setFeaturePrompt);
  const removeImage = useProjectStore((s) => s.removeImage);

  const { viewpoints: selected, section, scene } = settings;

  // Auto-assembled from the section toggle + scene; each viewpoint is added
  // per-image by the provider. Editable by the user.
  const suggestedPrompt = useMemo(() => buildAxonometricPrompt({ section, ...scene }), [section, scene]);
  useEffect(() => {
    if (!promptEdited && suggestedPrompt !== prompt) setFeaturePrompt('axonometric', suggestedPrompt, false);
  }, [suggestedPrompt, promptEdited, prompt, setFeaturePrompt]);

  const { status, error, warning, outputs, engineReady, run, cancel } = useGenerate('axonometric');
  const { addToPresentation, addedIds } = usePresentationAdder();

  const loading = status === 'loading';

  // Preserve the NE,NW,SE,SW ordering regardless of click order.
  const orderedSelection = VIEWPOINTS.filter((vp) => selected.includes(vp));
  const canGenerate = input !== null && orderedSelection.length > 0;

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
      options: {
        viewpoints: orderedSelection,
        style: section ? 'section' : 'standard',
      },
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

          <SceneControls
            value={scene}
            onChange={(patch) => updateFeatureSettings('axonometric', { scene: patch })}
            show={{ materials: true, mood: true }}
          />

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
              loadingCount={orderedSelection.length}
              onAddToPresentation={addToPresentation}
              addedIds={addedIds}
              onDelete={removeImage}
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
    </div>
  );
}
