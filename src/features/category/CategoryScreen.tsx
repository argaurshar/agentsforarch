import { Check, ChevronRight, CircleAlert, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Notice } from '../../components/ui/Notice';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useDialog } from '../../lib/useDialog';
import { useProjectStore } from '../../store/useProjectStore';
import { useBatch } from '../batch';
import { CATEGORIES, batchBlockedReason, categoryDef } from '../registry';
import type { CategoryKey, FeatureDef, FeatureKind } from '../registry';

/**
 * A category, and everything you can do to one image inside it.
 *
 * This is the screen the flat sidebar became. Pick a stage of the job, pick as
 * many tools in it as you want, drop ONE image, and run them all — which is how
 * the work actually goes: you don't restyle a room and then re-upload the same
 * photo to declutter it.
 *
 * The per-tool screens are still there and still where you tune settings. This
 * screen runs each tool on whatever it is already set to, and says so, rather
 * than pretending five tools' worth of controls fit on one page.
 */

/** Above this many tools, Synthesize states the count and asks first. */
const CONFIRM_ABOVE = 3;

interface ToolCardProps {
  def: FeatureDef;
  selected: boolean;
  blocked: string | null;
  state: 'idle' | 'queued' | 'running' | 'done' | 'failed';
  onToggle: () => void;
  onOpen: () => void;
}

function ToolCard({ def, selected, blocked, state, onToggle, onOpen }: ToolCardProps) {
  const Icon = def.icon;
  const selectable = blocked === null;
  return (
    <div
      data-tool={def.key}
      className={`flex flex-col rounded-card border bg-paper transition-colors ${
        selected ? 'border-ochre-deep shadow-card' : 'border-hairline'
      }`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={def.name}
        disabled={!selectable}
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-t-card p-4 text-left transition-colors enabled:hover:bg-drafting disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* The tick box is the selection affordance; the icon says what the tool
            is. Collapsing them into one would make "selected" and "which tool"
            the same signal. */}
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
            selected ? 'border-ochre-deep bg-ochre-deep text-white' : 'border-mist/50 bg-paper'
          }`}
        >
          {selected ? <Check size={13} strokeWidth={2.5} /> : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <Icon size={15} strokeWidth={1.75} className="shrink-0 text-mist" />
            <span className="truncate text-label font-medium text-ink">{def.name}</span>
          </span>
          <span className="mt-1 text-caption text-mist">{def.blurb}</span>
          {blocked ? <span className="mt-2 text-caption text-graphite">{blocked}</span> : null}
        </span>
        <span className="shrink-0">
          {state === 'running' ? (
            <Spinner size={14} />
          ) : state === 'done' ? (
            <Check size={14} strokeWidth={2} className="text-success" />
          ) : state === 'failed' ? (
            <CircleAlert size={14} strokeWidth={2} className="text-warning" />
          ) : state === 'queued' ? (
            <span className="mono-meta text-mist">queued</span>
          ) : null}
        </span>
      </button>
      <button
        type="button"
        data-open-tool={def.key}
        onClick={onOpen}
        className="flex items-center justify-between gap-2 border-t border-hairline px-4 py-2.5 text-left text-caption text-graphite transition-colors hover:bg-drafting hover:text-ink"
      >
        <span>Open{blocked ? ' to set it up' : ' for full settings'}</span>
        <ChevronRight size={14} strokeWidth={1.75} className="shrink-0 text-mist" />
      </button>
    </div>
  );
}

export function CategoryScreen({ category }: { category: CategoryKey }) {
  const def = categoryDef(category);
  const setTab = useProjectStore((s) => s.setTab);
  const engineReady = useProjectStore((s) => s.engineReady);
  const generation = useProjectStore((s) => s.generation);

  const [selected, setSelected] = useState<FeatureKind[]>([]);
  // "Select all" always confirms, even at two tools — a click that queues every
  // tool in a category should never be the same gesture as ticking one box.
  const [selectedAll, setSelectedAll] = useState(false);
  const [input, setInput] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const batch = useBatch();
  const confirmRef = useDialog<HTMLDivElement>({ open: confirming, onClose: () => setConfirming(false) });

  const index = useMemo(() => {
    const i = CATEGORIES.findIndex((c) => c.key === category);
    return String(i + 1).padStart(2, '0');
  }, [category]);

  if (!def) {
    return (
      <EmptyState
        icon={CircleAlert}
        title="No tools here yet"
        description="This part of the app has not been built out. Pick another category from the sidebar."
      />
    );
  }

  const blockedFor = (key: FeatureKind) => batchBlockedReason(key, generation[key].settings);
  const runnable = selected.filter((k) => blockedFor(k) === null);
  const needsConfirm = selectedAll || runnable.length > CONFIRM_ABOVE;

  const toggle = (key: FeatureKind) => {
    setSelectedAll(false);
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const selectAll = () => {
    const all = def.features.map((f) => f.key).filter((k) => blockedFor(k) === null);
    setSelected(all);
    setSelectedAll(true);
  };

  const clear = () => {
    setSelected([]);
    setSelectedAll(false);
  };

  const launch = () => {
    if (!input || runnable.length === 0) return;
    setConfirming(false);
    batch.reset();
    batch.start(runnable, input);
  };

  const onSynthesize = () => (needsConfirm ? setConfirming(true) : launch());

  const stateFor = (key: FeatureKind): ToolCardProps['state'] => {
    if (batch.current === key) return 'running';
    if (batch.failed.includes(key)) return 'failed';
    if (batch.done.includes(key)) return 'done';
    if (batch.pending.includes(key)) return 'queued';
    return 'idle';
  };

  const blockedMessage =
    !input ? 'Drop an image to run these tools on.' : runnable.length === 0 ? 'Pick at least one tool.' : null;

  return (
    <div>
      <SectionHeader
        index={index}
        eyebrow={`${def.features.length} tool${def.features.length === 1 ? '' : 's'}`}
        title={def.label}
        description={def.blurb}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* The rail. */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-heading">Tools</p>
              <p className="mt-1 text-caption text-mist">
                Tick as many as you want — they all run on the same image, each with its own saved settings.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll} disabled={batch.running}>
                Select all
              </Button>
              {selected.length > 0 ? (
                <Button variant="ghost" size="sm" onClick={clear} disabled={batch.running}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {def.features.map((f) => (
              <ToolCard
                key={f.key}
                def={f}
                selected={selected.includes(f.key)}
                blocked={blockedFor(f.key)}
                state={stateFor(f.key)}
                onToggle={() => toggle(f.key)}
                onOpen={() => setTab(f.key)}
              />
            ))}
          </div>
        </div>

        {/* The run panel. */}
        <aside className="flex h-fit flex-col rounded-card border border-hairline bg-paper shadow-card lg:sticky lg:top-6">
          <fieldset
            disabled={batch.running}
            className={`flex flex-col gap-3 p-5 transition-opacity ${batch.running ? 'opacity-60' : ''}`}
          >
            <div>
              <p className="section-heading">Input</p>
              <p className="mt-1 text-caption text-mist">One image, shared by every tool you tick</p>
            </div>
            <ImageDropzone value={input} onImage={setInput} onClear={() => setInput(null)} />
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-hairline p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                icon={<Sparkles size={16} strokeWidth={1.75} />}
                onClick={onSynthesize}
                loading={batch.running}
                disabled={!input || runnable.length === 0 || batch.running}
              >
                {batch.running
                  ? 'Synthesizing…'
                  : runnable.length > CONFIRM_ABOVE
                    ? `Synthesize ${runnable.length} images`
                    : 'Synthesize'}
              </Button>
              {batch.running ? (
                <Button variant="secondary" size="sm" icon={<X size={14} strokeWidth={1.75} />} onClick={batch.cancel}>
                  Cancel
                </Button>
              ) : null}
            </div>
            {blockedMessage ? <p className="text-body text-mist">{blockedMessage}</p> : null}
            {!engineReady ? <Notice tone="warning" message="Add your Gemini key in Settings to generate." /> : null}
            {batch.running ? (
              <p className="text-caption text-mist">
                Running one at a time. {batch.done.length + batch.failed.length} of{' '}
                {batch.done.length + batch.failed.length + batch.pending.length + (batch.current ? 1 : 0)} finished —
                cancelling keeps what is already generated.
              </p>
            ) : batch.done.length + batch.failed.length > 0 ? (
              <p className="text-caption text-mist">
                {batch.done.length} generated{batch.failed.length > 0 ? `, ${batch.failed.length} failed` : ''}. Open a
                tool to see its output, or check the Gallery.
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirming(false)} aria-hidden="true" />
          <div
            ref={confirmRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-batch-title"
            tabIndex={-1}
            className="card relative w-96 max-w-full p-5 shadow-card-lg"
          >
            <h3 id="confirm-batch-title" className="font-display text-title text-ink">
              Generate {runnable.length} images?
            </h3>
            <p className="mt-2 text-body text-graphite">
              Each tool is a separate paid generation on your own API key. They run one at a time and you can stop
              partway.
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {runnable.map((k) => (
                <li key={k} className="pill border border-hairline bg-drafting px-2.5 py-1 text-caption text-graphite">
                  {def.features.find((f) => f.key === k)?.name}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-3">
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={launch}>
                Generate {runnable.length}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
