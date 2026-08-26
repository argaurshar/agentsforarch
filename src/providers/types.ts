// The image-provider adapter interface (spec §5).
//
// ALL generation goes through this interface. No component may call an image
// API directly — features resolve a provider via `getActiveProvider()`.

// The tool list lives in the feature registry. `keys.ts` deliberately has no
// imports of its own, so this stays a leaf dependency and never cycles.
import type { FeatureKind } from '../features/registry/keys';

export type { FeatureKind };

import type { GenerateOptions } from './options';

export type { GenerateOptions };

export interface GenerateRequest {
  feature: FeatureKind;
  /**
   * Input images as dataURLs, 0..MAX_INPUT_IMAGES.
   *
   * An ARRAY, and possibly empty: several planned tools need a second image
   * (target + style reference, site + building), one needs four, and five
   * generate from prose or coordinates with no image at all. A single required
   * `inputImage: string` could express none of that, and both providers capped
   * at two images total because of it.
   */
  inputImages: string[];
  prompt?: string; // optional user styling notes
  options: GenerateOptions;
}

export interface GeneratedImage {
  id: string;
  url: string; // dataURL or remote URL
  label: string; // e.g. 'Golden hour', 'SE axonometric'
  createdAt: number;
}

/** A single job that failed within a multi-image batch (partial failure). */
export interface GenerateFailure {
  label: string;
  error: string;
}

export interface GenerateResult {
  images: GeneratedImage[];
  failures?: GenerateFailure[]; // jobs that failed while others succeeded (money already spent is never discarded)
  providerName: string;
  elapsedMs: number;
}

export interface ImageProvider {
  name: string;
  isConfigured(): boolean;
  /** `signal` cancels an in-flight generation; the provider must return any images already produced. */
  generate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult>;
}
