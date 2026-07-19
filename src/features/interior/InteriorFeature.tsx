import { RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { CompareSection } from '../../components/Output/CompareSection';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { RefineChips } from '../../components/Scene/RefineChips';
import { SceneControls } from '../../components/Scene/SceneControls';
import { StyleRefPicker } from '../../components/Scene/StyleRefPicker';
import { Button } from '../../components/ui/Button';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Select } from '../../components/ui/Select';
import { INTERIOR_REFINE_CHIPS } from '../../lib/refine';
import { INTERIOR_THEMES } from '../../lib/scene';
import { buildInteriorPrompt, buildRefinePrompt } from '../../lib/prompts';
import { useProjectStore } from '../../store/useProjectStore';
import type { InteriorMode, InteriorThemeKey, RoomTypeKey } from '../../store/generation';
import { useGenerate, usePresentationAdder, useStyleRef } from '../hooks';

const MODE_OPTIONS: { value: InteriorMode; label: string }[] = [
  { value: 'restyle', label: 'Restyle' },
  { value: 'stage', label: 'Stage (furnish empty room)' },
  { value: 'renovate', label: 'Renovate' },
];

const MODE_HINT: Record<InteriorMode, string> = {
  restyle: 'Keeps the room’s architecture; replaces furniture, finishes and décor in the new style.',
  stage: 'Furnishes an empty or bare room completely — architecture and camera stay untouched.',
  renovate: 'Bigger changes allowed: finishes, flooring, ceiling and fixtures may be replaced.',
};

const ROOM_OPTIONS: { value: RoomTypeKey; label: string }[] = [
  { value: 'living', label: 'Living room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'dining', label: 'Dining room' },
  { value: 'office', label: 'Home office' },
];

const SOURCE_OPTIONS = [
  { value: 'theme', label: 'Design theme' },
  { value: 'moodboard', label: 'Mood board' },
] as const;

const THEME_OPTIONS = (Object.keys(INTERIOR_THEMES) as InteriorThemeKey[]).map((k) => ({
  value: k,
  label: INTERIOR_THEMES[k].label,
}));

// Compare-styles vocabulary — the concrete themes (no 'none').
const COMPARE_KEYS = (Object.keys(INTERIOR_THEMES) as InteriorThemeKey[]).filter((k) => k !== 'none');
const MAX_COMPARE = 4;

export function InteriorFeature() {
  const { input, settings, mode: runMode, refine, prompt, promptEdited } = useProjectStore((s) => s.generation.interior);
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const updateFeatureSettings = useProjectStore((s) => s.updateFeatureSettings);
  const setFeaturePrompt = useProjectStore((s) => s.setFeaturePrompt);
  const patchFeatureRun = useProjectStore((s) => s.patchFeatureRun);
  const beginRefine = useProjectStore((s) => s.beginRefine);
  const exitRefine = useProjectStore((s) => s.exitRefine);
  const removeImage = useProjectStore((s) => s.removeImage);

  const { mode, roomType, theme, styleSource, moodboard, scene } = settings;
  // The interior is driven by a design theme OR a mood board (never both).
  const useMoodboard = styleSource === 'moodboard' && Boolean(moodboard);

  // Compare-styles batch: one room × several design themes in one run.
  const [compare, setCompare] = useState(false);
  const [compareSel, setCompareSel] = useState<InteriorThemeKey[]>(['contemporary', 'japandi', 'boho']);
  const compareActive = runMode !== 'refine' && styleSource === 'theme' && compare && compareSel.length >= 2;
  const toggleCompareKey = (key: InteriorThemeKey) =>
    setCompareSel((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length >= MAX_COMPARE ? prev : [...prev, key],
    );

  // Reference-chaining — match a pooled image (theme mode, not comparing; a mood board wins).
  const { url: styleRefUrl } = useStyleRef('interior');
  const useRefStyle = runMode !== 'refine' && styleSource === 'theme' && !compareActive && Boolean(styleRefUrl);

  const suggestedPrompt = useMemo(
    () =>
      runMode === 'refine'
        ? buildRefinePrompt(refine)
        : buildInteriorPrompt({ mode, roomType, theme: compareActive ? 'none' : theme, useMoodboard, useStyleRef: useRefStyle, mood: scene.mood }),
    [runMode, refine, mode, roomType, theme, useMoodboard, useRefStyle, scene.mood, compareActive],
  );
  useEffect(() => {
    if (!promptEdited && suggestedPrompt !== prompt) setFeaturePrompt('interior', suggestedPrompt, false);
  }, [suggestedPrompt, promptEdited, prompt, setFeaturePrompt]);

  const { status, error, warning, outputs, inputUsed, engineReady, run, cancel } = useGenerate('interior');
  const { addToPresentation, addedIds } = usePresentationAdder();

  const loading = status === 'loading';

  const handleGenerate = () => {
    if (!input) return;
    void run({
      feature: 'interior',
      inputImage: input,
      prompt: prompt.trim() || undefined,
      // The mode rides in `style` so output labels reflect it; a mood board
      // (when active) is attached as a style reference image.
      options:
        runMode === 'refine'
          ? { style: mode, refine: true }
          : {
              style: mode,
              referenceImage: useMoodboard ? (moodboard ?? undefined) : useRefStyle ? (styleRefUrl ?? undefined) : undefined,
              styleVariants: compareActive
                ? compareSel.map((k) => ({ label: `${INTERIOR_THEMES[k].label} interior`, clause: INTERIOR_THEMES[k].clause }))
                : undefined,
            },
    });
  };

  return (
    <div>
      <SectionHeader
        index="04"
        eyebrow="Interior Design"
        title="Room Photo → Interior Design"
        description="Restyle a client's room, stage an empty one, or renovate — from a photo, in a chosen design style or from an uploaded mood board."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <p className="mono-meta mb-3">Input · room photo</p>
            <ImageDropzone
              value={input}
              onImage={(url) => setFeatureInput('interior', url)}
              onClear={() => setFeatureInput('interior', null)}
              hint="A phone photo works — shoot from a corner to capture the whole room."
            />
          </div>

          <div className="flex flex-col gap-2">
            <ChipGroup
              label="Mode"
              value={mode}
              options={MODE_OPTIONS}
              onChange={(v) => updateFeatureSettings('interior', { mode: v })}
            />
            <p className="text-xs text-mist">{MODE_HINT[mode]}</p>
          </div>

          <Select
            label="Room type"
            value={roomType}
            options={ROOM_OPTIONS}
            onChange={(v) => updateFeatureSettings('interior', { roomType: v as RoomTypeKey })}
          />

          {runMode === 'refine' ? (
            <div className="flex flex-col gap-3 border border-ochre bg-drafting p-4">
              <div className="flex items-center justify-between">
                <span className="mono-meta text-ochre">Refining · {refine.sourceLabel}</span>
                <button
                  type="button"
                  onClick={() => exitRefine('interior')}
                  className="text-xs text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
                >
                  Exit refine
                </button>
              </div>
              <RefineChips
                value={refine}
                chips={INTERIOR_REFINE_CHIPS}
                onChange={(patch) => patchFeatureRun('interior', { refine: { ...refine, ...patch } })}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 border border-hairline bg-paper p-4">
                <p className="mono-meta text-ochre">Interior design · theme or mood board</p>
                <ChipGroup
                  label="Style source"
                  value={styleSource}
                  options={SOURCE_OPTIONS}
                  onChange={(v) => updateFeatureSettings('interior', { styleSource: v })}
                />
                {styleSource === 'theme' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="mono-meta">Compare styles · one image per theme</span>
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
                                  active
                                    ? 'border-ochre bg-ochre text-bone'
                                    : 'border-hairline bg-paper text-graphite hover:bg-drafting'
                                }`}
                              >
                                {INTERIOR_THEMES[key].label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-mist">
                          {compareSel.length < 2
                            ? 'Pick at least 2 themes.'
                            : `${compareSel.length} themes → ${compareSel.length} images in one run (max ${MAX_COMPARE}).`}
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <ChipGroup
                          label="Design theme"
                          value={theme}
                          options={THEME_OPTIONS}
                          onChange={(v) => updateFeatureSettings('interior', { theme: v })}
                        />
                        <StyleRefPicker feature="interior" note="Overrides the design theme above." />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="mono-meta">Mood board</span>
                    <ImageDropzone
                      value={moodboard}
                      onImage={(url) => updateFeatureSettings('interior', { moodboard: url })}
                      onClear={() => updateFeatureSettings('interior', { moodboard: null })}
                      hint="Upload a reference mood board — the room will follow its style, furniture character, colours and mood."
                    />
                    {!moodboard ? (
                      <p className="text-xs text-mist">Upload a mood board, or switch to “Design theme”.</p>
                    ) : null}
                  </div>
                )}
              </div>
              <SceneControls
                value={scene}
                onChange={(patch) => updateFeatureSettings('interior', { scene: patch })}
                show={{ mood: true }}
              />
            </>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="interior-prompt" className="mono-meta">
                Prompt · auto-generated
              </label>
              {promptEdited ? (
                <button
                  type="button"
                  onClick={() => setFeaturePrompt('interior', suggestedPrompt, false)}
                  className="flex items-center gap-1 text-[0.7rem] text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
                >
                  <RotateCcw size={12} strokeWidth={1.75} /> Reset
                </button>
              ) : null}
            </div>
            <textarea
              id="interior-prompt"
              value={prompt}
              onChange={(e) => setFeaturePrompt('interior', e.target.value, true)}
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
              <span className="text-xs text-mist">Upload a room photo to begin.</span>
            ) : !engineReady ? (
              <span className="text-xs text-ochre">Add your Gemini key in Settings to generate.</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="mono-meta">Output · redesigned room</p>
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
              onRefine={(image) => beginRefine('interior', image)}
            />
          ) : !error ? (
            <div className="flex flex-1 items-center justify-center border border-dashed border-hairline bg-paper px-6 py-16 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-mist">
                Your redesigned room will appear here. Upload a photo, pick a style, and Generate.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Before / after — the moment interior clients care about most. */}
      {inputUsed && outputs.length > 0 ? (
        <CompareSection before={inputUsed} after={outputs[0].url} beforeLabel="Room" afterLabel="Redesign" />
      ) : null}
    </div>
  );
}
