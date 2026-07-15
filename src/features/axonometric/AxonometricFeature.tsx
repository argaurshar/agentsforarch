import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useGenerate, usePresentationAdder } from '../hooks';

const VIEWPOINTS = ['NE', 'NW', 'SE', 'SW'] as const;
type Viewpoint = (typeof VIEWPOINTS)[number];

export function AxonometricFeature() {
  const [input, setInput] = useState<string | null>(null);
  const [selected, setSelected] = useState<Viewpoint[]>(['NE']);
  const [section, setSection] = useState(false);
  const [prompt, setPrompt] = useState('');

  const { status, error, outputs, run } = useGenerate();
  const { addToPresentation, addedIds } = usePresentationAdder();

  const loading = status === 'loading';

  const toggleViewpoint = (vp: Viewpoint) => {
    setSelected((prev) => (prev.includes(vp) ? prev.filter((v) => v !== vp) : [...prev, vp]));
  };

  // Preserve the NE,NW,SE,SW ordering regardless of click order.
  const orderedSelection = VIEWPOINTS.filter((vp) => selected.includes(vp));
  const canGenerate = input !== null && orderedSelection.length > 0;

  const handleGenerate = () => {
    if (!canGenerate || !input) return;
    void run({
      feature: 'axonometric',
      inputImage: input,
      prompt: prompt.trim() || undefined,
      options: {
        viewpoints: orderedSelection,
        style: section ? 'section' : 'standard',
      },
    });
  };

  return (
    <div>
      <SectionHeader
        index="03"
        eyebrow="Elevation to Axonometric"
        title="Elevation → Axonometric"
        description="Generate axonometric and section-axonometric views from an elevation. Upload an elevation directly — running feature 02 first is never required."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <p className="mono-meta mb-3">Input</p>
            <ImageDropzone value={input} onImage={setInput} onClear={() => setInput(null)} />
          </div>

          {/* Viewpoints — multi-select (spec §8.03). */}
          <div className="flex flex-col gap-2">
            <span className="mono-meta">Viewpoints</span>
            <div className="grid grid-cols-4 gap-2">
              {VIEWPOINTS.map((vp) => {
                const active = selected.includes(vp);
                return (
                  <button
                    key={vp}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleViewpoint(vp)}
                    className={`border py-2.5 text-sm font-medium transition-colors focus-visible:outline-ochre ${
                      active
                        ? 'border-ochre bg-ochre text-bone'
                        : 'border-hairline bg-paper text-graphite hover:bg-drafting'
                    }`}
                  >
                    {vp}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-mist">
              One view is generated per selected viewpoint ({orderedSelection.length || 'none'} selected).
            </p>
          </div>

          {/* Section axonometric toggle. */}
          <div className="flex items-center justify-between border border-hairline bg-paper px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Section axonometric</p>
              <p className="text-xs text-mist">Adds a cut plane and labels views “— section”.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={section}
              onClick={() => setSection((s) => !s)}
              className={`relative h-6 w-11 border transition-colors focus-visible:outline-ochre ${
                section ? 'border-ochre bg-ochre' : 'border-hairline bg-drafting'
              }`}
            >
              <span
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 bg-bone transition-all ${
                  section ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="axon-prompt" className="mono-meta">
              Prompt (optional)
            </label>
            <textarea
              id="axon-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="e.g. exploded roof, show structural grid"
              className="resize-none border border-hairline bg-paper px-3 py-2.5 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="primary"
              icon={<Sparkles size={16} strokeWidth={1.75} />}
              onClick={handleGenerate}
              loading={loading}
              disabled={!canGenerate}
            >
              {loading ? 'Generating…' : 'Generate'}
            </Button>
            {!input ? (
              <span className="text-xs text-mist">Upload an elevation to begin.</span>
            ) : orderedSelection.length === 0 ? (
              <span className="text-xs text-mist">Select at least one viewpoint.</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="mono-meta">Output</p>
          {error ? <ErrorBanner message={error} onRetry={handleGenerate} /> : null}
          {loading || outputs.length > 0 ? (
            <OutputGrid
              outputs={outputs}
              loading={loading}
              loadingCount={orderedSelection.length}
              onAddToPresentation={addToPresentation}
              addedIds={addedIds}
            />
          ) : !error ? (
            <div className="flex flex-1 items-center justify-center border border-dashed border-hairline bg-paper px-6 py-16 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-mist">
                Axonometric views will appear here, one per viewpoint.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
