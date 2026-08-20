import { Check, Images, Sparkles, Wand2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cancelDeck, runDeck } from '../../features/presentation/deckRunner';
import type { DeckDensity, DeckImage, DeckLength, DeckOptions, DeckPurpose } from '../../lib/slidesDeck';
import { SKILL_ATTRIBUTION } from '../../lib/skill/frontendSlides';
import { poolFromProject, useProjectStore } from '../../store/useProjectStore';
import { Button } from '../ui/Button';
import { ChipGroup } from '../ui/ChipGroup';
import type { ChipOption } from '../ui/ChipGroup';
import { EmptyState } from '../ui/EmptyState';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Notice } from '../ui/Notice';
import { Spinner } from '../ui/Spinner';
import { DeckPreview } from './DeckPreview';

// The shared ChipGroup takes {value,label} options; these labels ARE the values
// the composer prompt expects, so value and label stay identical.
const asOptions = <T extends string>(values: readonly T[]): ChipOption<T>[] =>
  values.map((value) => ({ value, label: value }));

const PURPOSES: ChipOption<DeckPurpose>[] = asOptions<DeckPurpose>([
  'Pitch deck',
  'Teaching / tutorial',
  'Conference talk',
  'Internal presentation',
]);
const LENGTHS: ChipOption<DeckLength>[] = asOptions<DeckLength>([
  'Short (5–10 slides)',
  'Medium (10–20 slides)',
  'Long (20+ slides)',
]);
const DENSITIES: ChipOption<DeckDensity>[] = asOptions<DeckDensity>([
  'Low density / speaker-led',
  'High density / reading-first',
]);

function Warnings({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {items.map((w, i) => (
        <Notice key={i} tone="warning" message={w} />
      ))}
    </div>
  );
}

export function DeckGenerator() {
  const project = useProjectStore((s) => s.project);
  const brand = project.brand;
  const claudeApiKey = useProjectStore((s) => s.claudeApiKey);
  const deckHtml = useProjectStore((s) => s.deckHtml);
  const deckStatus = useProjectStore((s) => s.deckStatus);
  const deckProgress = useProjectStore((s) => s.deckProgress);
  const deckError = useProjectStore((s) => s.deckError);
  const deckWarnings = useProjectStore((s) => s.deckWarnings);
  const patchDeck = useProjectStore((s) => s.patchDeck);
  const setTab = useProjectStore((s) => s.setTab);

  const pool = useMemo(() => poolFromProject(project), [project]);
  const groups = useMemo(() => {
    const seen: string[] = [];
    for (const p of pool) if (!seen.includes(p.group)) seen.push(p.group);
    return seen;
  }, [pool]);

  const [purpose, setPurpose] = useState<DeckPurpose>('Pitch deck');
  const [length, setLength] = useState<DeckLength>('Medium (10–20 slides)');
  const [density, setDensity] = useState<DeckDensity>('Low density / speaker-led');
  const [notes, setNotes] = useState('');
  // Which pooled images to feed Claude. Tracked as an EXCLUDE set so newly
  // generated images are included by default (the previous behaviour was "all").
  const [deselected, setDeselected] = useState<Set<string>>(new Set());

  const selectedPool = pool.filter((p) => !deselected.has(p.image.id));
  const selectedCount = selectedPool.length;
  const toggleImage = (id: string) =>
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAll = () => setDeselected(new Set());
  const clearAll = () => setDeselected(new Set(pool.map((p) => p.image.id)));

  const generating = deckStatus === 'loading';
  const canGenerate = Boolean(claudeApiKey) && !generating;

  const runGenerate = () => {
    if (!claudeApiKey) return;
    const images: DeckImage[] = selectedPool.map((p) => ({
      id: p.image.id,
      group: p.group,
      label: p.image.label,
      url: p.image.url,
    }));
    const options: DeckOptions = { purpose, length, density, notes };
    void runDeck({ projectName: project.name, brand, images, options });
  };

  const clear = () => patchDeck({ deckHtml: null, deckStatus: 'idle', deckError: null, deckWarnings: [] });

  // Once a deck exists, show it with the post-generation actions.
  if (deckHtml) {
    return (
      <div className="flex flex-col gap-4">
        <DeckPreview
          html={deckHtml}
          projectName={project.name}
          onRegenerate={runGenerate}
          onClear={clear}
          regenerating={generating}
        />
        <Warnings items={deckWarnings} />
        {deckError ? <ErrorBanner message={deckError} onRetry={runGenerate} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-card border border-hairline bg-paper p-5 shadow-card">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-drafting">
            <Wand2 size={18} strokeWidth={1.75} className="text-mist" />
          </span>
          <div>
            <h3 className="font-display text-title text-ink">Generate a presentation</h3>
            <p className="mt-1 text-body text-graphite">
              Claude builds a distinctive, self-contained HTML deck from your brand and the images you pick below — a
              fixed 16:9 stage with real motion.
            </p>
          </div>
        </div>

        {/* Image picker — choose which generated images Claude builds the deck from. */}
        {pool.length > 0 ? (
          <div className="mb-6 flex flex-col gap-4 border-t border-hairline pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="section-heading">Images for the deck</span>
                <span className="mono-meta text-mist">
                  {selectedCount} of {pool.length} selected
                </span>
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear
                </Button>
              </div>
            </div>
            {groups.map((group) => (
              <div key={group} className="flex flex-col gap-2">
                <p className="mono-meta">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {pool
                    .filter((p) => p.group === group)
                    .map((ref) => {
                      const isSel = !deselected.has(ref.image.id);
                      return (
                        <button
                          key={ref.image.id}
                          type="button"
                          onClick={() => toggleImage(ref.image.id)}
                          aria-pressed={isSel}
                          title={ref.image.label}
                          className={`relative h-16 w-24 overflow-hidden rounded-control border transition-all active:scale-[0.98] ${
                            isSel
                              ? 'border-ochre ring-1 ring-ochre/20'
                              : 'border-hairline hover:border-mist/40'
                          }`}
                        >
                          <img
                            src={ref.image.url}
                            alt={ref.image.label}
                            // Unselected reads as "not picked", not "broken": a
                            // light scrim + full-opacity image instead of a 45%
                            // wash over the whole tile.
                            className="h-full w-full object-cover"
                          />
                          {!isSel ? <span aria-hidden="true" className="absolute inset-0 bg-bone/55" /> : null}
                          {isSel ? (
                            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-control bg-ochre-deep text-white">
                              <Check size={11} strokeWidth={2} />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
            {selectedCount === 0 ? (
              <p className="text-caption text-warning">
                No images selected — the deck will be built from your brand only.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mb-6 border-t border-hairline pt-5">
            <EmptyState
              icon={Images}
              title="No images yet"
              description="Create some on the Isometric, Elevation, or Axonometric tabs (or upload them in the Manual storyboard) and they’ll appear here to include in the deck."
              action={
                <Button variant="primary" onClick={() => setTab('render')}>
                  Generate images
                </Button>
              }
            />
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <ChipGroup label="Purpose" value={purpose} options={PURPOSES} onChange={setPurpose} />
          <ChipGroup label="Length" value={length} options={LENGTHS} onChange={setLength} />
        </div>
        <div className="mt-5">
          <ChipGroup label="Density" value={density} options={DENSITIES} onChange={setDensity} />
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <label htmlFor="deck-notes" className="mono-meta">
            Talking points <span className="text-mist">(optional)</span>
          </label>
          <textarea
            id="deck-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything specific to include — project story, site context, key moves. Leave blank to let Claude narrate from your images."
            className="resize-none rounded-field border border-hairline bg-paper px-3.5 py-2 text-body text-graphite placeholder:text-mist"
          />
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={<Sparkles size={16} strokeWidth={1.75} />}
              onClick={runGenerate}
              disabled={!canGenerate}
              loading={generating}
            >
              {generating ? 'Generating…' : 'Generate presentation'}
            </Button>
            {generating ? (
              <Button variant="secondary" size="sm" icon={<X size={14} strokeWidth={1.75} />} onClick={cancelDeck}>
                Cancel
              </Button>
            ) : null}
          </div>
          {!claudeApiKey ? (
            <p className="text-caption text-warning">Add a Claude API key in Settings to enable generation.</p>
          ) : null}
          <p className="text-caption text-mist">
            Built with the open-source{' '}
            <a
              href={SKILL_ATTRIBUTION.url}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-hairline underline-offset-2 hover:text-ochre-deep"
            >
              {SKILL_ATTRIBUTION.name}
            </a>{' '}
            skill by {SKILL_ATTRIBUTION.author}.
          </p>
        </div>
      </div>

      {generating ? (
        <div className="flex flex-col gap-2.5 rounded-field border border-hairline bg-drafting px-4 py-3.5">
          <div className="flex items-center gap-3 text-body text-graphite">
            <Spinner size={16} />
            {/* Character counts are developer telemetry — report the phase instead. */}
            <span>
              {deckProgress > 0 ? 'Designing your deck… writing the slides' : 'Designing your deck… planning the structure'}
            </span>
          </div>
          <span aria-hidden="true" className="relative block h-0.5 overflow-hidden rounded-full bg-hairline">
            <span className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-ochre" />
          </span>
        </div>
      ) : null}

      <Warnings items={deckWarnings} />
      {deckError ? <ErrorBanner message={deckError} onRetry={runGenerate} /> : null}
    </div>
  );
}
