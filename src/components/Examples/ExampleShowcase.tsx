import { ArrowRight, ChevronDown, Sparkles, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { CHECKS } from '../../lib/checks';
import type { ToolChecks } from '../../lib/checks';
import { EXAMPLES, TRY_INPUT, loadExampleInput } from '../../lib/examples';
import type { ExampleCase } from '../../lib/examples';
import { useProjectStore } from '../../store/useProjectStore';
import type { FeatureKind } from '../../types';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

interface ExampleShowcaseProps {
  feature: FeatureKind;
  /**
   * Open on arrival. True on a tab with nothing generated yet — the whole point
   * is that a first-time visitor sees what the tab does without running anything.
   */
  defaultOpen?: boolean;
}

// A worked example is the one image in the app that must not be cropped: it is
// the whole answer to "what does this tool do". `object-cover` in a fixed 4:3
// box was fine while the only examples were the original five, which are all
// near-4:3 — it silently took 27% off every 3:2 output and 40% off the portrait
// FF&E sheet once twenty-two more landed, cutting the ends off a section drawing
// and half the items off a spec sheet.
//
// So: keep the fixed box, because two panels that line up read as a pair, but
// CONTAIN rather than cover. Letterboxing on a neutral ground is honest; a
// cropped drawing is a different drawing.
const CASE_IMG =
  'aspect-[4/3] w-full rounded-control border border-hairline bg-drafting object-contain';

/** One worked run: the input, an arrow, and what came back. */
function CasePanel({ example }: { example: ExampleCase }) {
  return (
    <figure className="flex flex-col gap-3 rounded-field border border-hairline bg-paper p-4">
      <figcaption className="flex flex-col gap-1">
        <span className="section-heading">{example.label}</span>
        <span className="text-caption leading-relaxed text-mist">{example.note}</span>
      </figcaption>

      {example.input ? (
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-caption text-mist">{example.inputLabel ?? 'Input'}</span>
            <img
              src={example.input}
              alt={example.inputLabel ?? 'Example input'}
              loading="lazy"
              className={CASE_IMG}
            />
          </div>
          <ArrowRight size={18} strokeWidth={1.75} className="shrink-0 text-ochre" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-caption text-mist">{example.outputLabel ?? 'Output'}</span>
            <img
              src={example.output}
              alt={example.outputLabel ?? 'Example output'}
              loading="lazy"
              className={CASE_IMG}
            />
          </div>
        </div>
      ) : (
        // Composed outputs (a collage board) have no transformed
        // input — show the result full width rather than faking a pair.
        <div className="flex flex-col gap-1.5">
          <span className="text-caption text-mist">{example.outputLabel ?? 'Output'}</span>
          <img
            src={example.output}
            alt={example.outputLabel ?? 'Example output'}
            loading="lazy"
            className="w-full rounded-control border border-hairline bg-drafting object-contain"
          />
        </div>
      )}
    </figure>
  );
}

const LIVE: Record<ToolChecks['live'], { label: string; tone: string }> = {
  passed: { label: 'Live-tested · passed', tone: 'bg-success-soft text-success' },
  caveat: { label: 'Live-tested · passed with a caveat', tone: 'bg-warning-soft text-warning' },
  pending: { label: 'Not live-tested yet', tone: 'bg-drafting text-mist' },
};

const ROW = 'grid gap-1 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-4';

/**
 * What a good result must get right, as before (what you give) → after (what
 * comes back): the checks the paid live runs are judged on, in the user's
 * words. Stacks to one column on a phone, each cell carrying its own label.
 */
function CheckTable({ checks }: { checks: ToolChecks }) {
  const live = LIVE[checks.live];
  return (
    <div className="flex flex-col gap-3 rounded-field border border-hairline bg-paper p-4 sm:col-span-full" data-check-table>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="section-heading">What we check</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-caption ${live.tone}`} data-live={checks.live}>
          {live.label}
        </span>
      </div>
      <div role="table" aria-label="What we check" className="flex flex-col text-caption">
        <div role="row" className={`${ROW} hidden border-b border-hairline pb-2 text-mist sm:grid`}>
          <span role="columnheader">Check</span>
          <span role="columnheader">Before — you give</span>
          <span role="columnheader">After — a good result</span>
        </div>
        {checks.rows.map((r) => (
          <div role="row" key={r.check} className={`${ROW} border-b border-hairline py-2.5 last:border-b-0`}>
            <span role="cell" className="font-medium text-graphite">
              {r.check}
            </span>
            {/* An empty "before" is a column filler on a wide screen; stacked,
                it would be a line that says nothing. */}
            <span role="cell" className={`leading-relaxed text-mist ${r.before === '—' ? 'hidden sm:block' : ''}`}>
              <span className="text-mist sm:hidden">Before: </span>
              {r.before}
            </span>
            <span role="cell" className="leading-relaxed text-graphite">
              <span className="text-mist sm:hidden">After: </span>
              {r.after}
            </span>
          </div>
        ))}
      </div>
      {checks.note || checks.live === 'pending' ? (
        <p className="text-caption leading-relaxed text-mist">
          {checks.note ?? 'These are the checks its first paid run will be judged on.'}
        </p>
      ) : null}
    </div>
  );
}

/**
 * "What does this tab do?" — real input → output pairs this app produced on
 * Nano Banana Pro, shipped as static assets. Costs no API call to look at, and
 * offers a one-click load of the same input so the first real run needs no
 * upload.
 */
export function ExampleShowcase({ feature, defaultOpen = false }: ExampleShowcaseProps) {
  const set = EXAMPLES[feature];
  const checks = CHECKS[feature];
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);

  if (!set && !checks) return null;

  const tryInput = TRY_INPUT[feature];

  const handleTry = () => {
    if (!tryInput) return;
    setLoading(true);
    void loadExampleInput(tryInput.url)
      .then((dataUrl) => setFeatureInput(feature as FeatureKind, dataUrl))
      .catch(() => {
        /* the dropzone stays empty; the user can still upload their own */
      })
      .finally(() => setLoading(false));
  };

  return (
    <section className="mb-8 overflow-hidden rounded-card border border-hairline bg-drafting/60">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-ochre/10 text-ochre-deep">
            <Wand2 size={16} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="section-heading">See what this does</h2>
            <p className="mt-1 max-w-2xl text-body leading-relaxed text-graphite">
              {set?.summary ?? 'No worked example yet — here is what a good result must get right.'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {tryInput ? (
            <Button
              size="sm"
              variant="secondary"
              icon={loading ? undefined : <Sparkles size={14} strokeWidth={1.75} />}
              onClick={handleTry}
              disabled={loading}
            >
              {loading ? <Spinner size={14} /> : null}
              {loading ? 'Loading…' : `Use the ${tryInput.label}`}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            icon={
              <ChevronDown
                size={15}
                strokeWidth={1.75}
                className={`transition-transform ${open ? 'rotate-180' : ''}`}
              />
            }
          >
            {open
              ? 'Hide'
              : set
                ? `Show ${set.cases.length} example${set.cases.length > 1 ? 's' : ''} and checks`
                : 'Show what we check'}
          </Button>
        </div>
      </div>

      {open ? (
        // Two columns only when there is something to put in both. Twenty-two
        // tools have exactly one worked example, and a single case in a
        // two-column grid renders at half width — the smallest possible version
        // of the one image that answers "what does this tool do".
        <div
          className={`grid gap-4 border-t border-hairline p-5 ${
            set && set.cases.length > 1 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'
          }`}
        >
          {set?.cases.map((example) => (
            <CasePanel key={example.label} example={example} />
          ))}
          {checks ? <CheckTable checks={checks} /> : null}
          {set ? (
            <p className="text-caption leading-relaxed text-mist sm:col-span-full">
              Real runs from this app on Nano&nbsp;Banana&nbsp;Pro — shown from bundled images, so browsing them costs
              nothing. Your own results will differ with your inputs and settings.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
