import { RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { ImageCompare } from '../../components/Output/ImageCompare';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { RefineChips } from '../../components/Scene/RefineChips';
import { SceneControls } from '../../components/Scene/SceneControls';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Select } from '../../components/ui/Select';
import { buildRefinePrompt, buildRenderPrompt } from '../../lib/prompts';
import { useProjectStore } from '../../store/useProjectStore';
import { useGenerate, usePresentationAdder } from '../hooks';

const STYLE_OPTIONS = [
  { value: 'photoreal', label: 'Photoreal' },
  { value: 'isometric', label: 'Isometric dollhouse' },
  { value: 'clay', label: 'Clay model' },
  { value: 'line', label: 'Line drawing' },
  { value: 'watercolour', label: 'Watercolour' },
];

// Which output the before/after slider is labelled as, per render style.
const AFTER_LABEL: Record<string, string> = {
  photoreal: 'Render',
  isometric: 'Isometric',
  clay: 'Clay model',
  line: 'Line drawing',
  watercolour: 'Watercolour',
};

// A one-line hint under the Style select so the right style for the input is
// obvious — in particular that a 2D floor plan should use Isometric dollhouse,
// not Photoreal (which renders an exterior building).
const STYLE_HINT: Record<string, string> = {
  photoreal: 'For a hand sketch or 3D model → a photoreal building render. Uploading a 2D floor plan? Choose “Isometric dollhouse”.',
  isometric: 'For a 2D floor plan → a 3D isometric “dollhouse” cutaway (walls extruded, furniture in 3D, no roof, layout preserved).',
  clay: 'A clean white clay / massing model — good for early studies.',
  line: 'A crisp black-and-white architectural line drawing.',
  watercolour: 'A soft architectural watercolour illustration.',
};

const VARIATION_OPTIONS = [
  { value: '1', label: '1 variation' },
  { value: '2', label: '2 variations' },
  { value: '4', label: '4 variations' },
];

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

  const { style, variations, scene } = settings;

  // Prompt is auto-assembled — from the style + scene choices, or (in refine
  // mode) from the refine chips. The user can still edit it (Reset restores).
  const suggestedPrompt = useMemo(
    () => (mode === 'refine' ? buildRefinePrompt(refine) : buildRenderPrompt({ style, ...scene })),
    [mode, refine, style, scene],
  );
  useEffect(() => {
    if (!promptEdited && suggestedPrompt !== prompt) setFeaturePrompt('render', suggestedPrompt, false);
  }, [suggestedPrompt, promptEdited, prompt, setFeaturePrompt]);

  const { status, error, warning, outputs, inputUsed, engineReady, run, cancel } = useGenerate('render');
  const { addToPresentation, addedIds } = usePresentationAdder();

  const loading = status === 'loading';

  const handleGenerate = () => {
    if (!input) return;
    void run({
      feature: 'render',
      inputImage: input,
      prompt: prompt.trim() || undefined,
      options: mode === 'refine' ? { style, variations: 1, refine: true } : { style, variations },
    });
  };

  return (
    <div>
      <SectionHeader
        index="01"
        eyebrow="Sketch to Render"
        title="Sketch / Plan → Render"
        description="Turn a hand sketch or floor plan into a styled architectural render. Upload directly — no prior step required."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input & controls */}
        <div className="flex flex-col gap-6">
          <div>
            <p className="mono-meta mb-3">Input</p>
            <ImageDropzone
              value={input}
              onImage={(url) => setFeatureInput('render', url)}
              onClear={() => setFeatureInput('render', null)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Style"
                value={style}
                options={STYLE_OPTIONS}
                onChange={(v) => updateFeatureSettings('render', { style: v })}
              />
              <Select
                label="Variations"
                value={String(variations)}
                options={VARIATION_OPTIONS}
                onChange={(v) => updateFeatureSettings('render', { variations: Number(v) })}
              />
            </div>
            {STYLE_HINT[style] ? (
              <p className={`text-xs leading-relaxed ${style === 'isometric' ? 'text-ochre' : 'text-mist'}`}>
                {STYLE_HINT[style]}
              </p>
            ) : null}
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
          ) : style === 'photoreal' ? (
            <SceneControls
              value={scene}
              onChange={(patch) => updateFeatureSettings('render', { scene: patch })}
              show={{ archStyle: true, materials: true, lighting: true, setting: true, context: true, season: true, mood: true, entourage: true }}
            />
          ) : style === 'isometric' ? (
            <SceneControls
              value={scene}
              onChange={(patch) => updateFeatureSettings('render', { scene: patch })}
              show={{ archStyle: true, materials: true, mood: true }}
            />
          ) : null}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="render-prompt" className="mono-meta">
                Prompt · auto-generated
              </label>
              {promptEdited ? (
                <button
                  type="button"
                  onClick={() => setFeaturePrompt('render', suggestedPrompt, false)}
                  className="flex items-center gap-1 text-[0.7rem] text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
                >
                  <RotateCcw size={12} strokeWidth={1.75} /> Reset
                </button>
              ) : null}
            </div>
            <textarea
              id="render-prompt"
              value={prompt}
              onChange={(e) => setFeaturePrompt('render', e.target.value, true)}
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
              <span className="text-xs text-mist">Upload an image to begin.</span>
            ) : !engineReady ? (
              <span className="text-xs text-ochre">Add your Gemini key in Settings to generate.</span>
            ) : null}
          </div>
        </div>

        {/* Output */}
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
              loadingCount={variations}
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
                Your renders will appear here. Pick a style and press Generate.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Before / after — the signature fidelity moment (spec §8.01). */}
      {inputUsed && outputs.length > 0 ? (
        <div className="mt-10">
          <p className="mono-meta mb-3">Fidelity · Before / After</p>
          <ImageCompare
            before={inputUsed}
            after={outputs[0].url}
            beforeLabel={style === 'isometric' ? 'Plan' : 'Sketch'}
            afterLabel={AFTER_LABEL[style] ?? 'Render'}
          />
        </div>
      ) : null}
    </div>
  );
}
