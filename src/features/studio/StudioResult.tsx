import { ChevronLeft, Download, Settings2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { Notice } from '../../components/ui/Notice';
import { Spinner } from '../../components/ui/Spinner';
import { ImageCompare } from '../../components/Output/ImageCompare';
import { downloadDataURL, slugify } from '../../lib/images';
import { INPUT_KIND_LABEL } from '../registry/keys';
import type { InputKind } from '../registry/keys';
import { buildFeatureRequest, featureDef, toolsForKind } from '../registry';
import { useGenerate } from '../hooks';
import type { FeatureKind } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { KeyGate } from './KeyGate';

interface StudioResultProps {
  feature: FeatureKind;
  input: string;
  kind: InputKind;
  /** Back to the cards. */
  onBack: () => void;
  /** Chain: run another transformation on this result. */
  onChain: (feature: FeatureKind, image: string) => void;
}

/**
 * The result is the hero, and it points onward.
 *
 * This runs the REAL tool — `buildFeatureRequest` plus `useGenerate`, the same
 * two calls the tool screen makes — so the output lands in `generation[feature]`
 * and opening Advanced shows the same image rather than a second copy.
 *
 * The run fires on mount, and again the moment a key arrives, so pasting a key
 * costs no extra tap. `fired` guards against the double-invoke React does in
 * development, which would otherwise spend the user's money twice.
 */
export function StudioResult({ feature, input, kind, onBack, onChain }: StudioResultProps) {
  const def = featureDef(feature);
  const settings = useProjectStore((s) => s.generation[feature].settings);
  const prompt = useProjectStore((s) => s.generation[feature].prompt);
  const setTab = useProjectStore((s) => s.setTab);
  const { status, error, warning, outputs, inputUsed, engineReady, run, cancel } = useGenerate(feature);
  const fired = useRef(false);

  const start = () => {
    fired.current = true;
    void run(
      buildFeatureRequest(feature, settings, {
        inputImages: [input],
        prompt,
        ctx: { refine: false },
      }),
    );
  };

  useEffect(() => {
    if (fired.current || !engineReady) return;
    start();
    // Deliberately not reactive to settings or prompt: this fires once per
    // mount. Changing settings is the Tweak sheet's job (P4), which will
    // re-run explicitly rather than on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady]);

  const loading = status === 'loading';
  const result = outputs[0] ?? null;
  const before = inputUsed ?? input;
  const warn = def.accuracyWarning?.(settings);

  // What this result can become next. Its own tool is excluded — "make it 3D"
  // again from the 3D is not a next step — and so are the tools that need a
  // second image, which cannot run from a chain tap.
  const chain = toolsForKind(kind).filter((f) => f.key !== feature && f.inputMode === 'image');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} strokeWidth={1.75} />} onClick={onBack}>
          Something else
        </Button>
        <p className="text-caption text-mist">
          {def.verb} · from a {INPUT_KIND_LABEL[kind].toLowerCase()}
        </p>
      </div>

      {!engineReady ? (
        <KeyGate verb={def.verb} onReady={start} />
      ) : loading ? (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-card border border-hairline bg-paper px-6 py-20"
          data-studio-running
        >
          <Spinner size={26} className="text-ochre" />
          <p className="text-title text-ink">{def.verb}…</p>
          <p className="max-w-sm text-center text-body text-mist">
            Usually ten to thirty seconds. You can cancel — nothing is charged for a cancelled run that has not
            returned.
          </p>
          <Button variant="secondary" size="sm" onClick={cancel}>
            Cancel
          </Button>
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={start} />
      ) : result ? (
        <div className="flex flex-col gap-5" data-studio-result>
          {/* The result is the hero here, not a footnote under a control panel — so
              it gets a taller cap than the tool screen's 340. */}
          <ImageCompare before={before} after={result.url} beforeLabel="Yours" afterLabel={result.label} maxHeight={560} />

          {warning ? <Notice tone="warning" message={warning} /> : null}
          {warn ? <Notice tone="warning" message={warn} /> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              icon={<Download size={16} strokeWidth={1.75} />}
              onClick={() => downloadDataURL(result.url, `${slugify(def.name)}-${slugify(result.label)}.png`)}
            >
              Download
            </Button>
            <Button variant="secondary" onClick={start}>
              Try again
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Settings2 size={14} strokeWidth={1.75} />}
              onClick={() => setTab(feature)}
            >
              Full controls
            </Button>
          </div>

          {chain.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-hairline pt-5">
              <p className="section-heading">Now make it…</p>
              <div className="flex flex-wrap gap-2">
                {chain.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    data-chain={f.key}
                    onClick={() => onChain(f.key, result.url)}
                    className="pill border border-hairline bg-paper px-3 py-1.5 text-caption text-graphite transition-colors hover:border-ochre/60 hover:bg-drafting"
                  >
                    {f.verb}
                  </button>
                ))}
              </div>
              <p className="text-caption text-mist">
                Each one is a fresh generation on this result, and this one stays in the Gallery.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-card border border-hairline bg-paper px-6 py-16">
          <p className="text-body text-mist">Nothing came back. That is usually a transient engine error.</p>
          <Button variant="primary" onClick={start}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
