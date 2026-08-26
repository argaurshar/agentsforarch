import { ArrowRight, ChevronDown, Sparkles, Wand2 } from 'lucide-react';
import { useState } from 'react';
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
              className="aspect-[4/3] w-full rounded-control border border-hairline bg-drafting object-cover"
            />
          </div>
          <ArrowRight size={18} strokeWidth={1.75} className="shrink-0 text-ochre" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-caption text-mist">{example.outputLabel ?? 'Output'}</span>
            <img
              src={example.output}
              alt={example.outputLabel ?? 'Example output'}
              loading="lazy"
              className="aspect-[4/3] w-full rounded-control border border-hairline bg-drafting object-cover"
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

/**
 * "What does this tab do?" — real input → output pairs this app produced on
 * Nano Banana Pro, shipped as static assets. Costs no API call to look at, and
 * offers a one-click load of the same input so the first real run needs no
 * upload.
 */
export function ExampleShowcase({ feature, defaultOpen = false }: ExampleShowcaseProps) {
  const set = EXAMPLES[feature];
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);

  if (!set) return null;

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
            <p className="mt-1 max-w-2xl text-body leading-relaxed text-graphite">{set.summary}</p>
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
            {open ? 'Hide examples' : `Show ${set.cases.length} examples`}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="grid gap-4 border-t border-hairline p-5 sm:grid-cols-2">
          {set.cases.map((example) => (
            <CasePanel key={example.label} example={example} />
          ))}
          <p className="text-caption leading-relaxed text-mist sm:col-span-2">
            Real runs from this app on Nano&nbsp;Banana&nbsp;Pro — shown from bundled images, so browsing them costs
            nothing. Your own results will differ with your inputs and settings.
          </p>
        </div>
      ) : null}
    </section>
  );
}
