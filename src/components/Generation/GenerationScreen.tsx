import { ChevronLeft, RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ExampleShowcase } from '../Examples/ExampleShowcase';
import { CompareSection } from '../Output/CompareSection';
import { OutputGrid } from '../Output/OutputGrid';
import { RefineChips } from '../Scene/RefineChips';
import { ImageDropzone } from '../Upload/ImageDropzone';
import { MarkerCanvas } from '../Upload/MarkerCanvas';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Notice } from '../ui/Notice';
import { SectionHeader } from '../ui/SectionHeader';
import { buildFeatureRequest, categoryOf, displayIndex, featureDef } from '../../features/registry';
import type { FeatureKind, RunContext, SettingsFor } from '../../features/registry';
import { useGenerate } from '../../features/hooks';
import { burnMarker } from '../../lib/images';
import { buildRefinePrompt } from '../../lib/prompts';
import type { RefineChip } from '../../lib/refine';
import { useProjectStore } from '../../store/useProjectStore';
import type { FeatureMode, SettingsPatch } from '../../store/generation';

/**
 * The shared generation screen.
 *
 * Every tool repeated the same ~161 lines: eight store selectors, the
 * prompt-sync effect, the generate handler, the dropzone, the refine panel, the
 * prompt box, the action row, the output column and the compare slider. At five
 * screens that was already 56% duplication AND it had visibly drifted — two
 * incompatible card layouts coexisted, the Reset control was a Button on one
 * screen and a bare <button> on another, and three of the five were missing the
 * `fieldset disabled` guard, so their controls stayed editable mid-run while the
 * options were already locked into the in-flight request.
 *
 * At ~54 tools that is not a tidiness problem, it is the whole cost of adding
 * one. Everything a tool needs to differ on lives on its registry entry; only
 * its actual controls come through `children`.
 */

export interface ControlsContext<K extends FeatureKind> {
  feature: K;
  settings: SettingsFor<K>;
  patch: (p: SettingsPatch<SettingsFor<K>>) => void;
  mode: FeatureMode;
  loading: boolean;
}

export interface GenerationScreenProps<K extends FeatureKind> {
  feature: K;
  /** The tool's own controls. Rendered inside the disabled-while-running fieldset. */
  children?: (ctx: ControlsContext<K>) => ReactNode;
  /** Extra content directly under the input dropzone (e.g. the plan-prep tips). */
  belowInput?: ReactNode;
  /** Refine chips specific to this tool; defaults to the general set. */
  refineChips?: RefineChip[];
  /**
   * What this run attaches beyond the input.
   *
   * `useMoodboard` and `useStyleRef` are deliberately SEPARATE flags, not one
   * "has a reference" boolean: they select different prompt clauses (an uploaded
   * mood board vs. a pooled output chained as a style reference), and the tools
   * that support both treat them as mutually exclusive.
   */
  run?: Pick<RunContext, 'referenceImages' | 'styleVariants'> & {
    useMoodboard?: boolean;
    useStyleRef?: boolean;
    /**
     * Settings to build the PROMPT from, when they differ from the stored ones.
     * Compare-styles needs this: the base prompt must carry no style, because
     * the provider appends a different one per variant.
     */
    promptSettings?: unknown;
  };
  /** Overrides the empty/compare/output labels when a tool's mode changes them. */
  labels?: { emptyTitle?: string; emptyDescription?: string; compareAfter?: string };
}

export function GenerationScreen<K extends FeatureKind>({
  feature,
  children,
  belowInput,
  refineChips,
  run: runExtras,
  labels,
}: GenerationScreenProps<K>) {
  const def = featureDef(feature);
  const { input, extraInputs, marker, settings, mode, refine, prompt, promptEdited } = useProjectStore(
    (s) => s.generation[feature],
  );
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const setFeatureExtraInput = useProjectStore((s) => s.setFeatureExtraInput);
  const updateFeatureSettings = useProjectStore((s) => s.updateFeatureSettings);
  const setFeaturePrompt = useProjectStore((s) => s.setFeaturePrompt);
  const patchFeatureRun = useProjectStore((s) => s.patchFeatureRun);
  const beginRefine = useProjectStore((s) => s.beginRefine);
  const exitRefine = useProjectStore((s) => s.exitRefine);
  const removeImage = useProjectStore((s) => s.removeImage);
  const sendToFeature = useProjectStore((s) => s.sendToFeature);
  const setTab = useProjectStore((s) => s.setTab);

  const typedSettings = settings as SettingsFor<K>;
  const refs = runExtras?.referenceImages;
  const useMoodboard = runExtras?.useMoodboard ?? false;
  const useStyleRef = runExtras?.useStyleRef ?? false;

  const suggestedPrompt = useMemo(
    () =>
      mode === 'refine'
        ? buildRefinePrompt(refine)
        : def.buildPrompt((runExtras?.promptSettings ?? settings) as never, {
            useMoodboard,
            useStyleRef,
            hasMarker: marker !== null,
          }),
    [mode, refine, settings, def, useMoodboard, useStyleRef, marker, runExtras?.promptSettings],
  );

  // Controls drive the prompt until the user edits it, then they stop.
  useEffect(() => {
    if (!promptEdited && suggestedPrompt !== prompt) setFeaturePrompt(feature, suggestedPrompt, false);
  }, [suggestedPrompt, promptEdited, prompt, setFeaturePrompt, feature]);

  const { status, error, warning, outputs, inputUsed, engineReady, run, cancel } = useGenerate(feature);
  const loading = status === 'loading';

  // A text-only tool has nothing to upload, so "has an input" is vacuously true
  // for it — otherwise every such tool would be permanently blocked by a
  // dropzone it does not have.
  const wantsImage = def.inputMode !== 'text';
  const hasInput = !wantsImage || input !== null;

  const slots = def.extraInputs ?? [];
  const missingSlot = slots.findIndex((_, i) => !extraInputs[i]);

  const blocked =
    def.blockedReason?.(settings, hasInput, mode) ??
    (hasInput ? null : 'Upload an image to begin.') ??
    null;
  // A tool's own extra inputs are as required as the primary one — running
  // without them would silently produce something else entirely.
  const slotBlocked =
    mode === 'refine' || missingSlot === -1 ? null : `Add ${slots[missingSlot].label.toLowerCase()} to begin.`;
  const markerBlocked =
    def.marker === 'required' && !marker ? 'Mark the area on the image to begin.' : null;
  const allBlocked = blocked ?? slotBlocked ?? markerBlocked;
  const canGenerate = allBlocked === null;

  const handleGenerate = () => {
    if (!canGenerate) return;
    const ctx: RunContext = {
      refine: mode === 'refine',
      referenceImages: refs,
      styleVariants: runExtras?.styleVariants,
    };
    // Order is the contract: the primary image first, then each declared slot in
    // the order the prompt names them.
    const send = async () => {
      let primary = input;
      if (primary && marker) primary = await burnMarker(primary, marker);
      const inputImages = [primary, ...slots.map((_, i) => extraInputs[i] ?? null)].filter(
        (u): u is string => typeof u === 'string',
      );
      await run(buildFeatureRequest(feature, settings, { inputImages, prompt, ctx }));
    };
    void send();
  };

  const promptId = `${feature}-prompt`;
  const plannedCount = def.plannedCount?.(settings, mode) ?? 1;

  const category = categoryOf(feature);

  return (
    <div>
      {/* The sidebar lists categories now, so a tool screen has no row of its
          own to be "at". Without this you can open a tool from the rail and have
          nothing on the page that leads back to its siblings. */}
      <button
        type="button"
        data-back-to-category={category.key}
        onClick={() => setTab(category.tab)}
        className="mb-4 -ml-1 inline-flex items-center gap-1.5 rounded-field px-1.5 py-1 text-caption text-mist transition-colors hover:bg-drafting hover:text-graphite"
      >
        <ChevronLeft size={14} strokeWidth={1.75} />
        {category.label}
      </button>

      <SectionHeader index={displayIndex(feature)} eyebrow={def.ui.eyebrow} title={def.ui.title} description={def.ui.description} />

      {/* Worked examples — open until this tab has produced something. */}
      <ExampleShowcase feature={feature} defaultOpen={outputs.length === 0} />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ONE card with hairline dividers. Separately elevated boxes gave each
            group equal weight and read as a stack of unrelated widgets. */}
        <div className="flex flex-col rounded-card border border-hairline bg-paper shadow-card">
          {/* The options are already locked into an in-flight request, so the
              whole control stack goes dead while one is running. */}
          <fieldset
            disabled={loading}
            className={`flex min-w-0 flex-col divide-y divide-hairline transition-opacity ${loading ? 'opacity-60' : ''}`}
          >
            {wantsImage ? (
              <div className="flex flex-col gap-3 p-5">
                <div>
                  <p className="section-heading">{def.ui.inputLabel}</p>
                  <p className="mt-1 text-caption text-mist">{def.ui.inputHint}</p>
                </div>
                {/* Once a marker-capable tool has an image, the marker view
                    REPLACES the dropzone: both at once put the same picture on
                    the card twice and pushed everything else below the fold. */}
                {def.marker && input ? (
                  <MarkerCanvas
                    src={input}
                    value={marker}
                    disabled={loading}
                    onChange={(rect) => patchFeatureRun(feature, { marker: rect })}
                    onReplaceImage={() => setFeatureInput(feature, null)}
                  />
                ) : (
                  <ImageDropzone
                    value={input}
                    onImage={(url) => setFeatureInput(feature, url)}
                    onClear={() => setFeatureInput(feature, null)}
                  />
                )}
                {belowInput}
              </div>
            ) : (
              belowInput ? <div className="flex flex-col gap-3 p-5">{belowInput}</div> : null
            )}

            {/* A tool's own extra inputs, one labelled dropzone per declared slot
                and in the order the prompt names them. */}
            {mode === 'refine'
              ? null
              : slots.map((slot, i) => (
                  <div key={slot.label} className="flex flex-col gap-3 p-5">
                    <div>
                      <p className="section-heading">{slot.label}</p>
                      <p className="mt-1 text-caption text-mist">{slot.hint}</p>
                    </div>
                    <ImageDropzone
                      value={extraInputs[i] ?? null}
                      onImage={(url) => setFeatureExtraInput(feature, i, url)}
                      onClear={() => setFeatureExtraInput(feature, i, null)}
                    />
                  </div>
                ))}

            {/* Refine REPLACES the controls rather than sitting under them — the
                controls are ignored in this mode, so showing them would lie. */}
            {mode === 'refine' ? (
              <div className="p-5">
                <div className="flex flex-col gap-3 rounded-field border border-ochre/15 bg-ochre/[0.05] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="section-heading">Refining</p>
                      <p className="mt-1 truncate text-caption text-mist">{refine.sourceLabel}</p>
                    </div>
                    <Button variant="ghost" size="sm" icon={<X size={14} strokeWidth={1.75} />} onClick={() => exitRefine(feature)}>
                      Exit refine
                    </Button>
                  </div>
                  <RefineChips
                    value={refine}
                    chips={refineChips}
                    onChange={(patch) => patchFeatureRun(feature, { refine: { ...refine, ...patch } })}
                  />
                </div>
              </div>
            ) : (
              children?.({
                feature,
                settings: typedSettings,
                patch: (p) => updateFeatureSettings(feature, p),
                mode,
                loading,
              })
            )}

            <div className="flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label htmlFor={promptId} className="section-heading">
                    Prompt
                  </label>
                  <p className="mt-1 text-caption text-mist">Auto-generated from the controls — edit freely</p>
                </div>
                {promptEdited ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw size={14} strokeWidth={1.75} />}
                    onClick={() => setFeaturePrompt(feature, suggestedPrompt, false)}
                  >
                    Reset
                  </Button>
                ) : null}
              </div>
              {/* Assembled prompts run past four lines — let the box grow rather
                  than hide the tail behind an internal scrollbar. */}
              <textarea
                id={promptId}
                value={prompt}
                onChange={(e) => setFeaturePrompt(feature, e.target.value, true)}
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
              {allBlocked ? <span className="text-body text-mist">{allBlocked}</span> : null}
            </div>
            {/* Blocked, not wrong — a warning tone, and it names a destination. */}
            {!engineReady ? <Notice tone="warning" message="Add your Gemini key in Settings to generate." /> : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="section-heading">Output</p>
            <p className="mt-1 text-caption text-mist">{def.ui.outputCaption}</p>
          </div>
          {/* Some tools have to infer what the input could not show. Saying so
              ON THE OUTPUT is the point — a caveat in the description is read
              once, before there is anything to be sceptical about. */}
          {def.accuracyWarning ? <Notice tone="warning" message={def.accuracyWarning} /> : null}
          {error ? <ErrorBanner message={error} onRetry={handleGenerate} /> : null}
          {warning ? <Notice tone="warning" message={warning} /> : null}
          {loading || outputs.length > 0 ? (
            <OutputGrid
              outputs={outputs}
              loading={loading}
              loadingCount={mode === 'refine' ? 1 : plannedCount}
              onDelete={removeImage}
              onRefine={(image) => beginRefine(feature, image)}
              sendTargets={def.sendTargets.map((t) => ({ target: t, label: `Send to ${featureDef(t).name}` }))}
              onSend={(target, image) => sendToFeature(target, image.url)}
            />
          ) : !error ? (
            <EmptyState
              icon={def.ui.emptyIcon}
              title={labels?.emptyTitle ?? def.ui.emptyTitle}
              description={labels?.emptyDescription ?? def.ui.emptyDescription}
            />
          ) : null}
        </div>
      </div>

      {def.ui.compare && inputUsed && outputs.length > 0 ? (
        <CompareSection
          before={inputUsed}
          after={outputs[0].url}
          beforeLabel={def.ui.compare.before}
          afterLabel={labels?.compareAfter ?? def.ui.compare.after}
        />
      ) : null}
    </div>
  );
}
