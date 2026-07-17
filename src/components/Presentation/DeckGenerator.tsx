import { Check, Sparkles, Wand2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cancelDeck, runDeck } from '../../features/presentation/deckRunner';
import type { DeckDensity, DeckImage, DeckLength, DeckOptions, DeckPurpose } from '../../lib/slidesDeck';
import { SKILL_ATTRIBUTION } from '../../lib/skill/frontendSlides';
import { poolFromProject, useProjectStore } from '../../store/useProjectStore';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Spinner } from '../ui/Spinner';
import { DeckPreview } from './DeckPreview';

const PURPOSES: DeckPurpose[] = ['Pitch deck', 'Teaching / tutorial', 'Conference talk', 'Internal presentation'];
const LENGTHS: DeckLength[] = ['Short (5–10 slides)', 'Medium (10–20 slides)', 'Long (20+ slides)'];
const DENSITIES: DeckDensity[] = ['Low density / speaker-led', 'High density / reading-first'];

interface ChipGroupProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}

function ChipGroup<T extends string>({ label, value, options, onChange }: ChipGroupProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="mono-meta">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt)}
              className={`border px-3 py-1.5 text-xs transition-colors focus-visible:outline-ochre ${
                active ? 'border-ochre bg-ochre text-bone' : 'border-hairline bg-paper text-graphite hover:bg-drafting'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Warnings({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border border-hairline bg-drafting px-3 py-2 text-xs leading-relaxed text-graphite">
      {items.map((w, i) => (
        <p key={i}>{w}</p>
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
      <div className="border border-hairline bg-paper p-5">
        <div className="mb-5 flex items-start gap-3">
          <Wand2 size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ochre" />
          <div>
            <h3 className="text-lg font-light text-ink">Generate a presentation</h3>
            <p className="mt-1 text-sm text-graphite">
              Claude builds a distinctive, self-contained HTML deck from your brand and the images you pick below — a
              fixed 16:9 stage with real motion.
            </p>
          </div>
        </div>

        {/* Image picker — choose which generated images Claude builds the deck from. */}
        {pool.length > 0 ? (
          <div className="mb-6 flex flex-col gap-3 border-t border-hairline pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="mono-meta">
                Images for the deck · {selectedCount} of {pool.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="border border-hairline bg-paper px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-graphite hover:bg-drafting focus-visible:outline-ochre"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="border border-hairline bg-paper px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-graphite hover:bg-drafting focus-visible:outline-ochre"
                >
                  Clear
                </button>
              </div>
            </div>
            {groups.map((group) => (
              <div key={group} className="flex flex-col gap-2">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-graphite">{group}</p>
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
                          className={`relative h-16 w-24 overflow-hidden border transition-all focus-visible:outline-ochre ${
                            isSel ? 'border-ochre' : 'border-hairline opacity-45 hover:opacity-75'
                          }`}
                        >
                          <img src={ref.image.url} alt={ref.image.label} className="h-full w-full object-cover" />
                          <span
                            className={`absolute right-1 top-1 flex h-4 w-4 items-center justify-center border ${
                              isSel ? 'border-ochre bg-ochre text-bone' : 'border-mist bg-bone/80 text-transparent'
                            }`}
                          >
                            <Check size={11} strokeWidth={2.5} />
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
            {selectedCount === 0 ? (
              <p className="text-[0.7rem] text-ochre">No images selected — the deck will be built from your brand only.</p>
            ) : null}
          </div>
        ) : (
          <div className="mb-6 border-t border-hairline pt-5">
            <p className="text-sm text-graphite">
              No generated images yet. Create some on the Isometric, Elevation, or Axonometric tabs (or upload images in
              the Manual storyboard) and they’ll appear here to include in the deck.
            </p>
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
            className="resize-none border border-hairline bg-paper px-3 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
          />
        </div>

        <div className="mt-5 flex flex-col gap-2">
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
            <p className="text-[0.7rem] text-mist">Add a Claude API key in Settings to enable generation.</p>
          ) : null}
          <p className="text-[0.7rem] text-mist">
            Built with the open-source{' '}
            <a
              href={SKILL_ATTRIBUTION.url}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-hairline underline-offset-2 hover:text-ochre"
            >
              {SKILL_ATTRIBUTION.name}
            </a>{' '}
            skill by {SKILL_ATTRIBUTION.author}.
          </p>
        </div>
      </div>

      {generating ? (
        <div className="flex items-center gap-3 border border-hairline bg-drafting px-4 py-3 text-sm text-graphite">
          <Spinner size={16} />
          <span>
            Designing your deck… {deckProgress > 0 ? `${deckProgress.toLocaleString()} characters` : 'thinking through the structure'}
          </span>
        </div>
      ) : null}

      <Warnings items={deckWarnings} />
      {deckError ? <ErrorBanner message={deckError} onRetry={runGenerate} /> : null}
    </div>
  );
}
