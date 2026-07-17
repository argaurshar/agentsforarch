import { RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { CompareSection } from '../../components/Output/CompareSection';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { RefineChips } from '../../components/Scene/RefineChips';
import { SceneControls } from '../../components/Scene/SceneControls';
import { Button } from '../../components/ui/Button';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Select } from '../../components/ui/Select';
import { ELEVATION_THEMES } from '../../lib/scene';
import { buildElevationPrompt, buildRefinePrompt } from '../../lib/prompts';
import { useProjectStore } from '../../store/useProjectStore';
import type { ElevationSettings, ElevationThemeKey } from '../../store/generation';
import { useGenerate, usePresentationAdder } from '../hooks';

const TYPE_OPTIONS = [
  { value: 'Front', label: 'Front' },
  { value: 'Side', label: 'Side' },
  { value: 'Rear', label: 'Rear' },
  { value: 'All', label: 'All faces (Front · Side · Rear)' },
];

const STYLE_OPTIONS = [
  { value: 'line', label: 'Line' },
  { value: 'rendered', label: 'Rendered' },
  { value: 'shaded', label: 'Shaded' },
];

const SOURCE_OPTIONS = [
  { value: 'theme', label: 'Design theme' },
  { value: 'moodboard', label: 'Mood board' },
] as const;

const THEME_OPTIONS = (Object.keys(ELEVATION_THEMES) as ElevationThemeKey[]).map((k) => ({
  value: k,
  label: ELEVATION_THEMES[k].label,
}));

export function ElevationFeature() {
  const { input, settings, mode, refine, prompt, promptEdited } = useProjectStore((s) => s.generation.elevation);
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const updateFeatureSettings = useProjectStore((s) => s.updateFeatureSettings);
  const setFeaturePrompt = useProjectStore((s) => s.setFeaturePrompt);
  const patchFeatureRun = useProjectStore((s) => s.patchFeatureRun);
  const beginRefine = useProjectStore((s) => s.beginRefine);
  const exitRefine = useProjectStore((s) => s.exitRefine);
  const sendToFeature = useProjectStore((s) => s.sendToFeature);
  const removeImage = useProjectStore((s) => s.removeImage);

  const { face, style, theme, styleSource, moodboard, scene } = settings;
  const faces = face === 'All' ? ['Front', 'Side', 'Rear'] : [face];
  // A rendered elevation is driven by a design theme OR a mood board (never both).
  const useMoodboard = style === 'rendered' && styleSource === 'moodboard' && Boolean(moodboard);

  const suggestedPrompt = useMemo(
    () =>
      mode === 'refine'
        ? buildRefinePrompt(refine)
        : buildElevationPrompt({ face: face === 'All' ? null : face, style, theme, useMoodboard, ...scene }),
    [mode, refine, face, style, theme, useMoodboard, scene],
  );
  useEffect(() => {
    if (!promptEdited && suggestedPrompt !== prompt) setFeaturePrompt('elevation', suggestedPrompt, false);
  }, [suggestedPrompt, promptEdited, prompt, setFeaturePrompt]);

  const { status, error, warning, outputs, inputUsed, engineReady, run, cancel } = useGenerate('elevation');
  const { addToPresentation, addedIds } = usePresentationAdder();

  const loading = status === 'loading';

  const handleGenerate = () => {
    if (!input) return;
    void run({
      feature: 'elevation',
      inputImage: input,
      prompt: prompt.trim() || undefined,
      // The elevation face(s) ride in `viewpoints` so each output label reflects it.
      // A mood board (when active) is attached as a style reference image.
      options:
        mode === 'refine'
          ? { style, refine: true }
          : { style, viewpoints: faces, referenceImage: useMoodboard ? moodboard ?? undefined : undefined },
    });
  };

  return (
    <div>
      <SectionHeader
        index="02"
        eyebrow="Sketch to Elevation"
        title="Sketch / Model → Elevation"
        description="Produce an elevation design render from a sketch or SketchUp model. Works standalone — upload whatever you have."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <p className="mono-meta mb-3">Input</p>
            <ImageDropzone
              value={input}
              onImage={(url) => setFeatureInput('elevation', url)}
              onClear={() => setFeatureInput('elevation', null)}
              hint="Input can be a hand sketch or a SketchUp model screenshot."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Elevation type"
              value={face}
              options={TYPE_OPTIONS}
              onChange={(v) => updateFeatureSettings('elevation', { face: v as ElevationSettings['face'] })}
            />
            <Select
              label="Style"
              value={style}
              options={STYLE_OPTIONS}
              onChange={(v) => updateFeatureSettings('elevation', { style: v })}
            />
          </div>

          {mode === 'refine' ? (
            <div className="flex flex-col gap-3 border border-ochre bg-drafting p-4">
              <div className="flex items-center justify-between">
                <span className="mono-meta text-ochre">Refining · {refine.sourceLabel}</span>
                <button
                  type="button"
                  onClick={() => exitRefine('elevation')}
                  className="text-xs text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
                >
                  Exit refine
                </button>
              </div>
              <RefineChips value={refine} onChange={(patch) => patchFeatureRun('elevation', { refine: { ...refine, ...patch } })} />
            </div>
          ) : (
            <>
              {/* Rendered elevations can be driven by a design theme OR a mood board (only one at a time). */}
              {style === 'rendered' ? (
                <div className="flex flex-col gap-4 border border-hairline bg-paper p-4">
                  <p className="mono-meta text-ochre">Elevation design · theme or mood board</p>
                  <ChipGroup
                    label="Style source"
                    value={styleSource}
                    options={SOURCE_OPTIONS}
                    onChange={(v) => updateFeatureSettings('elevation', { styleSource: v })}
                  />
                  {styleSource === 'theme' ? (
                    <ChipGroup
                      label="Design theme"
                      value={theme}
                      options={THEME_OPTIONS}
                      onChange={(v) => updateFeatureSettings('elevation', { theme: v })}
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span className="mono-meta">Mood board</span>
                      <ImageDropzone
                        value={moodboard}
                        onImage={(url) => updateFeatureSettings('elevation', { moodboard: url })}
                        onClear={() => updateFeatureSettings('elevation', { moodboard: null })}
                        hint="Upload a reference mood board — the render will follow its style, materials, colours and mood."
                      />
                      {!moodboard ? (
                        <p className="text-xs text-mist">Upload a mood board, or switch to “Design theme”.</p>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
              <SceneControls
                value={scene}
                onChange={(patch) => updateFeatureSettings('elevation', { scene: patch })}
                show={{ lighting: style === 'rendered', mood: true }}
              />
            </>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="elevation-prompt" className="mono-meta">
                Prompt · auto-generated
              </label>
              {promptEdited ? (
                <button
                  type="button"
                  onClick={() => setFeaturePrompt('elevation', suggestedPrompt, false)}
                  className="flex items-center gap-1 text-[0.7rem] text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
                >
                  <RotateCcw size={12} strokeWidth={1.75} /> Reset
                </button>
              ) : null}
            </div>
            <textarea
              id="elevation-prompt"
              value={prompt}
              onChange={(e) => setFeaturePrompt('elevation', e.target.value, true)}
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
              loadingCount={mode === 'refine' ? 1 : faces.length}
              onAddToPresentation={addToPresentation}
              addedIds={addedIds}
              onDelete={removeImage}
              onRefine={(image) => beginRefine('elevation', image)}
              sendTargets={[{ label: 'Send to Axonometric', target: 'axonometric' }]}
              onSend={(target, image) => sendToFeature(target, image.url)}
            />
          ) : !error ? (
            <div className="flex flex-1 items-center justify-center border border-dashed border-hairline bg-paper px-6 py-16 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-mist">
                Your elevation will appear here. Choose a face and style, then Generate.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Before / after — compare the elevation against the input. */}
      {inputUsed && outputs.length > 0 ? (
        <CompareSection before={inputUsed} after={outputs[0].url} beforeLabel="Input" afterLabel="Elevation" />
      ) : null}
    </div>
  );
}
