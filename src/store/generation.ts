// Per-feature generation state, owned by the Zustand store rather than by each
// feature component's local `useState`. Moving it here means an in-flight
// generation survives a tab switch (App.tsx remounts the routed feature on tab
// change), lets one feature seed another's input (the cross-feature pipeline),
// and gives the refine loop a place to live. Types + pure defaults only — no
// React, no provider imports, no prompt builders — so this file stays cheap and
// in the main chunk. Per-feature seed state is assembled by the feature
// registry (src/features/registry), which owns each tool's defaults.

import { defaultScene } from '../lib/scene';
import type { AspectRatio } from '../providers/options';
import type { GeneratedImage } from '../types';

export { defaultScene };

export type GenerateStatus = 'idle' | 'loading' | 'error' | 'done';
export type FeatureMode = 'compose' | 'refine';

// --- Scene vocabulary keys (clause data lives in src/lib/scene.ts) ----------
export type MaterialsKey = 'studio' | 'brick-timber' | 'render-stone' | 'glass-steel' | 'custom';
export type LightingKey = 'golden-hour' | 'midday' | 'overcast' | 'dusk' | 'night';
export type SeasonKey = 'none' | 'spring' | 'summer' | 'autumn' | 'winter';
export type MoodKey = 'none' | 'warm' | 'minimal' | 'dramatic' | 'soft';
export type ContextKey = 'none' | 'urban' | 'landscape' | 'waterfront';
export type SettingKey = 'exterior' | 'interior';
export type ArchStyleKey =
  | 'none'
  | 'contemporary'
  | 'bauhaus'
  | 'indian'
  | 'brutalist'
  | 'minimalist'
  | 'mediterranean'
  | 'scandinavian'
  | 'japanese'
  | 'artdeco'
  | 'custom';

/** One-click scene choices that auto-assemble the prompt (P1 — no prompting for basics). */
export interface SceneOptions {
  materials: MaterialsKey;
  customMaterials: string; // used when materials === 'custom'
  archStyle: ArchStyleKey; // architectural design language (Bauhaus, Indian, Brutalist, …)
  customArchStyle: string; // used when archStyle === 'custom'
  lighting: LightingKey;
  season: SeasonKey;
  mood: MoodKey;
  context: ContextKey;
  setting: SettingKey;
  entourage: boolean; // include people for scale
}

// Style unions, not bare `string`. With `SettingsPatch` distributing per tool,
// these are the last thing standing between a typo and a silently wrong run —
// `updateFeatureSettings('axonometric', { style: 'realistc' })` used to compile.
// The old inline comments here had already drifted from what the UI offers.
export type RenderStyleKey = 'photoreal' | 'isometric' | 'plan2d' | 'clay' | 'line' | 'watercolour';
export type ElevationStyleKey = 'line' | 'rendered' | 'shaded';
export type AxonStyleKey = 'realistic' | 'lineart' | 'bw';

export interface RenderSettings {
  style: RenderStyleKey;
  variations: number; // 1 | 2 | 4
  scene: SceneOptions;
}
export type ElevationThemeKey = 'none' | 'contemporary' | 'modern' | 'traditional' | 'boho';

export interface ElevationSettings {
  face: 'Front' | 'Side' | 'Rear' | 'All';
  style: ElevationStyleKey;
  theme: ElevationThemeKey; // design language for a rendered elevation
  styleSource: 'theme' | 'moodboard'; // drive the render from a theme OR a mood board (mutually exclusive)
  moodboard: string | null; // dataURL of an uploaded mood-board reference image
  scene: SceneOptions;
}

// --- Interior design (Feature: room photo → restyled / staged / renovated) ---
export type InteriorThemeKey =
  | 'none'
  | 'contemporary'
  | 'modern'
  | 'traditional'
  | 'boho'
  | 'minimalist'
  | 'japandi'
  | 'industrial'
  | 'luxury';
export type InteriorMode = 'restyle' | 'stage' | 'renovate';
export type RoomTypeKey = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'dining' | 'office';

export interface InteriorSettings {
  mode: InteriorMode; // restyle keeps the room; stage furnishes an empty room; renovate allows bigger changes
  roomType: RoomTypeKey;
  theme: InteriorThemeKey;
  styleSource: 'theme' | 'moodboard'; // same mutually-exclusive pattern as the elevation
  moodboard: string | null; // dataURL of an uploaded mood-board reference image
  scene: SceneOptions;
}
export interface AxonSettings {
  viewpoints: string[]; // NE/NW/SE/SW
  style: AxonStyleKey;
  section: boolean;
  scene: SceneOptions;
}

// --- Interiors: the tools added alongside restyle/stage/renovate -------------

export interface DeclutterSettings {
  /** Fitted joinery stays (a re-stage) or goes too (a strip-out). */
  keepBuiltIns: boolean;
}

export type PlaceObjectKind = 'furniture' | 'lighting' | 'artwork';
export type PlacementMode = 'replace' | 'add';

export interface PlaceObjectSettings {
  kind: PlaceObjectKind;
  placement: PlacementMode;
  /** What to replace, or where to put it. Free text — there is no mask. */
  target: string;
}

export interface TargetedSwapSettings {
  element: string;
  replacement: string;
}

export interface SpecSheetSettings {
  roomLabel: string;
}

// --- Concept & Form ---------------------------------------------------------

export type MassingDensity = 'low' | 'medium' | 'high';

/** The first tool with no image input at all — every field here is what an
 *  uploaded drawing would otherwise have told the model. */
export interface MassingSettings {
  brief: string;
  siteSize: string;
  density: MassingDensity;
  storeys: string;
  context: string;
}

// --- Material & mood board (Feature 05: any image → AI board) ---------------
export type BoardAspectKey = Extract<AspectRatio, '4:5' | '1:1' | '16:9'>;
export interface MoodboardSettings {
  aspect: BoardAspectKey; // board shape (portrait presentation default)
}

export type FeatureSettings =
  | RenderSettings
  | ElevationSettings
  | AxonSettings
  | InteriorSettings
  | DeclutterSettings
  | PlaceObjectSettings
  | TargetedSwapSettings
  | SpecSheetSettings
  | MassingSettings
  | MoodboardSettings;

/** Quick-action refinement of a specific output (P2). */
export interface RefineState {
  chips: string[];
  freeText: string;
  sourceLabel: string | null; // the output being refined
}

export function emptyRefine(): RefineState {
  return { chips: [], freeText: '', sourceLabel: null };
}

/**
 * A region marked on the input, in fractions of the image (0..1) so it survives
 * any later resize. Burned into the pixels just before the request goes out —
 * the stored input stays clean, so re-marking never degrades the original.
 */
export interface MarkerRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The full live state of one generation feature. */
export interface FeatureRun<S extends FeatureSettings> {
  input: string | null; // dataURL — seeded by dropzone, Refine, or Send-to pipeline
  /**
   * Further images this tool needs in its OWN right, one per slot its registry
   * entry declares — not style references. Positional: the prompt says "the
   * SECOND image", so index 0 here is always that one.
   *
   * In the store rather than in the screen's `useState` because App.tsx remounts
   * the routed feature on every tab change, so component-local state meant a
   * product shot vanished the moment you looked at another tool.
   */
  extraInputs: (string | null)[];
  /** Region marked on the input, for tools that want one. */
  marker: MarkerRect | null;
  settings: S;
  mode: FeatureMode;
  refine: RefineState;
  styleRef: string | null; // reference-chaining: id of a pooled image whose style this run should match

  prompt: string; // the editable textarea value
  promptEdited: boolean; // once true, changing controls no longer overwrites it
  status: GenerateStatus;
  error: string | null; // fatal (no outputs)
  warning: string | null; // partial failure / non-fatal
  outputs: GeneratedImage[]; // last run's outputs (survive tab switches)
  inputUsed: string | null; // snapshot for the before/after compare
  lastAssetId: string | null; // to delete "this run"
  runId: number; // stale-completion guard
}

/**
 * A settings patch for ONE tool.
 *
 * The previous shape was `Partial<Omit<A & B & C & D & E, 'scene' | 'theme'>>`
 * — an intersection of every feature's settings. It had already been hand-
 * patched once because `theme` is a different union on elevation and interior,
 * and it accepted nonsense silently (passing `viewpoints` to the mood board
 * typechecked). At 54 tools every same-named key with a differing type collapses
 * to `never` and the manual escape hatch has to be repeated per collision.
 *
 * Distributing over the union instead keeps each tool's keys exactly its own,
 * and `scene` is only accepted by tools that actually have one.
 */
type OnePatch<S> = Partial<Omit<S, 'scene'>> &
  ('scene' extends keyof S ? { scene?: Partial<SceneOptions> } : { scene?: never });

export type SettingsPatch<S extends FeatureSettings> = S extends unknown ? OnePatch<S> : never;

export function baseRun<S extends FeatureSettings>(settings: S, prompt: string): FeatureRun<S> {
  return {
    input: null,
    extraInputs: [],
    marker: null,
    settings,
    mode: 'compose',
    refine: emptyRefine(),
    styleRef: null,
    prompt,
    promptEdited: false,
    status: 'idle',
    error: null,
    warning: null,
    outputs: [],
    inputUsed: null,
    lastAssetId: null,
    runId: 0,
  };
}
