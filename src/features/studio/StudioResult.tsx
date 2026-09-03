import { ChevronLeft, Download, Settings2, Upload, Zap } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { Notice } from '../../components/ui/Notice';
import { Spinner } from '../../components/ui/Spinner';
import { ImageCompare } from '../../components/Output/ImageCompare';
import { downloadDataURL, slugify } from '../../lib/images';
import { INPUT_KIND_LABEL } from '../registry/keys';
import type { InputKind } from '../registry/keys';
import { buildFeatureRequest, featureDef, outputKindOf, toolsForKind } from '../registry';
import { useGenerate } from '../hooks';
import type { FeatureKind } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { KeyGate } from './KeyGate';
import { ShareBar } from './ShareBar';
import { instantFeatures, instantFor } from './instant';

/** Chips in the "now make it…" row. Beyond this it reads as a directory. */
const CHAIN_LIMIT = 8;

interface StudioResultProps {
  feature: FeatureKind;
  input: string;
  kind: InputKind;
  /** The bundled asset this input came from, when it is one. */
  source: string | null;
  /** Back to the cards. */
  onBack: () => void;
  /** Chain: run another transformation on this result. Carries the result's own
   *  kind (which is usually NOT the input's) and, when the result is a prepared
   *  one, its asset name — so the chained step can be prepared too. */
  onChain: (feature: FeatureKind, image: string, nextKind: InputKind, source: string | null) => void;
  /** Carry this result forward as the new input and show everything it can
   *  become. Distinct from `onBack`, which returns to the cards for the image
   *  that made it — the wrong list once you are looking at a result. */
  onContinue: (image: string, nextKind: InputKind, source: string | null) => void;
  /** Clear everything and go back to the drop zone. */
  onStartOver: () => void;
}

/**
 * The result is the hero, and it points onward.
 *
 * Two ways a result gets here, and the difference is stated on screen rather
 * than hidden:
 *
 *   PREPARED — the input is one of the bundled examples and this tool is the
 *              one that made the pair, so the answer already exists. No key, no
 *              call, no money. Labelled as a prepared example everywhere it
 *              appears, because a visitor who thinks their own image came back
 *              in 200ms for free has been misled, not delighted.
 *   GENERATED — everything else. Runs the REAL tool via `buildFeatureRequest`
 *              plus `useGenerate`, the same two calls the tool screen makes, so
 *              the output lands in `generation[feature]` and "Full controls"
 *              shows the same image rather than a second copy.
 *
 * The generated path fires on mount and again the moment a key arrives, so
 * pasting a key costs no extra tap. `fired` guards the double-invoke React does
 * in development, which would otherwise spend the user's money twice.
 */
export function StudioResult({ feature, input, kind, source, onBack, onChain, onContinue, onStartOver }: StudioResultProps) {
  const def = featureDef(feature);
  const settings = useProjectStore((s) => s.generation[feature].settings);
  const prompt = useProjectStore((s) => s.generation[feature].prompt);
  const setTab = useProjectStore((s) => s.setTab);
  const { status, error, warning, outputs, inputUsed, engineReady, run, cancel } = useGenerate(feature);
  const fired = useRef(false);

  const prepared = instantFor(source, feature);

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
    if (prepared || fired.current || !engineReady) return;
    start();
    // Deliberately not reactive to settings or prompt: this fires once per
    // mount. Changing settings is the Tweak sheet's job (P4), which will
    // re-run explicitly rather than on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady, prepared]);

  const loading = status === 'loading';
  const generated = outputs[0] ?? null;
  const warn = def.accuracyWarning?.(settings);

  // What this result can become next — from the kind the RESULT is, not the
  // kind that went in. A rendered elevation made from a sketch is a building,
  // and offering it the sketch tools again would be offering to redo what was
  // just done. Tools needing a second image are out (a chain tap cannot supply
  // one), and on a prepared result the prepared next steps come first so a demo
  // can keep going for free.
  const resultKind = outputKindOf(feature, kind);
  const nextSource = prepared?.outputSource ?? null;
  const nextFree = instantFeatures(nextSource);
  const chain = (resultKind ? toolsForKind(resultKind) : [])
    .filter((f) => f.key !== feature && f.inputMode === 'image')
    .sort((a, b) => Number(nextFree.has(b.key)) - Number(nextFree.has(a.key)))
    // A building render feeds sixteen tools. Sixteen chips is an index, not a
    // suggestion — and the full shortlist is one tap away under "Something
    // else" anyway. Prepared ones sorted first, so the free path survives the
    // cut.
    .slice(0, CHAIN_LIMIT);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} strokeWidth={1.75} />} onClick={onBack}>
        Something else
      </Button>
      <p className="text-caption text-mist">
        {def.verb} · from a {INPUT_KIND_LABEL[kind].toLowerCase()}
      </p>
    </div>
  );

  const chainRow = (image: string, chainSource: string | null) =>
    chain.length > 0 && resultKind ? (
      <div className="flex flex-col gap-2 border-t border-hairline pt-5">
        <p className="section-heading">Now make it…</p>
        <div className="flex flex-wrap gap-2">
          {chain.map((f) => {
            const free = nextFree.has(f.key) && chainSource !== null;
            return (
              <button
                key={f.key}
                type="button"
                data-chain={f.key}
                data-chain-instant={free ? '' : undefined}
                onClick={() => onChain(f.key, image, resultKind, chainSource)}
                className={`pill flex items-center gap-1.5 border px-3 py-1.5 text-caption transition-colors ${
                  free
                    ? 'border-ochre/50 bg-paper text-graphite hover:border-ochre hover:bg-drafting'
                    : 'border-hairline bg-paper text-graphite hover:border-ochre/60 hover:bg-drafting'
                }`}
              >
                {free ? <Zap size={11} strokeWidth={2} className="text-ochre-deep" /> : null}
                {f.verb}
              </button>
            );
          })}
        </div>
        <p className="text-caption text-mist">
          {chainSource && nextFree.size > 0
            ? 'The marked ones are prepared too. The rest are a fresh generation on this result.'
            : 'Each one is a fresh generation on this result, and this one stays in the Gallery.'}{' '}
          <button
            type="button"
            data-continue
            onClick={() => onContinue(image, resultKind, chainSource)}
            className="rounded-control text-ochre-deep underline decoration-ochre/40 underline-offset-2 transition-colors hover:decoration-ochre-deep"
          >
            See everything it can become
          </button>
          .
        </p>
      </div>
    ) : null;

  // --- Prepared -------------------------------------------------------------
  if (prepared) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="flex flex-col gap-5" data-studio-result data-studio-prepared>
          <ImageCompare
            before={input}
            after={prepared.output}
            beforeLabel="The sample"
            afterLabel={prepared.label}
            maxHeight={560}
          />

          {/* Said plainly, above the actions, in the accent that means "read
              this". The whole value of the instant path is that it is honest
              about being a demo — an unlabelled one is a promise the app
              cannot keep on the visitor's own image. */}
          <div className="flex items-start gap-3 rounded-field border border-ochre/25 bg-ochre/[0.06] px-4 py-3">
            <Zap size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-ochre-deep" />
            <p className="text-body text-graphite">
              <span className="font-medium text-ink">This one was prepared earlier.</span> It is a real output of this
              tool on this sample, shipped with the app so you can see the result before spending anything. Your own
              image runs for real — that takes an API key and about half a minute.
            </p>
          </div>

          {warn ? <Notice tone="warning" message={warn} /> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={<Upload size={16} strokeWidth={1.75} />} onClick={onStartOver}>
              Try it on your own image
            </Button>
            <Button
              variant="secondary"
              icon={<Download size={16} strokeWidth={1.75} />}
              onClick={() => downloadDataURL(prepared.output, `${slugify(def.name)}-example.jpg`)}
            >
              Download
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

          <ShareBar
            feature={feature}
            verb={def.verb}
            before={input}
            after={prepared.output}
            source={source}
            prepared
          />

          {chainRow(prepared.output, prepared.outputSource)}
        </div>
      </div>
    );
  }

  // --- Generated ------------------------------------------------------------
  return (
    <div className="flex flex-col gap-5">
      {header}

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
      ) : generated ? (
        <div className="flex flex-col gap-5" data-studio-result>
          {/* The result is the hero here, not a footnote under a control panel —
              so it gets a taller cap than the tool screen's 340. */}
          <ImageCompare
            before={inputUsed ?? input}
            after={generated.url}
            beforeLabel="Yours"
            afterLabel={generated.label}
            maxHeight={560}
          />

          {warning ? <Notice tone="warning" message={warning} /> : null}
          {warn ? <Notice tone="warning" message={warn} /> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              icon={<Download size={16} strokeWidth={1.75} />}
              onClick={() => downloadDataURL(generated.url, `${slugify(def.name)}-${slugify(generated.label)}.png`)}
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

          <ShareBar
            feature={feature}
            verb={def.verb}
            before={inputUsed ?? input}
            after={generated.url}
            source={null}
            prepared={false}
          />

          {chainRow(generated.url, null)}
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
