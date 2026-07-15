import { create } from 'zustand';
import { newId } from '../lib/images';
import { getActiveProvider } from '../providers';
import {
  getGeminiApiKey,
  getGeminiModel,
  initRuntimeConfig,
  setGeminiConfig,
} from '../providers/runtimeConfig';
import { storage } from '../storage';
import type { Asset, FeatureKind, GeneratedImage, Project, Slide, SlideLayout, TabKey } from '../types';

// All project data access lives here (spec §9 — auth/persistence seam). No
// component reads or writes the model directly; they go through these actions.

function createEmptyProject(): Project {
  const now = Date.now();
  return {
    id: newId('proj'),
    name: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    assets: [],
    slides: [],
  };
}

interface AddAssetInput {
  feature: FeatureKind;
  inputImage: string;
  outputs: GeneratedImage[];
  prompt?: string;
}

interface ApiConfigInput {
  key: string | undefined;
  model?: string;
  remember: boolean;
  forceMock?: boolean;
}

interface ProjectState {
  project: Project;
  tab: TabKey;
  providerName: string;

  // Image-generation credentials (Nano Banana Pro), supplied from the frontend.
  apiKey: string | undefined;
  model: string;
  rememberKey: boolean;
  forceMock: boolean;
  setApiConfig: (cfg: ApiConfigInput) => void;

  setTab: (tab: TabKey) => void;
  renameProject: (name: string) => void;

  addAsset: (input: AddAssetInput) => Asset;
  removeAsset: (assetId: string) => void;

  addSlide: (imageIds: string[], layout: SlideLayout) => string;
  updateSlide: (slideId: string, patch: Partial<Pick<Slide, 'layout' | 'title' | 'caption' | 'imageIds'>>) => void;
  removeSlide: (slideId: string) => void;
  moveSlide: (slideId: string, direction: 'up' | 'down') => void;

  resetProject: () => void;
}

/** Fire-and-forget persistence through the storage adapter (spec §6). */
function persist(project: Project): void {
  void storage.saveProject(project).catch(() => {
    // In-memory adapter never rejects; a durable adapter would surface errors
    // to a future toast/notification layer.
  });
}

function touch(project: Project): Project {
  return { ...project, updatedAt: Date.now() };
}

export const useProjectStore = create<ProjectState>((set, get) => {
  const initial = createEmptyProject();
  persist(initial);
  const rc = initRuntimeConfig();

  return {
    project: initial,
    tab: 'render',
    providerName: getActiveProvider().name,

    apiKey: rc.apiKey,
    model: rc.model,
    rememberKey: rc.remembered,
    forceMock: rc.forceMock,
    setApiConfig: (cfg) => {
      setGeminiConfig(cfg);
      set({
        apiKey: getGeminiApiKey(),
        model: getGeminiModel(),
        rememberKey: cfg.remember,
        forceMock: Boolean(cfg.forceMock),
        providerName: getActiveProvider().name,
      });
    },

    setTab: (tab) => set({ tab }),

    renameProject: (name) => {
      const next = touch({ ...get().project, name: name.trim() || 'Untitled Project' });
      persist(next);
      set({ project: next });
    },

    addAsset: (input) => {
      const asset: Asset = {
        id: newId('asset'),
        feature: input.feature,
        inputImage: input.inputImage,
        outputs: input.outputs,
        prompt: input.prompt,
        createdAt: Date.now(),
      };
      const project = get().project;
      const next = touch({ ...project, assets: [...project.assets, asset] });
      persist(next);
      set({ project: next });
      return asset;
    },

    removeAsset: (assetId) => {
      const project = get().project;
      const asset = project.assets.find((a) => a.id === assetId);
      const removedImageIds = new Set(asset?.outputs.map((o) => o.id) ?? []);
      // Drop the asset and scrub its images from any slides.
      const slides = project.slides
        .map((s) => ({ ...s, imageIds: s.imageIds.filter((id) => !removedImageIds.has(id)) }))
        .filter((s) => s.imageIds.length > 0)
        .map((s, index) => ({ ...s, order: index }));
      const next = touch({
        ...project,
        assets: project.assets.filter((a) => a.id !== assetId),
        slides,
      });
      persist(next);
      set({ project: next });
    },

    addSlide: (imageIds, layout) => {
      const project = get().project;
      const id = newId('slide');
      const slide: Slide = {
        id,
        imageIds: [...imageIds],
        layout,
        order: project.slides.length,
      };
      const next = touch({ ...project, slides: [...project.slides, slide] });
      persist(next);
      set({ project: next });
      return id;
    },

    updateSlide: (slideId, patch) => {
      const project = get().project;
      const next = touch({
        ...project,
        slides: project.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
      });
      persist(next);
      set({ project: next });
    },

    removeSlide: (slideId) => {
      const project = get().project;
      const slides = project.slides
        .filter((s) => s.id !== slideId)
        .sort((a, b) => a.order - b.order)
        .map((s, index) => ({ ...s, order: index }));
      const next = touch({ ...project, slides });
      persist(next);
      set({ project: next });
    },

    moveSlide: (slideId, direction) => {
      const project = get().project;
      const ordered = [...project.slides].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((s) => s.id === slideId);
      if (index === -1) return;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= ordered.length) return;
      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
      const slides = ordered.map((s, i) => ({ ...s, order: i }));
      const next = touch({ ...project, slides });
      persist(next);
      set({ project: next });
    },

    resetProject: () => {
      const fresh = createEmptyProject();
      persist(fresh);
      set({ project: fresh });
    },
  };
});

// --- Derivations -----------------------------------------------------------

/** All generated images across a set of assets, each tagged with its source. */
export interface ImageRef {
  image: GeneratedImage;
  assetId: string;
  feature: FeatureKind;
  prompt?: string;
}

export function imagesFromAssets(assets: Asset[]): ImageRef[] {
  return assets.flatMap((asset) =>
    asset.outputs.map((image) => ({
      image,
      assetId: asset.id,
      feature: asset.feature,
      prompt: asset.prompt,
    })),
  );
}

/** Lookup map from image id → GeneratedImage, for slide rendering/export. */
export function imageMapFromAssets(assets: Asset[]): Map<string, GeneratedImage> {
  const map = new Map<string, GeneratedImage>();
  for (const asset of assets) {
    for (const image of asset.outputs) {
      map.set(image.id, image);
    }
  }
  return map;
}
