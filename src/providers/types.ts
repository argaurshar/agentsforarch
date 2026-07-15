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
    style?: string; // e.g. 'photoreal' | 'clay' | 'line'
    viewpoints?: string[]; // axonometric only
    variations?: number; // how many outputs, default 1
  };
}

export interface GeneratedImage {
  id: string;
  url: string; // dataURL or remote URL
  label: string; // e.g. 'Golden hour', 'SE axonometric'
  createdAt: number;
}

export interface GenerateResult {
  images: GeneratedImage[];
  providerName: string;
  elapsedMs: number;
}

export interface ImageProvider {
  name: string;
  isConfigured(): boolean;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}
