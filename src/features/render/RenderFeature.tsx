import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { ImageCompare } from '../../components/Output/ImageCompare';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Select } from '../../components/ui/Select';
import { useGenerate, usePresentationAdder } from '../hooks';

const STYLE_OPTIONS = [
  { value: 'photoreal', label: 'Photoreal' },
  { value: 'clay', label: 'Clay model' },
  { value: 'line', label: 'Line drawing' },
  { value: 'watercolour', label: 'Watercolour' },
];

const VARIATION_OPTIONS = [
  { value: '1', label: '1 variation' },
  { value: '2', label: '2 variations' },
  { value: '4', label: '4 variations' },
];

export function RenderFeature() {
  const [input, setInput] = useState<string | null>(null);
  const [style, setStyle] = useState('photoreal');
  const [variations, setVariations] = useState('2');
  const [prompt, setPrompt] = useState('');

  const { status, error, outputs, inputUsed, run } = useGenerate();
  const { addToPresentation, addedIds } = usePresentationAdder();

  const loading = status === 'loading';

  const handleGenerate = () => {
    if (!input) return;
    void run({
      feature: 'render',
      inputImage: input,
      prompt: prompt.trim() || undefined,
      options: { style, variations: Number(variations) },
    });
  };

  return (
    <div>
      <SectionHeader
        index="01"
        eyebrow="Sketch to Render"
        title="Sketch / Plan → Render"
        description="Turn a hand sketch or floor plan into a styled architectural render. Upload directly — no prior step required."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Input & controls */}
        <div className="flex flex-col gap-6">
          <div>
            <p className="mono-meta mb-3">Input</p>
            <ImageDropzone value={input} onImage={setInput} onClear={() => setInput(null)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Style" value={style} options={STYLE_OPTIONS} onChange={setStyle} />
            <Select label="Variations" value={variations} options={VARIATION_OPTIONS} onChange={setVariations} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="render-prompt" className="mono-meta">
              Prompt (optional)
            </label>
            <textarea
              id="render-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. warm evening light, brushed concrete, planted terrace"
              className="resize-none border border-hairline bg-paper px-3 py-2.5 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="primary"
              icon={<Sparkles size={16} strokeWidth={1.75} />}
              onClick={handleGenerate}
              loading={loading}
              disabled={!input}
            >
              {loading ? 'Generating…' : 'Generate'}
            </Button>
            {!input ? <span className="text-xs text-mist">Upload an image to begin.</span> : null}
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-4">
          <p className="mono-meta">Output</p>
          {error ? <ErrorBanner message={error} onRetry={handleGenerate} /> : null}
          {loading || outputs.length > 0 ? (
            <OutputGrid
              outputs={outputs}
              loading={loading}
              loadingCount={Number(variations)}
              onAddToPresentation={addToPresentation}
              addedIds={addedIds}
            />
          ) : !error ? (
            <div className="flex flex-1 items-center justify-center border border-dashed border-hairline bg-paper px-6 py-16 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-mist">
                Your renders will appear here. Pick a style and press Generate.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Before / after — the signature fidelity moment (spec §8.01). */}
      {inputUsed && outputs.length > 0 ? (
        <div className="mt-10">
          <p className="mono-meta mb-3">Fidelity · Before / After</p>
          <ImageCompare before={inputUsed} after={outputs[0].url} beforeLabel="Sketch" afterLabel="Render" />
        </div>
      ) : null}
    </div>
  );
}
