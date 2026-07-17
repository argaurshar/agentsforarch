// The image-provider adapter interface (spec §5).
//
// ALL generation goes through this interface. No component may call an image
// API directly — features resolve a provider via `getActiveProvider()`.

export type FeatureKind = 'render' | 'elevation' | 'axonometric';

export interface GenerateRequest {
  feature: FeatureKind;
  inputImage: string; // dataURL
  prompt?: string; // optional user styling notes
  options: {
    style?: string; // e.g. 'photoreal' | 'clay' | 'line' | axon 'realistic' | 'lineart' | 'bw'
    viewpoints?: string[]; // axonometric viewpoints, or elevation faces for the all-faces batch
    variations?: number; // how many outputs, default 1
    section?: boolean; // axonometric: also cut a section-axonometric
    referenceImage?: string; // dataURL — a style reference (e.g. an elevation mood board) sent alongside the input
    refine?: boolean; // this is an iterative refine of an existing output (single job, refined label)
  };
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
