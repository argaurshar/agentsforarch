import { ChevronDown, RefreshCw, Settings2, Sparkles, X, Zap } from 'lucide-react';
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
import { instantFeatures, instantFor } from './instant';

/** How many cards before the rest go behind a disclosure. A building render can
 *  feed seventeen tools; showing all of them is a wall, not a shortlist. */
const SHOW_FIRST = 6;

/**
 * The output side of a card's preview.
 *
 * When a prepared result exists for THIS input, that is the preview — the card
 * is then showing the exact image the tap will produce, not a picture of what
 * the tool did to something else. Otherwise it falls back to the tool's first
 * worked example, and to its icon when there is none.
 */
function previewFor(feature: FeatureKind, source: string | null): string | undefined {
  return instantFor(source, feature)?.output ?? EXAMPLES[feature]?.cases[0]?.output;
}

interface ToolCardProps {
  def: FeatureDef;
  input: string;
  source: string | null;
  blocked: string | null;
  onRun: () => void;
  onOpen: () => void;
}

function ToolCard({ def, input, source, blocked, onRun, onOpen }: ToolCardProps) {
  const Icon = def.icon;
  const preview = previewFor(def.key, source);
  const instant = instantFor(source, def.key) !== null;
  // A tool needing a second image or a marked region cannot run from one drop.
  // The card still appears — the transformation IS available — but it says so
  // and takes you where it can be set up, rather than failing after a tap.
  const needsSetup = blocked !== null;
  return (
    <button
      type="button"
      data-card={def.key}
      onClick={needsSetup ? onOpen : onRun}
      className={`group relative flex flex-col overflow-hidden rounded-card border bg-paper text-left transition-all hover:shadow-card active:scale-[0.995] ${
        instant ? 'border-ochre/50 hover:border-ochre' : 'border-hairline hover:border-ochre/60'
      }`}
    >
      {/* Says out loud that this one needs nothing. Without the badge a visitor
          cannot tell which card will answer for free and which will stop and
          ask for a key — and finding out by tapping is the wrong way round.
          On the image it is a MARK, not a sentence: at 390px the full wording
          spanned most of a card and hid the before/after preview that is the
          entire reason the card is worth tapping. The words live in the body
          below, where they cost nothing. */}
      {instant ? (
        <span
          data-instant
          aria-label="No key needed"
          className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-ink/80 px-2 py-1 text-caption font-medium text-bone backdrop-blur-sm"
        >
          <Zap size={11} strokeWidth={2} />
          <span className="hidden xl:inline">No key needed</span>
        </span>
      ) : null}
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
        {instant ? (
          <span className="mt-1 flex items-center gap-1 text-caption font-medium text-ochre-deep">
            <Zap size={11} strokeWidth={2} /> No key needed
          </span>
        ) : null}
        {needsSetup ? <span className="mt-1 text-caption text-graphite">{blocked}</span> : null}
      </span>
    </button>
  );
}

interface ToolPickerProps {
  input: string;
  kind: InputKind;
  /** The bundled asset this input came from, when it is one. */
  source: string | null;
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
export function ToolPicker({ input, kind, guessed, source, onRun, onReplace }: ToolPickerProps) {
  const setStudioKind = useProjectStore((s) => s.setStudioKind);
  const setTab = useProjectStore((s) => s.setTab);
  const engineReady = useProjectStore((s) => s.engineReady);
  const generation = useProjectStore((s) => s.generation);
  const [expanded, setExpanded] = useState(false);

  // Cards that can answer with no key come first. Registry order is workflow
  // order and is the right default — but for a visitor who has not given the
  // app anything, the card that works is the one worth putting under their
  // thumb. With a user's own image nothing is instant, so the order is
  // untouched: this reorders the demo, not the product.
  const tools = useMemo(() => {
    const all = toolsForKind(kind);
    const free = instantFeatures(source);
    if (free.size === 0) return all;
    return [...all.filter((f) => free.has(f.key)), ...all.filter((f) => !free.has(f.key))];
  }, [kind, source]);
  const freeCount = useMemo(() => {
    const free = instantFeatures(source);
    return tools.filter((f) => free.has(f.key)).length;
  }, [tools, source]);
  const shown = expanded ? tools : tools.slice(0, SHOW_FIRST);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* What you dropped, and what it is.
            `min-w-0` on the column and the row below it: a grid item defaults to
            `min-width: auto`, so the scrollable chip row's min-content width —
            six chips on one line, ~700px — stretched this column and put a
            horizontal scrollbar on the whole page. */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative overflow-hidden rounded-card border border-hairline bg-drafting">
            {/* Shorter on a phone. At max-h-64 the preview plus a six-chip
                wrapped kind row pushed the first card past 1,000px — so the
                one question this screen exists to answer, "make it…", was
                entirely below the fold on the device most likely to be
                holding the photo. */}
            <img src={input} alt="Your image" className="max-h-40 w-full object-contain sm:max-h-64" />
            <button
              type="button"
              onClick={onReplace}
              data-replace
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-label font-medium text-bone backdrop-blur-sm transition-colors hover:bg-ink"
            >
              <RefreshCw size={14} strokeWidth={1.75} /> Change
            </button>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <p className="section-heading">{guessed ? 'Looks like a…' : 'This is a…'}</p>
            {/* One scrollable line on a phone, wrapped from `sm` up: six chips
                wrap to three rows at 390px, and the rows are pure height in
                front of the cards. */}
            <div
              className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
              role="radiogroup"
              aria-label="What kind of image is this"
            >
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
                    className={`pill shrink-0 snap-start border px-3 py-1.5 text-caption transition-colors ${
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
                    source={source}
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
              {freeCount > 0
                ? `${freeCount === 1 ? 'The marked card is' : `The ${freeCount} marked cards are`} already made — tap one to see a real result now. The rest ask for an API key, which is free and stays in this browser.`
                : 'You will be asked for an API key the first time you run one. It is free, and it stays in this browser.'}
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
