import type {
  ArchStyleKey,
  ContextKey,
  ElevationThemeKey,
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

// Architectural design languages. The clause names the style and its signature
// moves so Nano Banana Pro reshapes massing, openings, materials and detailing
// to match — the architect picks a language instead of describing one. `none`
// keeps today's neutral behaviour; `custom` defers to the free-text field.
export const ARCH_STYLES = {
  none: { label: 'Studio default', clause: '' },
  contemporary: {
    label: 'Contemporary',
    clause:
      'clean contemporary architecture — crisp rectilinear volumes, large frameless glazing, flush detailing and an understated restrained palette',
  },
  bauhaus: {
    label: 'Bauhaus',
    clause:
      'Bauhaus modernist architecture — functional geometric massing, flat roofs, horizontal ribbon windows, smooth rendered white walls with occasional primary-colour accents, tubular steel and glass, no applied ornament',
  },
  indian: {
    label: 'Indian (contemporary vernacular)',
    clause:
      'contemporary Indian vernacular architecture — jaali perforated lattice screens, deep verandahs and projecting chajja sunshades, exposed brick and local stone, internal courtyards, carved timber and warm earthy tones',
  },
  brutalist: {
    label: 'Brutalist',
    clause:
      'Brutalist architecture — massive board-formed exposed concrete, bold monolithic geometry, deep recesses casting strong shadow, raw honest materials and a heavy sculptural presence',
  },
  minimalist: {
    label: 'Minimalist',
    clause:
      'minimalist architecture — pure clean volumes, a white and neutral palette, frameless glazing, hidden fixings and uncluttered restrained detailing with generous negative space',
  },
  mediterranean: {
    label: 'Mediterranean',
    clause:
      'Mediterranean architecture — whitewashed masonry, terracotta pitched roof tiles, arched openings, timber shutters and pergolas, courtyards with climbing planting',
  },
  scandinavian: {
    label: 'Scandinavian',
    clause:
      'Scandinavian architecture — pale timber cladding and white surfaces, simple pitched gable forms, large windows, warm minimal cosy interiors and a soft natural palette',
  },
  japanese: {
    label: 'Japanese',
    clause:
      'contemporary Japanese architecture — exposed timber structure, shoji-like screens and sliding partitions, low horizontal roofs with deep eaves, engawa verandas, restrained natural materials and a connection to a quiet garden',
  },
  artdeco: {
    label: 'Art Deco',
    clause:
      'Art Deco architecture — symmetrical stepped massing, strong vertical fluting, geometric ornamental motifs, rich materials with bronze, brass and marble accents',
  },
  custom: { label: 'Custom…', clause: '' },
} satisfies Record<ArchStyleKey, SceneOpt>;

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

// Design themes for a rendered elevation (Feature 02). The clause names the
// design language so Nano Banana Pro restyles the elevation's materials, colour
// and detailing to match; `none` keeps a neutral studio render.
export const ELEVATION_THEMES = {
  none: { label: 'Studio default', clause: '' },
  contemporary: {
    label: 'Contemporary',
    clause:
      'a contemporary design language — clean rectilinear composition, large frameless glazing, flush minimal detailing, and a restrained neutral palette of render, stone and timber',
  },
  modern: {
    label: 'Modern',
    clause:
      'a modern design language — bold simple volumes, strong horizontal emphasis, flat roofs, expanses of glass, smooth white render and dark metal accents',
  },
  traditional: {
    label: 'Traditional',
    clause:
      'a traditional design language — pitched and hipped roofs, symmetrical composition, moulded cornices and sills, timber joinery, natural stone and classical proportions',
  },
  boho: {
    label: 'Boho chic',
    clause:
      'a boho-chic design language — warm earthy tones, natural textures, arched openings, rattan, terracotta and timber accents, lime-washed walls, climbing planting and a relaxed eclectic character',
  },
} satisfies Record<ElevationThemeKey, SceneOpt>;

/** The elevation-theme fragment for the prompt builder. */
export function elevationThemeClause(theme: ElevationThemeKey): string {
  return ELEVATION_THEMES[theme].clause;
}

/** The default scene — reproduces today's photoreal prompt (studio + golden hour, exterior). */
export function defaultScene(): SceneOptions {
  return {
    materials: 'studio',
    customMaterials: '',
    archStyle: 'none',
    customArchStyle: '',
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

/** The architecture-style fragment — resolves the free-text override when 'custom' is chosen. */
export function archStyleClause(a: Pick<SceneOptions, 'archStyle' | 'customArchStyle'>): string {
  if (a.archStyle === 'custom') return a.customArchStyle.trim();
  return ARCH_STYLES[a.archStyle].clause;
}
