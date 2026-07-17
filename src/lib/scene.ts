import type {
  ContextKey,
  LightingKey,
  MaterialsKey,
  MoodKey,
  SceneOptions,
  SeasonKey,
} from '../store/generation';

// The scene vocabulary that powers the one-click controls (P1). Each option
// maps a UI label to a Nano-Banana-tuned prompt fragment; the prompt builder in
// prompts.ts assembles the applicable fragments so an architect never has to
// write a prompt for a basic change (materials, lighting, season, mood,
// context, interior/exterior, people).

export interface SceneOpt {
  label: string;
  clause: string;
}

export const MATERIAL_PRESETS = {
  studio: {
    label: 'Concrete · oak · steel (studio default)',
    clause: 'board-formed concrete, warm oak slats, matte black steel, floor-to-ceiling low-iron glazing',
  },
  'brick-timber': {
    label: 'Brick · timber',
    clause: 'handmade waterstruck brick in warm russet tones, oiled timber cladding, bronze-framed openings',
  },
  'render-stone': {
    label: 'White render · stone',
    clause: 'smooth white lime render, honed limestone plinth and reveals, pale timber joinery',
  },
  'glass-steel': {
    label: 'Glass · steel',
    clause: 'full-height structural glazing, slender steel mullions, polished concrete floors',
  },
  custom: { label: 'Custom…', clause: '' },
} satisfies Record<MaterialsKey, SceneOpt>;

export const LIGHTING = {
  'golden-hour': { label: 'Golden hour', clause: 'golden-hour sun, long soft directional shadows, warm rim light, clear sky' },
  midday: { label: 'Midday', clause: 'bright midday daylight, crisp shadows, clear blue sky' },
  overcast: { label: 'Overcast', clause: 'soft overcast daylight, gentle diffuse shadows, an even flat sky' },
  dusk: { label: 'Dusk / blue hour', clause: 'dusk blue hour, deep blue sky, warm interior light glowing through the glazing' },
  night: { label: 'Night', clause: 'a night scene, dark sky, architectural lighting and warm interior glow reading against the dark' },
} satisfies Record<LightingKey, SceneOpt>;

export const SEASONS = {
  none: { label: 'Any', clause: '' },
  spring: { label: 'Spring', clause: 'fresh spring greenery and blossom' },
  summer: { label: 'Summer', clause: 'lush summer planting in full green foliage' },
  autumn: { label: 'Autumn', clause: 'autumnal foliage in warm amber and russet tones' },
  winter: { label: 'Winter', clause: 'bare winter trees, cool crisp air, a light dusting of frost' },
} satisfies Record<SeasonKey, SceneOpt>;

export const MOODS = {
  none: { label: 'Neutral', clause: '' },
  warm: { label: 'Warm', clause: 'a warm, inviting, human atmosphere' },
  minimal: { label: 'Minimal', clause: 'a calm, restrained, minimalist mood with quiet negative space' },
  dramatic: { label: 'Dramatic', clause: 'a dramatic, cinematic mood with strong contrast and depth' },
  soft: { label: 'Soft', clause: 'a soft, gentle, understated mood' },
} satisfies Record<MoodKey, SceneOpt>;

export const CONTEXTS = {
  none: { label: 'None', clause: '' },
  urban: { label: 'Urban street', clause: 'set on a quiet urban street with paving, street trees and neighbouring façades' },
  landscape: { label: 'Landscape / garden', clause: 'set within a landscaped garden with lawns, planting and mature trees' },
  waterfront: { label: 'Waterfront', clause: 'set on a waterfront with reflections on calm water' },
} satisfies Record<ContextKey, SceneOpt>;

/** The default scene — reproduces today's photoreal prompt (studio + golden hour, exterior). */
export function defaultScene(): SceneOptions {
  return {
    materials: 'studio',
    customMaterials: '',
    lighting: 'golden-hour',
    season: 'none',
    mood: 'none',
    context: 'none',
    setting: 'exterior',
    entourage: false,
  };
}

/** The materials fragment — resolves the free-text override when 'custom' is chosen. */
export function materialsClause(a: Pick<SceneOptions, 'materials' | 'customMaterials'>): string {
  if (a.materials === 'custom') return a.customMaterials.trim() || MATERIAL_PRESETS.studio.clause;
  return MATERIAL_PRESETS[a.materials].clause;
}
