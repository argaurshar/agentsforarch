// The batch runner behind "Synthesize".
//
// One input, several tools, one click. Each tool still runs through exactly the
// same path as its own screen — `buildFeatureRequest` then `runFeature` — so a
// batch result and a single-tool result are the same run, not a parallel
// implementation that can drift.
//
// Runs are SEQUENTIAL on purpose. Firing five image generations at once is the
// fastest way to hit a rate limit and pay for four failures, and a queue lets
// the user watch it happen and stop it halfway with the outputs so far kept.

import { useCallback, useRef, useState } from 'react';
import { abortFeature } from './abortRegistry';
import { runFeature } from './hooks';
import { buildFeatureRequest, featureDef } from './registry';
import type { FeatureKind } from './registry';
import { useProjectStore } from '../store/useProjectStore';

export interface BatchState {
  running: boolean;
  /** The tool generating right now. */
  current: FeatureKind | null;
  /** Tools still waiting, in order. */
  pending: FeatureKind[];
  done: FeatureKind[];
  failed: FeatureKind[];
}

const IDLE: BatchState = { running: false, current: null, pending: [], done: [], failed: [] };

export interface BatchRunner extends BatchState {
  /** Queue these tools against one shared input. */
  start: (features: FeatureKind[], input: string) => void;
  /** Stop after the current tool, keeping whatever has already been generated. */
  cancel: () => void;
  /** Clear the finished/failed tallies so the next run starts from zero. */
  reset: () => void;
}

export function useBatch(): BatchRunner {
  const [state, setState] = useState<BatchState>(IDLE);
  // Cancellation has to be readable from inside the loop, which closes over the
  // state it started with — a ref is the only thing the running loop can see.
  const cancelled = useRef(false);

  const start = useCallback((features: FeatureKind[], input: string) => {
    if (features.length === 0) return;
    cancelled.current = false;
    setState({ running: true, current: null, pending: features, done: [], failed: [] });

    void (async () => {
      const { setFeatureInput } = useProjectStore.getState();
      for (let i = 0; i < features.length; i++) {
        if (cancelled.current) break;
        const feature = features[i];
        // The shared input becomes each tool's own input, so opening the tool
        // afterwards shows what it ran on rather than an empty dropzone.
        setFeatureInput(feature, input);
        setState((s) => ({ ...s, current: feature, pending: features.slice(i + 1) }));

        const run = useProjectStore.getState().generation[feature];
        const def = featureDef(feature);
        // Whatever is in the tool's prompt box is what it runs — an edit made on
        // the tool's own screen survives into the batch.
        const prompt = run.promptEdited
          ? run.prompt
          : def.buildPrompt(run.settings, { useMoodboard: false, useStyleRef: false });

        const outcome = await runFeature(
          buildFeatureRequest(feature, run.settings, {
            inputImages: [input],
            prompt,
            ctx: { refine: false },
          }),
        );

        setState((s) => ({
          ...s,
          done: outcome === 'done' ? [...s.done, feature] : s.done,
          failed: outcome === 'error' ? [...s.failed, feature] : s.failed,
        }));
        if (outcome === 'cancelled') break;
      }
      setState((s) => ({ ...s, running: false, current: null, pending: [] }));
    })();
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
    setState((s) => {
      if (s.current) abortFeature(s.current);
      return { ...s, pending: [] };
    });
  }, []);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, start, cancel, reset };
}
