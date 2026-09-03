import { useCallback, useEffect, useState } from 'react';
import { classifyImage } from '../../lib/classify';
import { loadExampleInput } from '../../lib/examples';
import { Spinner } from '../../components/ui/Spinner';
import type { InputKind } from '../registry/keys';
import { featureDef } from '../registry';
import type { FeatureKind } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { remixKind } from './remix';
import { assetUrl } from './samples';
import { StudioDrop } from './StudioDrop';
import { StudioResult } from './StudioResult';
import { ToolPicker } from './ToolPicker';

/**
 * The front door. Three states, two clicks.
 *
 *   no image        → StudioDrop      "what do you have?"
 *   image, no tool  → ToolPicker      "make it…"
 *   image + tool    → StudioResult    the result, and what is next
 *
 * A fourth entrance skips straight past the first two: a `#/do/<tool>` link. It
 * sets `studio.pending`, and this screen spends it — on the bundled image the
 * link named, or on the first image the visitor supplies.
 *
 * The state lives in the store rather than here so that visiting the Gallery
 * and coming back does not throw away the image — App.tsx remounts the routed
 * screen on every tab change, which would otherwise reset the whole flow.
 *
 * `guessed` is local on purpose: it is about how the CURRENT chip row should
 * read, not about the project. A sample carries its kind, so it is not a guess;
 * a dropped file is, and the row says so.
 */
export function StudioScreen() {
  const studio = useProjectStore((s) => s.studio);
  const setStudioInput = useProjectStore((s) => s.setStudioInput);
  const setStudioTool = useProjectStore((s) => s.setStudioTool);
  const setStudioPending = useProjectStore((s) => s.setStudioPending);
  const [guessed, setGuessed] = useState(false);

  const pending = studio.pending;

  // A link that named an image resolves to a finished result with no input from
  // the visitor at all — which is the whole point of sharing one. The load is a
  // same-origin fetch of an asset the app already ships, so it is fast, free
  // and offline-cacheable; a failure just drops them at the drop zone.
  useEffect(() => {
    if (!pending?.from || studio.input) return;
    let cancelled = false;
    void loadExampleInput(assetUrl(pending.from))
      .then((dataURL) => {
        if (cancelled) return;
        setGuessed(false);
        setStudioInput(dataURL, remixKind(pending.feature, pending.from), pending.from);
        setStudioTool(pending.feature);
        setStudioPending(null);
      })
      .catch(() => {
        if (!cancelled) setStudioPending(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pending, studio.input, setStudioInput, setStudioTool, setStudioPending]);

  const onImage = useCallback(
    (dataURL: string, knownKind?: InputKind, source?: string) => {
      // A link that named only a tool spends itself here, on the visitor's own
      // first image: one click from drop to result instead of two. The kind
      // comes from what that tool declares it reads rather than from the
      // classifier — the link already said what this image is for, and a guess
      // that disagreed would only mis-populate the chain row.
      const queued = useProjectStore.getState().studio.pending;
      if (queued && !queued.from) {
        setGuessed(false);
        setStudioInput(dataURL, knownKind ?? remixKind(queued.feature, null), source ?? null);
        setStudioTool(queued.feature);
        setStudioPending(null);
        return;
      }
      if (knownKind) {
        setGuessed(false);
        setStudioInput(dataURL, knownKind, source ?? null);
        return;
      }
      // Show the picker immediately with a provisional kind, then correct it
      // when the classifier lands. Waiting on a canvas read before showing
      // anything would put a spinner between the drop and the cards for no
      // reason — the guess is cheap, but it is not instant on a large image.
      setGuessed(true);
      setStudioInput(dataURL, 'plan');
      void classifyImage(dataURL).then((g) => {
        const s = useProjectStore.getState();
        // Only apply if the user has not already answered or moved on.
        if (s.studio.input === dataURL && s.studio.tool === null) s.setStudioKind(g.kind);
      });
    },
    [setStudioInput, setStudioTool, setStudioPending],
  );

  const chain = useCallback(
    (feature: FeatureKind, image: string, nextKind: InputKind, source: string | null) => {
      // A chained run starts a NEW flow whose input is the previous output, and
      // whose kind is what that tool PRODUCES — not what went into it. The
      // result view works that out from `outputKind`; here it is just carried.
      //
      // `source` carries over when the previous result was a prepared one, so a
      // demo can chain and stay free: sketch → elevation → axonometric is two
      // instant steps, because the elevation it produced is itself the bundled
      // input of the axonometric pair.
      setGuessed(false);
      setStudioInput(image, nextKind, source);
      setStudioTool(feature);
    },
    [setStudioInput, setStudioTool],
  );

  // Between landing on a shared link and the asset arriving there is nothing to
  // show, and the drop zone would be the wrong thing to show: the visitor did
  // not come here to supply an image.
  if (pending?.from && !studio.input) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-card border border-hairline bg-paper px-6 py-24"
        data-studio-remix-loading
      >
        <Spinner size={26} className="text-ochre" />
        <p className="text-title text-ink">{featureDef(pending.feature).verb}…</p>
        <p className="text-body text-mist">Opening the example this link was made from.</p>
      </div>
    );
  }

  if (!studio.input || !studio.kind) {
    return <StudioDrop onImage={onImage} queued={pending && !pending.from ? featureDef(pending.feature) : null} />;
  }

  if (studio.tool) {
    return (
      <StudioResult
        feature={studio.tool}
        input={studio.input}
        kind={studio.kind}
        source={studio.source}
        onBack={() => setStudioTool(null)}
        onChain={chain}
        onContinue={(image, nextKind, src) => {
          setGuessed(false);
          setStudioInput(image, nextKind, src);
        }}
        onStartOver={() => setStudioInput(null, null)}
      />
    );
  }

  return (
    <ToolPicker
      input={studio.input}
      kind={studio.kind}
      guessed={guessed}
      source={studio.source}
      onRun={setStudioTool}
      onReplace={() => setStudioInput(null, null)}
    />
  );
}
