import { useCallback, useState } from 'react';
import { classifyImage } from '../../lib/classify';
import type { InputKind } from '../registry/keys';
import type { FeatureKind } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
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
  const [guessed, setGuessed] = useState(false);

  const onImage = useCallback(
    (dataURL: string, knownKind?: InputKind, source?: string) => {
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
    [setStudioInput],
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

  if (!studio.input || !studio.kind) return <StudioDrop onImage={onImage} />;

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
