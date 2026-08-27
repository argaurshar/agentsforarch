import { useCallback, useMemo } from 'react';
import { getActiveProvider } from '../providers';
import type { GenerateRequest, GenerateResult } from '../providers';
import { poolFromProject, useProjectStore } from '../store/useProjectStore';
import type { GenerateStatus } from '../store/generation';
import type { FeatureKind, GeneratedImage } from '../types';
import { abortFeature, clearController, startRun } from './abortRegistry';

export type { GenerateStatus };

interface UseGenerateResult {
  status: GenerateStatus;
  error: string | null;
  warning: string | null;
  outputs: GeneratedImage[];
  inputUsed: string | null;
  engineReady: boolean; // whether an image key is configured
  run: (req: GenerateRequest) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

/** Human summary of a partial batch (some jobs failed, or the user cancelled). */
function partialWarning(result: GenerateResult, aborted: boolean): string | null {
  const failures = result.failures ?? [];
  const kept = result.images.length;
  if (aborted && failures.length === 0) {
    return `Cancelled — kept the ${kept} image${kept === 1 ? '' : 's'} generated so far.`;
  }
  if (failures.length === 0) return null;
  const list = failures.map((f) => f.label).join(', ');
  return `${failures.length} image${failures.length === 1 ? '' : 's'} couldn't be generated (${list}). Kept the ${kept} that succeeded.`;
}

/** How one run ended. The batch runner needs this; a single screen reads the
 *  store instead, which is why `useGenerate` still returns void. */
export type RunOutcome = 'done' | 'error' | 'cancelled' | 'superseded';

/**
 * Run one tool. The whole generate flow, with no React in it.
 *
 * This is a plain function rather than hook-internal because the batch runner
 * has to drive N tools from one click, and hooks cannot be called in a loop over
 * a changing selection. Everything it touches — the store actions, the abort
 * registry, the provider — is reachable outside React already, so the extraction
 * is a move, not a rewrite: `useGenerate` below is now a thin wrapper over it,
 * and single and batch runs cannot drift apart.
 *
 * Generation state lives in the store, so an in-flight run survives a tab switch
 * (App.tsx remounts the routed feature) and the outputs are still there when the
 * user returns. The AbortSignal is threaded to the provider (Cancel, batch
 * cancel and resetProject all use it), and a `runId` guard makes sure a stale
 * completion never clobbers a newer run.
 */
export async function runFeature(req: GenerateRequest): Promise<RunOutcome> {
  const feature = req.feature;
  const { patchFeatureRun: patch, addAsset } = useProjectStore.getState();
  const provider = getActiveProvider();
  if (!provider) {
    patch(feature, { status: 'error', error: 'Add your Gemini API key in Settings (top-right) to generate images.' });
    return 'error';
  }
  const myRunId = useProjectStore.getState().generation[feature].runId + 1;
  patch(feature, { runId: myRunId, status: 'loading', error: null, warning: null });
  const controller = startRun(feature);
  const current = () => useProjectStore.getState().generation[feature].runId;
  try {
    const result = await provider.generate(req, controller.signal);
    if (current() !== myRunId) return 'superseded'; // a newer run took over
    if (result.images.length > 0) {
      const asset = addAsset({
        feature: req.feature,
        inputImage: req.inputImages[0] ?? null,
        outputs: result.images,
        prompt: req.prompt,
      });
      patch(feature, {
        outputs: result.images,
        inputUsed: req.inputImages[0] ?? null,
        status: 'done',
        warning: partialWarning(result, controller.signal.aborted),
        lastAssetId: asset.id,
      });
      return 'done';
    }
    if (controller.signal.aborted) {
      patch(feature, { status: 'idle' });
      return 'cancelled';
    }
    patch(feature, { status: 'error', error: result.failures?.[0]?.error ?? 'Generation failed. Please try again.' });
    return 'error';
  } catch (e) {
    if (current() !== myRunId) return 'superseded';
    if (controller.signal.aborted) {
      patch(feature, { status: 'idle' });
      return 'cancelled';
    }
    patch(feature, { status: 'error', error: e instanceof Error ? e.message : 'Generation failed. Please try again.' });
    return 'error';
  } finally {
    clearController(feature, controller);
  }
}

/** The single-tool screen's view of `runFeature`, plus this feature's live state. */
export function useGenerate(feature: FeatureKind): UseGenerateResult {
  const runState = useProjectStore((s) => s.generation[feature]);
  const engineReady = useProjectStore((s) => s.engineReady);
  const patch = useProjectStore((s) => s.patchFeatureRun);

  const run = useCallback(async (req: GenerateRequest) => {
    await runFeature(req);
  }, []);

  const cancel = useCallback(() => {
    abortFeature(feature);
  }, [feature]);

  const reset = useCallback(() => {
    patch(feature, { status: 'idle', error: null, warning: null, outputs: [], inputUsed: null });
  }, [feature, patch]);

  return {
    status: runState.status,
    error: runState.error,
    warning: runState.warning,
    outputs: runState.outputs,
    inputUsed: runState.inputUsed,
    engineReady,
    run,
    cancel,
    reset,
  };
}

/**
 * Reference-chaining: resolve a feature's `styleRef` (a pooled image id) to its
 * dataURL, so the feature can attach it as a second image and flag the prompt.
 * Returns nulls when nothing is selected or the referenced image no longer exists.
 */
export function useStyleRef(feature: FeatureKind): { id: string | null; url: string | null } {
  const id = useProjectStore((s) => s.generation[feature].styleRef);
  const project = useProjectStore((s) => s.project);
  const url = useMemo(() => {
    if (!id) return null;
    return poolFromProject(project).find((p) => p.image.id === id)?.image.url ?? null;
  }, [id, project]);
  return { id, url };
}
