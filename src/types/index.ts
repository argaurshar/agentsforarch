import type { FeatureKind, GeneratedImage } from '../providers/types';

// Re-export the provider-owned types so app code has a single import surface.
export type { FeatureKind, GeneratedImage };

export type SlideLayout = 'full' | 'two-up' | 'four-grid';

/** The four sidebar destinations. Presentation is not a generation feature. */
export type TabKey = FeatureKind | 'presentation';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  assets: Asset[];
  slides: Slide[];
}

export interface Asset {
  id: string;
  feature: FeatureKind;
  inputImage: string; // dataURL
  outputs: GeneratedImage[];
  prompt?: string;
  createdAt: number;
}

export interface Slide {
  id: string;
  imageIds: string[]; // references GeneratedImage.id
  layout: SlideLayout;
  title?: string;
  caption?: string;
  order: number;
}

/** Lightweight listing shape for the storage adapter. */
export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  assetCount: number;
  slideCount: number;
}
