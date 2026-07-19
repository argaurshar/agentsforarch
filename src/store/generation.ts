// Per-feature generation state, owned by the Zustand store rather than by each
// feature component's local `useState`. Moving it here means an in-flight
// generation survives a tab switch (App.tsx remounts the routed feature on tab
// change), lets one feature seed another's input (the cross-feature pipeline),
// and gives the refine loop a place to live. Types + pure defaults only — no
// React, no provider imports — so this file stays cheap and in the main chunk.

import { axonometricPrompt, elevationPrompt, interiorPrompt, renderPrompt } from '../lib/prompts';
import { defaultScene } from '../lib/scene';
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

export interface RenderSettings {
  style: string; // photoreal | clay | line | watercolour
  variations: number; // 1 | 2 | 4
  scene: SceneOptions;
}
export type ElevationThemeKey = 'none' | 'contemporary' | 'modern' | 'traditional' | 'boho';

export interface ElevationSettings {
  face: 'Front' | 'Side' | 'Rear' | 'All';
  style: string; // line | rendered | shaded
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
  style: string; // realistic | lineart | bw
  section: boolean;
  scene: SceneOptions;
}

export type FeatureSettings = RenderSettings | ElevationSettings | AxonSettings | InteriorSettings;

/** Quick-action refinement of a specific output (P2). */
export interface RefineState {
  chips: string[];
  freeText: string;
  sourceLabel: string | null; // the output being refined
}

export function emptyRefine(): RefineState {
  return { chips: [], freeText: '', sourceLabel: null };
}

/** The full live state of one generation feature. */
export interface FeatureRun<S extends FeatureSettings> {
  input: string | null; // dataURL — seeded by dropzone, Refine, or Send-to pipeline
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

export interface GenerationState {
  render: FeatureRun<RenderSettings>;
  elevation: FeatureRun<ElevationSettings>;
  axonometric: FeatureRun<AxonSettings>;
  interior: FeatureRun<InteriorSettings>;
}

function baseRun<S extends FeatureSettings>(settings: S, prompt: string): FeatureRun<S> {
  return {
    input: null,
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

export function initialGeneration(): GenerationState {
  const scene = defaultScene();
  return {
    render: baseRun<RenderSettings>({ style: 'isometric', variations: 1, scene: defaultScene() }, renderPrompt('isometric')),
    elevation: baseRun<ElevationSettings>(
      { face: 'Front', style: 'rendered', theme: 'none', styleSource: 'theme', moodboard: null, scene: defaultScene() },
      elevationPrompt('Front', 'rendered'),
    ),
    axonometric: baseRun<AxonSettings>({ viewpoints: ['NE'], style: 'realistic', section: false, scene }, axonometricPrompt(false)),
    interior: baseRun<InteriorSettings>(
      { mode: 'restyle', roomType: 'living', theme: 'contemporary', styleSource: 'theme', moodboard: null, scene: defaultScene() },
      interiorPrompt(),
    ),
  };
}
