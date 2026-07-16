import { Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DeckDensity, DeckImage, DeckLength, DeckOptions, DeckPurpose } from '../../lib/slidesDeck';
import { generateSlideDeck } from '../../lib/slidesDeck';
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

export function DeckGenerator() {
  const project = useProjectStore((s) => s.project);
  const brand = project.brand;
  const claudeApiKey = useProjectStore((s) => s.claudeApiKey);
  const deckHtml = useProjectStore((s) => s.deckHtml);
  const setDeckHtml = useProjectStore((s) => s.setDeckHtml);

  const pool = useMemo(() => poolFromProject(project), [project]);

  const [purpose, setPurpose] = useState<DeckPurpose>('Pitch deck');
  const [length, setLength] = useState<DeckLength>('Medium (10–20 slides)');
  const [density, setDensity] = useState<DeckDensity>('Low density / speaker-led');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = Boolean(claudeApiKey) && !generating;

  const runGenerate = async () => {
    if (!claudeApiKey) return;
    setError(null);
    setGenerating(true);
    setProgress(0);
    try {
      const images: DeckImage[] = pool.map((p) => ({
        id: p.image.id,
        group: p.group,
        label: p.image.label,
        url: p.image.url,
      }));
      const options: DeckOptions = { purpose, length, density, notes };
      const html = await generateSlideDeck({ projectName: project.name, brand, images, options, onProgress: setProgress });
      setDeckHtml(html);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The deck generator failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Once a deck exists, show it with the post-generation actions.
  if (deckHtml) {
    return (
      <div className="flex flex-col gap-4">
        <DeckPreview
          html={deckHtml}
          projectName={project.name}
          onRegenerate={() => void runGenerate()}
          onClear={() => setDeckHtml(null)}
          regenerating={generating}
        />
        {error ? <ErrorBanner message={error} onRetry={() => void runGenerate()} /> : null}
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
              Claude builds a distinctive, self-contained HTML deck from your brand and images — a fixed 16:9 stage
              with real motion. {pool.length} image{pool.length === 1 ? '' : 's'} available.
            </p>
          </div>
        </div>

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
          <Button
            variant="primary"
            icon={<Sparkles size={16} strokeWidth={1.75} />}
            onClick={() => void runGenerate()}
            disabled={!canGenerate}
            loading={generating}
          >
            {generating ? 'Generating…' : 'Generate presentation'}
          </Button>
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
            Designing your deck… {progress > 0 ? `${progress.toLocaleString()} characters` : 'thinking through the structure'}
          </span>
        </div>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={() => void runGenerate()} /> : null}
    </div>
  );
}
