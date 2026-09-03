import { ChevronDown, RefreshCw, Settings2, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { EXAMPLES } from '../../lib/examples';
import { INPUT_KINDS, INPUT_KIND_HINT, INPUT_KIND_LABEL } from '../registry/keys';
import type { InputKind } from '../registry/keys';
import { batchBlockedReason, toolsForKind } from '../registry';
import type { FeatureDef } from '../registry';
import type { FeatureKind } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';

/** How many cards before the rest go behind a disclosure. A building render can
 *  feed seventeen tools; showing all of them is a wall, not a shortlist. */
const SHOW_FIRST = 6;

/** The output side of a card's preview, when the app already ships one. Uses
 *  the bundled worked examples rather than new assets — five tools have them
 *  today, and the rest show their icon until P2 fills the gaps. */
function previewFor(feature: FeatureKind): string | undefined {
  return EXAMPLES[feature]?.cases[0]?.output;
}

interface ToolCardProps {
  def: FeatureDef;
  input: string;
  blocked: string | null;
  onRun: () => void;
  onOpen: () => void;
}

function ToolCard({ def, input, blocked, onRun, onOpen }: ToolCardProps) {
  const Icon = def.icon;
  const preview = previewFor(def.key);
  // A tool needing a second image or a marked region cannot run from one drop.
  // The card still appears — the transformation IS available — but it says so
  // and takes you where it can be set up, rather than failing after a tap.
  const needsSetup = blocked !== null;
  return (
    <button
      type="button"
      data-card={def.key}
      onClick={needsSetup ? onOpen : onRun}
      className="group flex flex-col overflow-hidden rounded-card border border-hairline bg-paper text-left transition-all hover:border-ochre/60 hover:shadow-card active:scale-[0.995]"
    >
      <span className="grid grid-cols-2 gap-px bg-hairline">
        <img src={input} alt="" className="aspect-square w-full object-cover" />
        {preview ? (
          <img src={preview} alt="" loading="lazy" className="aspect-square w-full object-cover" />
        ) : (
          <span className="flex aspect-square w-full items-center justify-center bg-drafting">
            <Icon size={22} strokeWidth={1.5} className="text-mist" />
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="flex items-center gap-2">
          <Icon size={14} strokeWidth={1.75} className="shrink-0 text-mist" />
          <span className="text-label font-medium text-ink">{def.verb}</span>
        </span>
        <span className="text-caption text-mist">{def.blurb}</span>
        {needsSetup ? <span className="mt-1 text-caption text-graphite">{blocked}</span> : null}
      </span>
    </button>
  );
}

interface ToolPickerProps {
  input: string;
  kind: InputKind;
  /** True when the kind was guessed from pixels rather than known from a sample
   *  — the chip row leads with a question in that case. */
  guessed: boolean;
  onRun: (feature: FeatureKind) => void;
  onReplace: () => void;
}

/**
 * "What is this?" answered once, then "make it…" answered once. Two taps total,
 * and the first one is usually already correct.
 *
 * The cards are derived from `inputKind`, so a tool joins this screen by
 * declaring what it reads — the same property that makes the nav rows and the
 * prompt snapshot derived rather than maintained.
 */
export function ToolPicker({ input, kind, guessed, onRun, onReplace }: ToolPickerProps) {
  const setStudioKind = useProjectStore((s) => s.setStudioKind);
  const setTab = useProjectStore((s) => s.setTab);
  const engineReady = useProjectStore((s) => s.engineReady);
  const generation = useProjectStore((s) => s.generation);
  const [expanded, setExpanded] = useState(false);

  const tools = useMemo(() => toolsForKind(kind), [kind]);
  const shown = expanded ? tools : tools.slice(0, SHOW_FIRST);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* What you dropped, and what it is. */}
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-card border border-hairline bg-drafting">
            <img src={input} alt="Your image" className="max-h-64 w-full object-contain" />
            <button
              type="button"
              onClick={onReplace}
              data-replace
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-label font-medium text-bone backdrop-blur-sm transition-colors hover:bg-ink"
            >
              <RefreshCw size={14} strokeWidth={1.75} /> Change
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="section-heading">{guessed ? 'Looks like a…' : 'This is a…'}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What kind of image is this">
              {INPUT_KINDS.map((k) => {
                const on = k === kind;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-kind={k}
                    onClick={() => setStudioKind(k)}
                    className={`pill border px-3 py-1.5 text-caption transition-colors ${
                      on
                        ? 'border-ochre-deep bg-ochre-deep font-medium text-white'
                        : 'border-hairline bg-paper text-graphite hover:border-mist/40 hover:bg-drafting'
                    }`}
                  >
                    {INPUT_KIND_LABEL[k]}
                  </button>
                );
              })}
            </div>
            <p className="text-caption text-mist">
              {guessed ? `${INPUT_KIND_HINT[kind]}. Tap another if that is wrong — it only changes what is offered.` : INPUT_KIND_HINT[kind]}
            </p>
          </div>
        </div>

        {/* What it can become. */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="section-heading">Make it…</p>
            <p className="text-caption text-mist">
              {tools.length} {tools.length === 1 ? 'option' : 'options'} for a {INPUT_KIND_LABEL[kind].toLowerCase()}
            </p>
          </div>

          {tools.length === 0 ? (
            <Notice
              tone="warning"
              message="Nothing here works on that kind of image yet. Try another chip — or a different image."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {shown.map((def) => (
                  <ToolCard
                    key={def.key}
                    def={def}
                    input={input}
                    blocked={batchBlockedReason(def.key, generation[def.key].settings)}
                    onRun={() => onRun(def.key)}
                    onOpen={() => setTab(def.key)}
                  />
                ))}
              </div>
              {tools.length > SHOW_FIRST ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  icon={expanded ? <X size={14} strokeWidth={1.75} /> : <ChevronDown size={14} strokeWidth={1.75} />}
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? 'Show fewer' : `Show all ${tools.length}`}
                </Button>
              ) : null}
            </>
          )}

          {!engineReady ? (
            <p className="text-caption text-mist">
              <Sparkles size={12} strokeWidth={1.75} className="mr-1 inline align-[-1px]" />
              You will be asked for an API key the first time you run one. It is free, and it stays in this browser.
            </p>
          ) : null}
        </div>
      </div>

      {/* Everything the front door does not show, one link away rather than gone. */}
      <p className="text-caption text-mist">
        <Settings2 size={12} strokeWidth={1.75} className="mr-1 inline align-[-1px]" />
        Want the full controls, the prompt, or to run several at once? Open any card&rsquo;s tool from{' '}
        <button
          type="button"
          onClick={() => setTab('home')}
          className="rounded-control text-ochre-deep underline decoration-ochre/40 underline-offset-2 transition-colors hover:decoration-ochre-deep"
        >
          the full tool list
        </button>
        .
      </p>
    </div>
  );
}
