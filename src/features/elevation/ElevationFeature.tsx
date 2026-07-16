import { RotateCcw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Select } from '../../components/ui/Select';
import { elevationPrompt } from '../../lib/prompts';
import { useGenerate, usePresentationAdder } from '../hooks';

const TYPE_OPTIONS = [
  { value: 'Front', label: 'Front' },
  { value: 'Side', label: 'Side' },
  { value: 'Rear', label: 'Rear' },
];

const STYLE_OPTIONS = [
  { value: 'line', label: 'Line' },
  { value: 'rendered', label: 'Rendered' },
  { value: 'shaded', label: 'Shaded' },
];

export function ElevationFeature() {
  const [input, setInput] = useState<string | null>(null);
  const [elevationType, setElevationType] = useState('Front');
  const [style, setStyle] = useState('rendered');

  const suggestedPrompt = useMemo(() => elevationPrompt(elevationType, style), [elevationType, style]);
  const [prompt, setPrompt] = useState(suggestedPrompt);
  const [promptEdited, setPromptEdited] = useState(false);
  useEffect(() => {
    if (!promptEdited) setPrompt(suggestedPrompt);
  }, [suggestedPrompt, promptEdited]);

  const { status, error, outputs, engineReady, run } = useGenerate();
  const { addToPresentation, addedIds } = usePresentationAdder();

  const loading = status === 'loading';

  const handleGenerate = () => {
    if (!input) return;
    void run({
      feature: 'elevation',
      inputImage: input,
      prompt: prompt.trim() || undefined,
      // The elevation face rides in `viewpoints` so the output label reflects it.
      options: { style, viewpoints: [elevationType] },
    });
  };

  return (
    <div>
      <SectionHeader
        index="02"
        eyebrow="Sketch to Elevation"
        title="Sketch / Model → Elevation"
        description="Produce an elevation design render from a sketch or SketchUp model. Works standalone — upload whatever you have."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div>
            <p className="mono-meta mb-3">Input</p>
            <ImageDropzone
              value={input}
              onImage={setInput}
              onClear={() => setInput(null)}
              hint="Input can be a hand sketch or a SketchUp model screenshot."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Elevation type" value={elevationType} options={TYPE_OPTIONS} onChange={setElevationType} />
            <Select label="Style" value={style} options={STYLE_OPTIONS} onChange={setStyle} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="elevation-prompt" className="mono-meta">
                Prompt · auto-generated
              </label>
              {promptEdited ? (
                <button
                  type="button"
                  onClick={() => {
                    setPrompt(suggestedPrompt);
                    setPromptEdited(false);
                  }}
                  className="flex items-center gap-1 text-[0.7rem] text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
                >
                  <RotateCcw size={12} strokeWidth={1.75} /> Reset
                </button>
              ) : null}
            </div>
            <textarea
              id="elevation-prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setPromptEdited(true);
              }}
              rows={4}
              className="resize-none border border-hairline bg-paper px-3 py-2.5 text-sm leading-relaxed text-graphite placeholder:text-mist focus-visible:outline-ochre"
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
            {!input ? (
              <span className="text-xs text-mist">Upload an image to begin.</span>
            ) : !engineReady ? (
              <span className="text-xs text-ochre">Add your Gemini key in Settings to generate.</span>
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
              loadingCount={1}
              onAddToPresentation={addToPresentation}
              addedIds={addedIds}
            />
          ) : !error ? (
            <div className="flex flex-1 items-center justify-center border border-dashed border-hairline bg-paper px-6 py-16 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-mist">
                Your elevation will appear here. Choose a face and style, then Generate.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
