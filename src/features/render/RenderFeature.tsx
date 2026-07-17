import { Sparkles, X } from 'lucide-react';
import { useMemo } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { CompareSection } from '../../components/Output/CompareSection';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { RefineChips } from '../../components/Scene/RefineChips';
import { SceneControls } from '../../components/Scene/SceneControls';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { buildRefinePrompt, buildRenderPrompt } from '../../lib/prompts';
import { useProjectStore } from '../../store/useProjectStore';
import { useGenerate, usePresentationAdder } from '../hooks';

// This feature does exactly one thing: turn a 2D floor plan into a 3D isometric
// cutaway ("dollhouse") view. There is no exterior/photoreal render and no style
// dropdown — the only choices are architecture style and materials. The prompt is
// assembled internally (no prompt box shown).
const STYLE = 'isometric';

export function RenderFeature() {
  const { input, settings, mode, refine } = useProjectStore((s) => s.generation.render);
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const updateFeatureSettings = useProjectStore((s) => s.updateFeatureSettings);
  const patchFeatureRun = useProjectStore((s) => s.patchFeatureRun);
  const beginRefine = useProjectStore((s) => s.beginRefine);
  const exitRefine = useProjectStore((s) => s.exitRefine);
  const sendToFeature = useProjectStore((s) => s.sendToFeature);
  const removeImage = useProjectStore((s) => s.removeImage);

  const { scene } = settings;

  // The prompt is assembled from the architecture-style + materials choices (or,
  // in refine mode, the refine chips). It is not shown — the user just uploads
  // and generates.
  const builtPrompt = useMemo(
    () => (mode === 'refine' ? buildRefinePrompt(refine) : buildRenderPrompt({ style: STYLE, ...scene })),
    [mode, refine, scene],
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
      options: { style: STYLE, variations: 1, refine: mode === 'refine' ? true : undefined },
    });
  };

  return (
    <div>
      <SectionHeader
        index="01"
        eyebrow="Plan to 3D Isometric"
        title="Floor Plan → 3D Isometric"
        description="Turn a 2D floor plan into a 3D isometric cutaway view — walls extruded, furniture in 3D, and the roof removed so the whole interior is visible. Upload directly — no prior step required."
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
            <SceneControls
              value={scene}
              onChange={(patch) => updateFeatureSettings('render', { scene: patch })}
              show={{ archStyle: true }}
            />
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={<Sparkles size={16} strokeWidth={1.75} />}
              onClick={handleGenerate}
              loading={loading}
              disabled={!input || loading}
            >
              {loading ? 'Generating…' : 'Generate'}
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
          <p className="mono-meta">Output · 3D isometric</p>
          {error ? <ErrorBanner message={error} onRetry={handleGenerate} /> : null}
          {warning ? (
            <p className="border border-hairline bg-drafting px-3 py-2 text-xs leading-relaxed text-graphite">{warning}</p>
          ) : null}
          {loading || outputs.length > 0 ? (
            <OutputGrid
              outputs={outputs}
              loading={loading}
              loadingCount={1}
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
                Your 3D isometric view will appear here. Upload a floor plan and press Generate.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Before / after — the signature fidelity moment (spec §8.01). */}
      {inputUsed && outputs.length > 0 ? (
        <CompareSection before={inputUsed} after={outputs[0].url} beforeLabel="Plan" afterLabel="Isometric" />
      ) : null}
    </div>
  );
}
