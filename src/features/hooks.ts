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

/**
 * The shared generate flow, store-backed per feature. Generation state
 * (status/outputs/input) lives in the Zustand store, so an in-flight run
 * survives a tab switch (App.tsx remounts the routed feature) and the outputs
 * are still there when the user returns. `run` threads an AbortSignal to the
 * provider (Cancel + resetProject use it), and a `runId` guard makes sure a
 * stale completion never clobbers a newer run.
 */
export function useGenerate(feature: FeatureKind): UseGenerateResult {
  const runState = useProjectStore((s) => s.generation[feature]);
  const engineReady = useProjectStore((s) => s.engineReady);
  const addAsset = useProjectStore((s) => s.addAsset);
  const patch = useProjectStore((s) => s.patchFeatureRun);

  const run = useCallback(
    async (req: GenerateRequest) => {
      const provider = getActiveProvider();
      if (!provider) {
        patch(feature, { status: 'error', error: 'Add your Gemini API key in Settings (top-right) to generate images.' });
        return;
      }
      const myRunId = useProjectStore.getState().generation[feature].runId + 1;
      patch(feature, { runId: myRunId, status: 'loading', error: null, warning: null });
      const controller = startRun(feature);
      const current = () => useProjectStore.getState().generation[feature].runId;
      try {
        const result = await provider.generate(req, controller.signal);
        if (current() !== myRunId) return; // superseded by a newer run
        if (result.images.length > 0) {
          const asset = addAsset({
            feature: req.feature,
            inputImage: req.inputImage,
            outputs: result.images,
            prompt: req.prompt,
          });
          patch(feature, {
            outputs: result.images,
            inputUsed: req.inputImage,
            status: 'done',
            warning: partialWarning(result, controller.signal.aborted),
            lastAssetId: asset.id,
          });
        } else if (controller.signal.aborted) {
          patch(feature, { status: 'idle' });
        } else {
          patch(feature, { status: 'error', error: result.failures?.[0]?.error ?? 'Generation failed. Please try again.' });
        }
      } catch (e) {
        if (current() !== myRunId) return;
        if (controller.signal.aborted) {
          patch(feature, { status: 'idle' });
          return;
        }
        patch(feature, { status: 'error', error: e instanceof Error ? e.message : 'Generation failed. Please try again.' });
      } finally {
        clearController(feature, controller);
      }
    },
    [feature, addAsset, patch],
  );

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

interface UsePresentationAdderResult {
  addToPresentation: (imageId: string) => void;
  addedIds: Set<string>;
}

/**
 * "Add to presentation" from an output card creates a single-image `full`
 * slide, and reports which images already live on a slide so cards can show a
 * confirmed state.
 */
export function usePresentationAdder(): UsePresentationAdderResult {
  const slides = useProjectStore((s) => s.project.slides);
  const addSlide = useProjectStore((s) => s.addSlide);

  const addedIds = useMemo(() => new Set(slides.flatMap((s) => s.imageIds)), [slides]);

  const addToPresentation = useCallback(
    (imageId: string) => {
      if (addedIds.has(imageId)) return;
      addSlide([imageId], 'full');
    },
    [addSlide, addedIds],
  );

  return { addToPresentation, addedIds };
}
