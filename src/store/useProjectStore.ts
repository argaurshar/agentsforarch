import { create } from 'zustand';
import { abortAllFeatures } from '../features/abortRegistry';
import { newId } from '../lib/images';
import { activeProviderName, isImageEngineReady } from '../providers';
import {
  getEngine,
  getGeminiApiKey,
  getGeminiModel,
  getKieApiKey,
  initRuntimeConfig,
  setGeminiConfig,
} from '../providers/runtimeConfig';
import type { EngineKey } from '../providers/runtimeConfig';
import { storage } from '../storage';
import type { Asset, Brand, FeatureKind, GeneratedImage, Project, TabKey } from '../types';
import type { InputKind } from '../features/registry/keys';
import { FEATURE_KEYS, featureDef, initialGeneration } from '../features/registry';
import type { GenerationState, SettingsFor } from '../features/registry';
import type { FeatureRun, FeatureSettings, SceneOptions, SettingsPatch } from './generation';

// All project data access lives here (spec §9 — auth/persistence seam). No
// component reads or writes the model directly; they go through these actions.

/**
 * Default brand. These are the *artefact* palette — the colours the mood board
 * and social export are stamped in — deliberately independent of the app
 * chrome's design tokens. BrandPanel's "Reset to studio default" writes this
 * exact object back, so the two must stay in step (it is exported for that).
 */
export function makeDefaultBrand(): Brand {
  return {
    primary: '#0f1729',
    accent: '#c2410c',
    background: '#f7f2e8',
    text: '#334155',
  };
}

function createEmptyProject(): Project {
  const now = Date.now();
  return {
    id: newId('proj'),
    name: 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    assets: [],
    uploads: [],
    brand: makeDefaultBrand(),
  };
}

interface AddAssetInput {
  feature: FeatureKind;
  inputImage: string | null;
  outputs: GeneratedImage[];
  prompt?: string;
}

interface ApiConfigInput {
  engine?: EngineKey;
  key: string | undefined;
  model?: string;
  kieKey?: string | undefined;
  remember: boolean;
}

interface ProjectState {
  project: Project;
  tab: TabKey;
  providerName: string;

  // Image-generation credentials, supplied from the frontend. `engine` picks
  // which service serves generations: Gemini (Nano Banana Pro) or kie.ai
  // (Nano Banana 2) — each with its own key.
  engine: EngineKey;
  apiKey: string | undefined; // Gemini key
  model: string; // Gemini model
  kieApiKey: string | undefined; // kie.ai key
  rememberKey: boolean;
  engineReady: boolean; // true once the chosen engine has its key configured
  setApiConfig: (cfg: ApiConfigInput) => void;

  // Per-feature generation state (input, settings, outputs, status). Lives in the
  // store so an in-flight run survives a tab switch and features can seed one
  // another (the cross-feature pipeline). See src/store/generation.ts.
  generation: GenerationState;
  patchFeatureRun: (feature: FeatureKind, patch: Partial<Omit<FeatureRun<FeatureSettings>, 'settings'>>) => void;
  setFeatureInput: (feature: FeatureKind, dataURL: string | null) => void;
  /** Set one of a tool's own extra image inputs, by slot index. */
  setFeatureExtraInput: (feature: FeatureKind, index: number, dataURL: string | null) => void;
  updateFeatureSettings: <K extends FeatureKind>(feature: K, patch: SettingsPatch<SettingsFor<K>>) => void;
  setFeaturePrompt: (feature: FeatureKind, prompt: string, edited: boolean) => void;
  beginRefine: (feature: FeatureKind, image: GeneratedImage) => void;
  exitRefine: (feature: FeatureKind) => void;
  sendToFeature: (target: FeatureKind, dataURL: string) => void;

  // --- The front door -------------------------------------------------------
  // One image, one answer to "what is this?", one tool being run on it. The
  // RESULT is deliberately not here: tapping a card runs the real tool, so the
  // output lands in `generation[tool]` exactly where the tool screen reads it.
  // That is what keeps the front door and the Advanced view showing the same
  // thing instead of two copies that drift.
  studio: {
    input: string | null;
    kind: InputKind | null;
    tool: FeatureKind | null;
    /** Basename of the bundled example this input came from, when it did. That
     *  is what lets a result be served instantly instead of generated — and it
     *  is null for anything the user supplied, which is every real use. */
    source: string | null;
    /** A transformation asked for by the URL (`#/do/<tool>`) and not yet run.
     *
     *  Named `pending` rather than applied on arrival because a link can name a
     *  tool without naming an image: the recipient still has to supply one, and
     *  when they do the tool runs immediately — so a shared link costs them one
     *  click, not two. Structural on purpose, so the store does not have to
     *  import the studio module that parses it. */
    pending: { feature: FeatureKind; from: string | null } | null;
  };
  /** Drop (or clear) the shared image. Clearing resets the whole studio. */
  setStudioInput: (dataURL: string | null, kind: InputKind | null, source?: string | null) => void;
  /** Queue (or clear) the transformation a `#/do/…` link asked for. */
  setStudioPending: (pending: { feature: FeatureKind; from: string | null } | null) => void;
  /** Correct the guessed kind. Also drops the chosen tool, since the shortlist
   *  it came from no longer applies. */
  setStudioKind: (kind: InputKind) => void;
  /** Choose the transformation, or go back to the cards with null. */
  setStudioTool: (tool: FeatureKind | null) => void;

  setTab: (tab: TabKey) => void;
  renameProject: (name: string) => void;

  setBrand: (patch: Partial<Brand>) => void;
  addUploads: (images: GeneratedImage[]) => void;
  removeUpload: (imageId: string) => void;

  addAsset: (input: AddAssetInput) => Asset;
  removeAsset: (assetId: string) => void;
  /** Delete a single image wherever it lives (generated output or upload), scrubbing feature displays. */
  removeImage: (imageId: string) => void;

  resetProject: () => void;
  /** Replace the whole project with an imported one (project save/load). */
  importProject: (project: Project) => void;
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
    tab: 'home',
    providerName: activeProviderName(),

    engine: rc.engine,
    apiKey: rc.apiKey,
    model: rc.model,
    kieApiKey: rc.kieApiKey,
    rememberKey: rc.remembered,
    engineReady: isImageEngineReady(),
    setApiConfig: (cfg) => {
      setGeminiConfig(cfg);
      set({
        engine: getEngine(),
        apiKey: getGeminiApiKey(),
        model: getGeminiModel(),
        kieApiKey: getKieApiKey(),
        rememberKey: cfg.remember,
        engineReady: isImageEngineReady(),
        providerName: activeProviderName(),
      });
    },

    generation: initialGeneration(),

    patchFeatureRun: (feature, patch) => {
      const gen = get().generation;
      set({ generation: { ...gen, [feature]: { ...gen[feature], ...patch } } });
    },

    setFeatureInput: (feature, dataURL) => {
      const gen = get().generation;
      const run = gen[feature];
      // A manual input replace exits refine mode and clears the compare snapshot.
      // The marker goes too: it is a region of the OLD image, and silently
      // carrying it onto a new one would burn a box over something arbitrary.
      set({
        generation: {
          ...gen,
          [feature]: { ...run, input: dataURL, marker: null, mode: 'compose', inputUsed: null },
        },
      });
    },

    setFeatureExtraInput: (feature, index, dataURL) => {
      const gen = get().generation;
      const run = gen[feature];
      const extraInputs = [...run.extraInputs];
      // Slots are positional and the prompt names them by position, so a gap has
      // to stay a gap rather than closing up.
      while (extraInputs.length <= index) extraInputs.push(null);
      extraInputs[index] = dataURL;
      set({ generation: { ...gen, [feature]: { ...run, extraInputs } } });
    },

    updateFeatureSettings: (feature, patch) => {
      const gen = get().generation;
      // One cast, contained here: TS cannot prove a write through a generic key
      // into a mapped type. Every CALL SITE stays fully checked against its own
      // tool's settings, which is the point of the change.
      const run = gen[feature] as unknown as FeatureRun<FeatureSettings>;
      const current = run.settings as unknown as Record<string, unknown>;
      const p = patch as { scene?: Partial<SceneOptions> } & Record<string, unknown>;
      // The mood board has no scene; every other tool deep-merges a partial one.
      const existingScene = 'scene' in current ? (current.scene as SceneOptions) : undefined;
      const scene = p.scene && existingScene ? { ...existingScene, ...p.scene } : existingScene;
      const settings = { ...current, ...p, ...(scene ? { scene } : {}) };
      set({ generation: { ...gen, [feature]: { ...run, settings } } as GenerationState });
    },

    setFeaturePrompt: (feature, prompt, edited) => {
      const gen = get().generation;
      set({ generation: { ...gen, [feature]: { ...gen[feature], prompt, promptEdited: edited } } });
    },

    beginRefine: (feature, image) => {
      const gen = get().generation;
      const run = gen[feature];
      set({
        generation: {
          ...gen,
          [feature]: {
            ...run,
            input: image.url,
            inputUsed: null,
            mode: 'refine',
            refine: { chips: [], freeText: '', sourceLabel: image.label },
            promptEdited: false,
          },
        },
      });
    },

    exitRefine: (feature) => {
      const gen = get().generation;
      set({ generation: { ...gen, [feature]: { ...gen[feature], mode: 'compose', promptEdited: false } } });
    },

    sendToFeature: (target, dataURL) => {
      get().setFeatureInput(target, dataURL);
      set({ tab: target });
    },

    studio: { input: null, kind: null, tool: null, source: null, pending: null },
    setStudioInput: (dataURL, kind, source = null) =>
      set((st) => ({ studio: { input: dataURL, kind, tool: null, source, pending: st.studio.pending } })),
    setStudioPending: (pending) => set((st) => ({ studio: { ...st.studio, pending } })),
    setStudioKind: (kind) => set((st) => ({ studio: { ...st.studio, kind, tool: null } })),
    setStudioTool: (tool) => {
      const { studio, setFeatureInput } = get();
      // The tool reads its input from its OWN slice — that is how the Advanced
      // view, the refine loop and the gallery all already work. Seeding it here
      // is what makes "tap a card" and "open the tool" the same run.
      if (tool && studio.input) setFeatureInput(tool, studio.input);
      set((st) => ({ studio: { ...st.studio, tool } }));
    },

    setTab: (tab) => set({ tab }),


    renameProject: (name) => {
      const next = touch({ ...get().project, name: name.trim() || 'Untitled Project' });
      persist(next);
      set({ project: next });
    },

    setBrand: (patch) => {
      const project = get().project;
      const next = touch({ ...project, brand: { ...project.brand, ...patch } });
      persist(next);
      set({ project: next });
    },

    addUploads: (images) => {
      const project = get().project;
      const next = touch({ ...project, uploads: [...project.uploads, ...images] });
      persist(next);
      set({ project: next });
    },

    removeUpload: (imageId) => {
      const project = get().project;
      const uploads = project.uploads.filter((u) => u.id !== imageId);
      const next = touch({ ...project, uploads });
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
      const next = touch({
        ...project,
        assets: project.assets.filter((a) => a.id !== assetId),
      });
      persist(next);
      set({ project: next });
    },

    removeImage: (imageId) => {
      const state = get();
      const project = state.project;
      if (project.uploads.some((u) => u.id === imageId)) {
        state.removeUpload(imageId); // handles persist
      } else {
        const asset = project.assets.find((a) => a.outputs.some((o) => o.id === imageId));
        if (asset) {
          const remaining = asset.outputs.filter((o) => o.id !== imageId);
          const assets =
            remaining.length > 0
              ? project.assets.map((a) => (a.id === asset.id ? { ...a, outputs: remaining } : a))
              : project.assets.filter((a) => a.id !== asset.id);
          const next = touch({ ...project, assets });
          persist(next);
          set({ project: next });
        }
      }
      // Drop it from any feature's displayed outputs (so the card disappears) and
      // clear it as a style reference if a feature was pointing at it.
      const gen = get().generation;
      const scrub = <S extends FeatureSettings>(run: FeatureRun<S>): FeatureRun<S> => {
        let next = run;
        if (run.outputs.some((o) => o.id === imageId)) next = { ...next, outputs: next.outputs.filter((o) => o.id !== imageId) };
        if (next.styleRef === imageId) next = { ...next, styleRef: null };
        return next;
      };
      // Derived: a new tool is scrubbed because it exists, not because someone
      // remembered to add a line here.
      // Loose accumulator, narrowed once — see initialGeneration() for why a
      // direct mapped-type write does not typecheck here.
      const scrubbed: Record<string, FeatureRun<FeatureSettings>> = {};
      for (const key of FEATURE_KEYS) {
        scrubbed[key] = scrub(gen[key] as FeatureRun<FeatureSettings>);
      }
      set({ generation: scrubbed as GenerationState });
    },

    resetProject: () => {
      abortAllFeatures(); // stop any in-flight image generation
      const fresh = createEmptyProject();
      persist(fresh);
      set({ project: fresh, generation: initialGeneration() });
    },

    importProject: (project) => {
      abortAllFeatures();
      const next = touch(project);
      persist(next);
      set({ project: next, generation: initialGeneration() });
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

/** A project-pool image, tagged with its display group. */
export interface PoolImage {
  image: GeneratedImage;
  group: string;
}

const POOL_GROUPS: { key: FeatureKind; label: string }[] = FEATURE_KEYS.map((key) => ({
  key,
  label: featureDef(key).poolLabel,
}));

/** Every image in the project — generated outputs plus anything added directly. */
export function poolFromProject(project: Project): PoolImage[] {
  const out: PoolImage[] = [];
  for (const group of POOL_GROUPS) {
    for (const asset of project.assets) {
      if (asset.feature !== group.key) continue;
      for (const image of asset.outputs) out.push({ image, group: group.label });
    }
  }
  for (const image of project.uploads) out.push({ image, group: 'Uploaded' });
  return out;
}
