import { ChevronDown, Settings2, Sparkles, Wand2, X } from 'lucide-react';
import { useState } from 'react';
import { QuickControls } from '../../components/Generation/QuickControls';
import { RefineChips } from '../../components/Scene/RefineChips';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { useDialog } from '../../lib/useDialog';
import { buildRefinePrompt } from '../../lib/prompts';
import { featureDef } from '../registry';
import type { FeatureKind } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';

interface TweakSheetProps {
  feature: FeatureKind;
  /** The result on screen — what "change this" acts on. */
  output: string;
  /** True when that result is a prepared example rather than a live run. */
  prepared: boolean;
  onClose: () => void;
  /** Re-run the tool on the ORIGINAL input with the current settings. */
  onRerun: () => void;
  /** Run an edit pass on the RESULT, with this prompt. */
  onRefine: (prompt: string) => void;
}

/**
 * Two ways to change a result, kept apart because they are different runs.
 *
 *   SETTINGS  change the recipe, and re-run the tool on the original input.
 *             A different light, a different face, hatching on. The input is
 *             untouched; you get another take on the same source.
 *   THIS IMAGE change the OUTPUT, by sending it back through as an edit. Warmer
 *             light, more glass, remove the people. The original input is not
 *             involved at all.
 *
 * Collapsing those into one "Regenerate" button would mean guessing which the
 * user meant, and the two produce visibly different results from the same words.
 *
 * NOTHING here fires on change. The plan said "regenerate on change"; on a tool
 * that bills per image, a chip row that spends money on every tap is a trap, so
 * each section has its own button and says what it is about to do.
 */
export function TweakSheet({ feature, output, prepared, onClose, onRerun, onRefine }: TweakSheetProps) {
  const def = featureDef(feature);
  const settings = useProjectStore((s) => s.generation[feature].settings);
  const prompt = useProjectStore((s) => s.generation[feature].prompt);
  const refine = useProjectStore((s) => s.generation[feature].refine);
  const updateFeatureSettings = useProjectStore((s) => s.updateFeatureSettings);
  const patchFeatureRun = useProjectStore((s) => s.patchFeatureRun);
  const setFeaturePrompt = useProjectStore((s) => s.setFeaturePrompt);
  const providerName = useProjectStore((s) => s.providerName);
  const setTab = useProjectStore((s) => s.setTab);
  const [advanced, setAdvanced] = useState(false);

  const ref = useDialog<HTMLDivElement>({ open: true, onClose });
  const hasQuick = (def.quick ?? []).length > 0;
  const refineReady = refine.chips.length > 0 || refine.freeText.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      {/* Backdrop closes, but is not the only way out — Escape and the X both
          work, because a sheet you can only dismiss by hitting the edge is a
          trap on a phone where the edge is under your thumb. */}
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />

      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Tweak — ${def.verb}`}
        data-tweak-sheet
        className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-card border border-hairline bg-paper shadow-card sm:max-w-lg sm:rounded-card"
      >
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <p className="section-heading">Tweak</p>
            <p className="mt-0.5 truncate text-caption text-mist">{def.verb}</p>
          </div>
          <Button variant="ghost" size="sm" icon={<X size={14} strokeWidth={1.75} />} onClick={onClose} data-tweak-close>
            Close
          </Button>
        </div>

        {/* `min-h-0` or the scroll area refuses to shrink below its content and
            the panel grows past its own max-height, pushing the footer off the
            bottom of the screen. */}
        <div className="flex min-h-0 flex-col divide-y divide-hairline overflow-y-auto">
          {/* --- Settings: another take on the same input -------------------- */}
          {hasQuick ? (
            <div className="flex flex-col gap-4 p-5">
              <div>
                <p className="section-heading">Settings</p>
                <p className="mt-1 text-caption text-mist">
                  Changes the recipe and runs it again on your original image.
                </p>
              </div>
              <QuickControls feature={feature} settings={settings} patch={(p) => updateFeatureSettings(feature, p)} dense />
              <Button
                variant="primary"
                size="sm"
                className="self-start"
                icon={<Sparkles size={14} strokeWidth={1.75} />}
                onClick={onRerun}
                data-tweak-rerun
              >
                Run again with these
              </Button>
            </div>
          ) : (
            <div className="p-5">
              <p className="section-heading">Settings</p>
              <p className="mt-1 text-caption text-mist">
                This one has no quick settings — what it needs is typed rather than tapped. Open the full controls below.
              </p>
            </div>
          )}

          {/* --- Refine: change the image on screen -------------------------- */}
          <div className="flex flex-col gap-4 p-5">
            <div>
              <p className="section-heading">Change this image</p>
              <p className="mt-1 text-caption text-mist">
                Sends the result back through as an edit — everything else is kept.
              </p>
            </div>
            <RefineChips
              value={refine}
              onChange={(patch) => patchFeatureRun(feature, { refine: { ...refine, ...patch } })}
            />
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              icon={<Wand2 size={14} strokeWidth={1.75} />}
              disabled={!refineReady}
              onClick={() => onRefine(buildRefinePrompt(refine))}
              data-tweak-refine
            >
              {refineReady ? 'Apply to this image' : 'Pick a change first'}
            </Button>
            {prepared ? (
              <Notice
                tone="warning"
                message="This result was prepared earlier, so either button here is a real generation — it needs an API key and costs what a run costs."
              />
            ) : null}
          </div>

          {/* --- Advanced ---------------------------------------------------- */}
          <div className="flex flex-col gap-3 p-5">
            <button
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              aria-expanded={advanced}
              data-tweak-advanced
              className="flex items-center gap-1.5 self-start rounded-control text-caption text-mist transition-colors hover:text-graphite"
            >
              <ChevronDown
                size={13}
                strokeWidth={1.75}
                className={`transition-transform ${advanced ? 'rotate-180' : ''}`}
              />
              Advanced — the prompt and the engine
            </button>
            {advanced ? (
              <>
                {/* Feature-keyed, like the tool screen's own box — the two are
                    never mounted together (this lives on the studio tab, that
                    one on the tool's), so `#render-prompt` finds the prompt box
                    on whichever surface is showing. A `tweak-prompt` literal
                    would have been a second convention for the same field. */}
                <label htmlFor={`${feature}-prompt`} className="mono-meta">
                  Prompt
                </label>
                <textarea
                  id={`${feature}-prompt`}
                  value={prompt}
                  onChange={(e) => setFeaturePrompt(feature, e.target.value, true)}
                  className="min-h-[7rem] resize-y rounded-field border border-hairline bg-drafting/50 px-3.5 py-2.5 text-body text-graphite"
                />
                <p className="text-caption text-mist">
                  Assembled from the settings above until you edit it, then it is yours. Running on{' '}
                  <span className="text-graphite">{providerName}</span>.
                </p>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setTab(feature)}
              data-tweak-full
              className="flex items-center gap-1.5 self-start rounded-control text-caption text-ochre-deep underline decoration-ochre/40 underline-offset-2 transition-colors hover:decoration-ochre-deep"
            >
              <Settings2 size={12} strokeWidth={1.75} />
              Open the full controls for {def.name}
            </button>
          </div>
        </div>

        {/* The result being tweaked, small, so it is clear WHAT is about to
            change on a phone where the sheet covers most of it. */}
        <div className="flex items-center gap-3 border-t border-hairline bg-drafting/40 px-5 py-3">
          <img src={output} alt="" className="h-10 w-10 rounded-control object-cover" />
          <p className="text-caption text-mist">Tweaking this result.</p>
        </div>
      </div>
    </div>
  );
}
