import { Building2, RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
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
import { Select } from '../../components/ui/Select';
import { ELEVATION_THEMES } from '../../lib/scene';
import { buildElevationPrompt, buildRefinePrompt } from '../../lib/prompts';
import { useProjectStore } from '../../store/useProjectStore';
import type { ElevationSettings, ElevationThemeKey } from '../../store/generation';
import { useGenerate, usePresentationAdder, useStyleRef } from '../hooks';

const TYPE_OPTIONS = [
  { value: 'Front', label: 'Front' },
  { value: 'Side', label: 'Side' },
  { value: 'Rear', label: 'Rear' },
  // Kept short so the native select never truncates it on a 320px viewport —
  // the face enumeration lives in the helper line under the field instead.
  { value: 'All', label: 'All faces' },
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
  // Reference-chaining — match a pooled image (theme mode only; a mood board wins).
  const { url: styleRefUrl } = useStyleRef('elevation');
  const useRefStyle = !useMoodboard && style === 'rendered' && styleSource === 'theme' && Boolean(styleRefUrl);

  const suggestedPrompt = useMemo(
    () =>
      mode === 'refine'
        ? buildRefinePrompt(refine)
        : buildElevationPrompt({ face: face === 'All' ? null : face, style, theme, useMoodboard, useStyleRef: useRefStyle, ...scene }),
    [mode, refine, face, style, theme, useMoodboard, useRefStyle, scene],
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
          : {
              style,
              viewpoints: faces,
              referenceImage: useMoodboard ? (moodboard ?? undefined) : useRefStyle ? (styleRefUrl ?? undefined) : undefined,
            },
    });
  };

  return (
    <div>
      <SectionHeader
        index="02"
        eyebrow="Facade design"
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

          {/* Single column below `sm` — two native selects side by side truncate
              their option text at 320px. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Select
                label="Elevation type"
                value={face}
                options={TYPE_OPTIONS}
                onChange={(v) => updateFeatureSettings('elevation', { face: v as ElevationSettings['face'] })}
              />
              {face === 'All' ? (
                <p className="text-label text-graphite">Front · Side · Rear, generated in one run.</p>
              ) : null}
            </div>
            <Select
              label="Style"
              value={style}
              options={STYLE_OPTIONS}
              onChange={(v) => updateFeatureSettings('elevation', { style: v })}
            />
          </div>

          {mode === 'refine' ? (
            /* Neutral drafting sub-panel: the accent budget here is spent on the
               "Refining" label alone. */
            <div className="flex flex-col gap-3 rounded-field border border-hairline bg-drafting p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-label text-ochre-deep">Refining · {refine.sourceLabel}</span>
                <Button variant="ghost" size="sm" onClick={() => exitRefine('elevation')}>
                  Exit refine
                </Button>
              </div>
              <RefineChips value={refine} onChange={(patch) => patchFeatureRun('elevation', { refine: { ...refine, ...patch } })} />
            </div>
          ) : (
            <>
              {/* Rendered elevations can be driven by a design theme OR a mood board (only one at a time). */}
              {style === 'rendered' ? (
                <div className="flex flex-col gap-4 rounded-field border border-hairline bg-paper p-4 shadow-card">
                  <p className="section-heading">Elevation design · theme or mood board</p>
                  <ChipGroup
                    label="Style source"
                    value={styleSource}
                    options={SOURCE_OPTIONS}
                    onChange={(v) => updateFeatureSettings('elevation', { styleSource: v })}
                  />
                  {styleSource === 'theme' ? (
                    <div className="flex flex-col gap-4">
                      <ChipGroup
                        label="Design theme"
                        value={theme}
                        options={THEME_OPTIONS}
                        onChange={(v) => updateFeatureSettings('elevation', { theme: v })}
                      />
                      <StyleRefPicker feature="elevation" note="Overrides the design theme above." />
                    </div>
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
                        <p className="text-label text-graphite">Upload a mood board, or switch to “Design theme”.</p>
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
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RotateCcw size={14} strokeWidth={1.75} />}
                  onClick={() => setFeaturePrompt('elevation', suggestedPrompt, false)}
                >
                  Reset
                </Button>
              ) : null}
            </div>
            <textarea
              id="elevation-prompt"
              value={prompt}
              onChange={(e) => setFeaturePrompt('elevation', e.target.value, true)}
              rows={4}
              className="resize-none rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite transition-colors placeholder:text-mist hover:border-mist/40"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
                /* Wraps to its own line on narrow viewports rather than squeezing the buttons. */
                <span className="basis-full text-label text-graphite sm:basis-auto">Upload an image to begin.</span>
              ) : null}
            </div>
            {input && !engineReady ? (
              <Notice tone="warning" message="Add your image-engine key in Settings to generate." />
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="mono-meta">Output</p>
          {error ? <ErrorBanner message={error} onRetry={handleGenerate} /> : null}
          {warning ? <Notice tone="warning" message={warning} /> : null}
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
            <EmptyState
              icon={Building2}
              title="No elevation yet"
              description="Your elevation will appear here. Choose a face and style, then Generate."
            />
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
