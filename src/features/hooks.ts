import { useCallback, useMemo, useState } from 'react';
import { getActiveProvider } from '../providers';
import type { GenerateRequest } from '../providers';
import { useProjectStore } from '../store/useProjectStore';
import type { GeneratedImage } from '../types';

export type GenerateStatus = 'idle' | 'loading' | 'error' | 'done';

interface UseGenerateResult {
  status: GenerateStatus;
  error: string | null;
  outputs: GeneratedImage[];
  inputUsed: string | null;
  run: (req: GenerateRequest) => Promise<void>;
  reset: () => void;
}

/**
 * The shared generate flow (spec §8, shared pattern). Resolves the active
 * provider via `getActiveProvider()` — features never import a provider — and
 * appends an Asset to the project on success. When no image key is configured
 * the provider is `null`, and the flow surfaces a clear prompt to add one.
 * Loading and error states are the caller's to render.
 */
export function useGenerate(): UseGenerateResult {
  const addAsset = useProjectStore((s) => s.addAsset);
  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<GeneratedImage[]>([]);
  const [inputUsed, setInputUsed] = useState<string | null>(null);

  const run = useCallback(
    async (req: GenerateRequest) => {
      const provider = getActiveProvider();
      if (!provider) {
        setError('Add your Gemini API key in Settings (top-right) to generate images.');
        setStatus('error');
        return;
      }
      setStatus('loading');
      setError(null);
      try {
        const result = await provider.generate(req);
        addAsset({
          feature: req.feature,
          inputImage: req.inputImage,
          outputs: result.images,
          prompt: req.prompt,
        });
        setOutputs(result.images);
        setInputUsed(req.inputImage);
        setStatus('done');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Generation failed. Please try again.');
        setStatus('error');
      }
    },
    [addAsset],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setOutputs([]);
    setInputUsed(null);
  }, []);

  return { status, error, outputs, inputUsed, run, reset };
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
