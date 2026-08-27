import type { CategoryTab } from '../features/registry/keys';
import type { FeatureKind, GeneratedImage } from '../providers/types';

// Re-export the provider-owned types so app code has a single import surface.
export type { FeatureKind, GeneratedImage };

/**
 * Every destination the app can be at.
 *
 * Three kinds, and they are not the same thing: the two fixed pages, one page
 * per CATEGORY (what the sidebar lists now — a flat row per tool stopped
 * scanning at eleven and this app is heading for ~54), and one page per TOOL,
 * still deep-linkable and still where a tool's own settings live.
 */
export type TabKey = FeatureKind | 'home' | 'gallery' | CategoryTab;

/**
 * The studio/client's brand colours, stamped onto the artefacts the app renders
 * itself — the mood-board collage and the social-format export.
 */
export interface Brand {
  primary: string; // hex — headings / strong marks
  accent: string; // hex — the single accent
  background: string; // hex — board background
  text: string; // hex — body text
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  assets: Asset[];
  /** Images added to the project directly rather than produced by a feature run. */
  uploads: GeneratedImage[];
  brand: Brand;
}

export interface Asset {
  id: string;
  feature: FeatureKind;
  /**
   * The primary input, as a dataURL — what the before/after compare shows.
   * `null` for tools that generate from prose or coordinates with no image.
   * Deliberately NOT an array: multi-image tools still have one primary, and
   * widening this would change the exported project-file format.
   */
  inputImage: string | null;
  outputs: GeneratedImage[];
  prompt?: string;
  createdAt: number;
}

/** Lightweight listing shape for the storage adapter. */
export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  assetCount: number;
}
