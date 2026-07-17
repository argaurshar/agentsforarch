// Per-feature generation state, owned by the Zustand store rather than by each
// feature component's local `useState`. Moving it here means an in-flight
// generation survives a tab switch (App.tsx remounts the routed feature on tab
// change), lets one feature seed another's input (the cross-feature pipeline),
// and gives the refine loop a place to live. Types + pure defaults only — no
// React, no provider imports — so this file stays cheap and in the main chunk.

import { axonometricPrompt, elevationPrompt, renderPrompt } from '../lib/prompts';
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

/** One-click scene choices that auto-assemble the prompt (P1 — no prompting for basics). */
export interface SceneOptions {
  materials: MaterialsKey;
  customMaterials: string; // used when materials === 'custom'
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
export interface ElevationSettings {
  face: 'Front' | 'Side' | 'Rear' | 'All';
  style: string; // line | rendered | shaded
  scene: SceneOptions;
}
export interface AxonSettings {
  viewpoints: string[]; // NE/NW/SE/SW
  section: boolean;
  scene: SceneOptions;
}

export type FeatureSettings = RenderSettings | ElevationSettings | AxonSettings;

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
}

function baseRun<S extends FeatureSettings>(settings: S, prompt: string): FeatureRun<S> {
  return {
    input: null,
    settings,
    mode: 'compose',
    refine: emptyRefine(),
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
    render: baseRun<RenderSettings>({ style: 'photoreal', variations: 2, scene: defaultScene() }, renderPrompt('photoreal')),
    elevation: baseRun<ElevationSettings>({ face: 'Front', style: 'rendered', scene: defaultScene() }, elevationPrompt('Front', 'rendered')),
    axonometric: baseRun<AxonSettings>({ viewpoints: ['NE'], section: false, scene }, axonometricPrompt(false)),
  };
}
