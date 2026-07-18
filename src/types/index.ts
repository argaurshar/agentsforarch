import type { FeatureKind, GeneratedImage } from '../providers/types';

// Re-export the provider-owned types so app code has a single import surface.
export type { FeatureKind, GeneratedImage };

export type SlideLayout = 'full' | 'two-up' | 'four-grid';

/** The sidebar destinations. Home, Presentation and Gallery are not generation features. */
export type TabKey = FeatureKind | 'home' | 'presentation' | 'gallery';

/** The studio/client's brand identity, applied to slides and the PDF export. */
export interface Brand {
  name: string;
  primary: string; // hex — headings / strong marks
  accent: string; // hex — the single accent
  background: string; // hex — slide background
  text: string; // hex — body text
  headingFont: string; // CSS font-family stack
  bodyFont: string; // CSS font-family stack
  logo?: string; // dataURL
  voice?: string; // tone-of-voice notes, used by the Claude composer
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  assets: Asset[];
  slides: Slide[];
  /** Images uploaded directly into the presentation (not generated). */
  uploads: GeneratedImage[];
  brand: Brand;
}

/** A slide the Claude composer proposes (image ids resolved by the caller). */
export interface ComposedSlide {
  imageIds: string[];
  layout: SlideLayout;
  title: string;
  caption: string;
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
