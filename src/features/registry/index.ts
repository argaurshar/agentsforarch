// THE feature registry — the single source of truth for every generation tool.
//
// Before this existed, adding one feature meant editing 15 places, and only 6 of
// them were compile-enforced: the other 9 (nav items, route slugs, output
// labels, batch expansion, pool groups, gallery labels, dashboard stages,
// examples, send-targets) failed SILENTLY. A feature could build clean, deploy,
// and be unreachable in the nav and mislabelled in its outputs.
//
// Everything is now derived from the definitions below. `REGISTRY` is declared
// `satisfies Record<FeatureKind, FeatureDef<...>>`, so a missing definition or a
// stray key is a build error, and every derived table maps over it.

import type { LucideIcon } from 'lucide-react';
import { Box, Boxes, Building2, Palette, PencilRuler, Sofa } from 'lucide-react';
import {
  buildAxonometricPrompt,
  buildElevationPrompt,
  buildInteriorPrompt,
  buildMoodboardPrompt,
  buildRenderPrompt,
} from '../../lib/prompts';
import { defaultScene } from '../../lib/scene';
import type { AspectRatio } from '../../providers/options';
import type { GenerateOptions, GenerateRequest } from '../../providers/types';
import type {
  AxonSettings,
  ElevationSettings,
  FeatureRun,
  FeatureSettings,
  InteriorSettings,
  MoodboardSettings,
  RenderSettings,
} from '../../store/generation';
import { baseRun } from '../../store/generation';
import type { FeatureMode } from '../../store/generation';
import type { CategoryKey, FeatureKind } from './keys';
import { FEATURE_KEYS } from './keys';

export * from './keys';

/** What a tool needs the user to supply before it can run. */
export type InputMode =
  | 'image' // exactly one image (today's only mode)
  | 'images' // one primary image plus up to `maxReferences` more
  | 'text' // no image at all — prose or coordinates
  | 'optional'; // an image helps but is not required

/** Context a prompt builder needs beyond its own settings. */
export interface PromptContext {
  /** A mood-board image is attached as a reference. */
  useMoodboard: boolean;
  /** A pooled output is attached as a style reference (reference-chaining). */
  useStyleRef: boolean;
}

/** A batch job: one output image, with the clause that distinguishes it. */
export interface FeatureJob {
  label: string;
  prompt: string;
}

export interface FeatureDef<S extends FeatureSettings = FeatureSettings> {
  key: FeatureKind;
  category: CategoryKey;
  /** Nav label. */
  name: string;
  /** Nav sub-label — the transformation in four words. */
  blurb: string;
  icon: LucideIcon;
  /** URL slug for `#/<slug>`. Defaults to `key` when omitted. */
  slug?: string;

  inputMode: InputMode;
  /** Extra reference images allowed beyond the primary input. */
  maxReferences: number;
  /** This tool wants a region marked on the input before running. */
  needsMarker: boolean;
  /** Output depends on real-world facts the model may get wrong. */
  accuracyWarning?: string;

  defaultSettings: S;
  buildPrompt: (settings: S, ctx: PromptContext) => string;
  /** Which SceneControls rows this tool's prompt actually reads. */
  sceneShow: Record<string, boolean>;
  /**
   * Pinned output ratio, when the transformation implies one. Typed to the
   * union the engines actually accept, so an illegal ratio is a build error
   * here rather than a runtime 400 mid-batch.
   */
  aspectRatio?: (settings: S) => AspectRatio | undefined;

  /** Cross-feature pipeline destinations offered on this tool's outputs. */
  sendTargets: FeatureKind[];
  /** Display group for the image pool / style-reference picker. */
  poolLabel: string;
  /** Gallery filter label. */
  galleryLabel: string;
  /** Shown on the home dashboard as a numbered pipeline stage. */
  stage?: { index: string; what: string };

  /**
   * One label per output image, in order. Omit for the default
   * "<Style> — variation N" behaviour.
   */
  labelsFor?: (req: GenerateRequest, pretty: (s: string | undefined, f: string) => string) => string[] | undefined;
  /**
   * Expand a request into per-image jobs. Omit for the default variations
   * behaviour. This is where per-face / per-viewpoint prompt clauses live —
   * they used to sit in `providers/shared.ts`, i.e. prompt text inside the
   * transport layer.
   */
  jobsFor?: (req: GenerateRequest, base: string, labels: string[]) => FeatureJob[] | undefined;

  /** Regexes `qa/verifyEngines.cjs` asserts against this tool's live prompt. */
  promptContracts: { name: string; pattern: RegExp }[];

  /**
   * Screen copy. Lives here rather than in the component so `<GenerationScreen>`
   * can render any tool without a bespoke file — and so the five screens stop
   * drifting apart, which they already had.
   */
  ui: {
    index: string;
    eyebrow: string;
    title: string;
    description: string;
    inputLabel: string;
    inputHint: string;
    outputCaption: string;
    emptyIcon: LucideIcon;
    emptyTitle: string;
    emptyDescription: string;
    /** Before/after slider labels. Omit to hide the comparison. */
    compare?: { before: string; after: string };
  };

  /** Why Generate is disabled, phrased for the user. `null` when it is enabled. */
  blockedReason?: (settings: S, hasInput: boolean, mode: FeatureMode) => string | null;
  /** Build the provider options for a run. */
  toOptions: (settings: S, ctx: RunContext) => GenerateOptions;
  /** How many output skeletons to show while running. */
  plannedCount?: (settings: S, mode: FeatureMode) => number;
}

/** What the shell knows about a run that the settings alone do not. */
export interface RunContext {
  refine: boolean;
  referenceImages?: string[];
  styleVariants?: { label: string; clause: string }[];
}

// --- Per-feature batch clauses ----------------------------------------------
// Moved out of providers/shared.ts: the transport layer should not carry prompt
// text, and at 54 tools an if-chain on `req.feature` in the provider is untenable.

const VIEWPOINT_FULL: Record<string, string> = {
  NE: 'north-east',
  NW: 'north-west',
  SE: 'south-east',
  SW: 'south-west',
};

// Side and rear must be RECONSTRUCTED — with a front-on input the model
// otherwise just redraws the front face again (verified live), so these clauses
// forbid that explicitly and say how to infer the unseen face.
const FACE_CLAUSE: Record<string, string> = {
  front: 'the front elevation — the face shown in the input image, viewed straight-on with no perspective',
  side:
    'NOT the face shown in the input image. First understand the building as a three-dimensional volume — infer its depth (front-to-back), its roof form and its materials from the face shown. ' +
    "Then draw ONLY the building's RIGHT SIDE face — the flank you would see standing to the right of the building, looking at it at 90 degrees to the input face. " +
    'This side face is a DIFFERENT drawing from the input: its width is the building’s front-to-back depth, it has no entry door and no garage door, and it shows fewer, smaller windows appropriate to a private flank, ' +
    'with the same material palette and roof lines carried around the corner',
  rear:
    'NOT the face shown in the input image. First understand the building as a three-dimensional volume — infer its depth, roof form and materials from the face shown. ' +
    'Then draw ONLY the building’s REAR face — the back of the building, directly opposite the input face, viewed straight-on from behind. ' +
    'This rear face is a DIFFERENT drawing from the input: no entry door and no garage door, typically larger glazing opening to the garden, ' +
    'with the same material palette and roof lines carried around the building',
};

// --- The definitions --------------------------------------------------------

const render: FeatureDef<RenderSettings> = {
  key: 'render',
  category: 'drawings',
  name: 'Isometric',
  blurb: 'Floor Plan to 3D',
  icon: PencilRuler,
  inputMode: 'image',
  maxReferences: 1,
  needsMarker: false,
  defaultSettings: { style: 'isometric', variations: 1, scene: defaultScene() },
  buildPrompt: (s, ctx) => buildRenderPrompt({ style: s.style, useStyleRef: ctx.useStyleRef, ...s.scene }),
  sceneShow: { archStyle: true },
  // An isometric of ANY plan is a ~4:3 landscape composition (the plan's own
  // width:depth cancels in the projection), so inheriting a portrait plan's
  // canvas pressured the model to compact the footprint. plan2d stays unpinned
  // — following the input is correct for a flat top-down view.
  aspectRatio: (s) => (s.style === 'isometric' ? '4:3' : undefined),
  sendTargets: ['elevation', 'axonometric'],
  poolLabel: 'Renders',
  galleryLabel: 'Isometric',
  stage: { index: '01', what: 'Floor plan → 3D cutaway' },
  ui: {
    index: '01',
    eyebrow: 'Plan to 3D Isometric · 2D Furnished Plan',
    title: 'Floor Plan → 3D Isometric',
    description:
      'Turn a 2D floor plan into a 3D isometric cutaway — or a fully furnished top-down 2D marketing plan. Upload directly — no prior step required.',
    inputLabel: 'Input',
    inputHint: '2D floor plan',
    outputCaption: 'Your generated view',
    emptyIcon: Boxes,
    emptyTitle: 'No isometric view yet',
    emptyDescription: 'Upload a floor plan and press Generate — your view appears here.',
    compare: { before: 'Plan', after: 'Isometric' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a floor plan to begin.'),
  toOptions: (s, ctx) => ({
    style: s.style,
    variations: 1,
    refine: ctx.refine || undefined,
    referenceImages: ctx.referenceImages,
    styleVariants: ctx.styleVariants,
  }),
  promptContracts: [
    { name: 'isometric prompt names the footprint', pattern: /outer wall silhouette/i },
    { name: 'isometric prompt forbids squaring off an irregular plan', pattern: /do NOT simplify an irregular footprint/i },
    { name: 'isometric prompt treats symbols as geometry', pattern: /GEOMETRY, NOT ANNOTATION/i },
    { name: 'isometric prompt strips plan labels', pattern: /no text or numbers anywhere/i },
  ],
};

const elevation: FeatureDef<ElevationSettings> = {
  key: 'elevation',
  category: 'drawings',
  name: 'Elevation',
  blurb: 'Sketch to Elevation',
  icon: Building2,
  inputMode: 'image',
  maxReferences: 1,
  needsMarker: false,
  defaultSettings: {
    face: 'Front',
    style: 'rendered',
    theme: 'none',
    styleSource: 'theme',
    moodboard: null,
    scene: defaultScene(),
  },
  buildPrompt: (s, ctx) =>
    buildElevationPrompt({
      face: s.face === 'All' ? null : s.face,
      style: s.style,
      materials: s.scene.materials,
      customMaterials: s.scene.customMaterials,
      lighting: s.scene.lighting,
      mood: s.scene.mood,
      theme: s.theme,
      useMoodboard: ctx.useMoodboard,
      useStyleRef: ctx.useStyleRef,
    }),
  sceneShow: { lighting: true, mood: true },
  sendTargets: ['axonometric'],
  poolLabel: 'Elevations',
  galleryLabel: 'Elevation',
  stage: { index: '02', what: 'Sketch → styled elevation' },
  labelsFor: (req, pretty) => {
    const faces = req.options.viewpoints?.length ? req.options.viewpoints : [undefined];
    const styleLabel = pretty(req.options.style, 'Rendered');
    return faces.map((face) => (face ? `${face} elevation — ${styleLabel}` : `${styleLabel} elevation`));
  },
  jobsFor: (req, base, labels) => {
    const faces = req.options.viewpoints?.length ? req.options.viewpoints : null;
    if (faces && faces.length > 1) {
      return faces.map((face, i) => ({
        label: labels[i],
        prompt: `${base}\n\nFace: ${
          FACE_CLAUSE[face.toLowerCase()] ?? `the ${face.toLowerCase()} elevation, viewed straight-on with no perspective`
        }.`,
      }));
    }
    return [{ label: labels[0], prompt: base }];
  },
  ui: {
    index: '02',
    eyebrow: 'Facade design',
    title: 'Sketch / Model → Elevation',
    description:
      'Produce an elevation design render from a sketch or SketchUp model. Works standalone — upload whatever you have.',
    inputLabel: 'Input',
    inputHint: 'Sketch or SketchUp screenshot',
    outputCaption: 'One image per selected face',
    emptyIcon: Building2,
    emptyTitle: 'No elevation yet',
    emptyDescription: 'Your elevation will appear here. Choose a face and style, then Generate.',
    compare: { before: 'Input', after: 'Elevation' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a sketch to begin.'),
  toOptions: (s, ctx) => ({
    style: s.style,
    viewpoints: s.face === 'All' ? ['Front', 'Side', 'Rear'] : [s.face],
    refine: ctx.refine || undefined,
    referenceImages: ctx.referenceImages,
  }),
  plannedCount: (s, mode) => (mode === 'refine' ? 1 : s.face === 'All' ? 3 : 1),
  promptContracts: [
    { name: 'elevation prompt grammar fixed', pattern: /elevation of the building shown in the input image/ },
    { name: 'elevation lighting scoped to the flat façade', pattern: /applied purely as illumination/ },
  ],
};

const axonometric: FeatureDef<AxonSettings> = {
  key: 'axonometric',
  category: 'drawings',
  name: 'Axonometric',
  blurb: 'Elevation to Axonometric',
  icon: Box,
  inputMode: 'image',
  maxReferences: 1,
  needsMarker: false,
  defaultSettings: { viewpoints: ['NE'], style: 'realistic', section: false, scene: defaultScene() },
  buildPrompt: (s) => buildAxonometricPrompt({ section: s.section, style: s.style }),
  // Deliberately none: this is a pure conversion of an already-rendered image,
  // so it must preserve the input's materials rather than restyle them.
  sceneShow: {},
  sendTargets: [],
  poolLabel: 'Axonometrics',
  galleryLabel: 'Axonometric',
  stage: { index: '03', what: 'Elevation → 3D view' },
  labelsFor: (req) => {
    const viewpoints = req.options.viewpoints?.length ? req.options.viewpoints : ['NE'];
    return viewpoints.map((vp) => `${vp} axonometric${req.options.section ? ' — section' : ''}`);
  },
  jobsFor: (req, base, labels) => {
    const viewpoints = req.options.viewpoints?.length ? req.options.viewpoints : ['NE'];
    return viewpoints.map((vp, i) => ({
      label: labels[i],
      prompt: `${base}\n\nViewpoint: ${VIEWPOINT_FULL[vp] ?? vp} axonometric.`,
    }));
  },
  ui: {
    index: '03',
    eyebrow: 'Drawing conversion',
    title: 'Elevation → Axonometric',
    description:
      'Generate axonometric and section-axonometric views from an elevation. Upload an elevation directly — running feature 02 first is never required.',
    inputLabel: 'Input',
    inputHint: 'Elevation drawing or render',
    outputCaption: 'One image per viewpoint',
    emptyIcon: Box,
    emptyTitle: 'No axonometric views yet',
    emptyDescription:
      'Upload an elevation, pick the corners you want and press Generate — one view appears here per viewpoint.',
    compare: { before: 'Elevation', after: 'Axonometric' },
  },
  blockedReason: (s, hasInput, mode) => {
    if (!hasInput) return 'Upload an elevation to begin.';
    if (mode !== 'refine' && s.viewpoints.length === 0) return 'Select at least one viewpoint.';
    return null;
  },
  toOptions: (s, ctx) =>
    ctx.refine
      ? { style: s.style, section: s.section, refine: true }
      : { viewpoints: s.viewpoints, style: s.style, section: s.section },
  plannedCount: (s, mode) => (mode === 'refine' ? 1 : Math.max(1, s.viewpoints.length)),
  promptContracts: [{ name: 'axonometric prompt forbids a flat front-on result', pattern: /do NOT reproduce a flat, front-on elevation/i }],
};

const interior: FeatureDef<InteriorSettings> = {
  key: 'interior',
  category: 'interiors',
  name: 'Interior',
  blurb: 'Room Photo to Design',
  icon: Sofa,
  inputMode: 'image',
  maxReferences: 1,
  needsMarker: false,
  defaultSettings: {
    mode: 'restyle',
    roomType: 'living',
    theme: 'contemporary',
    styleSource: 'theme',
    moodboard: null,
    scene: defaultScene(),
  },
  buildPrompt: (s, ctx) =>
    buildInteriorPrompt({
      mode: s.mode,
      roomType: s.roomType,
      theme: s.theme,
      useMoodboard: ctx.useMoodboard,
      useStyleRef: ctx.useStyleRef,
      mood: s.scene.mood,
    }),
  sceneShow: { mood: true },
  sendTargets: [],
  poolLabel: 'Interiors',
  galleryLabel: 'Interior',
  stage: { index: '04', what: 'Room photo → redesign' },
  labelsFor: (req, pretty) => [pretty(req.options.style, 'Interior')],
  ui: {
    index: '04',
    eyebrow: 'Interior Design',
    title: 'Room Photo → Interior Design',
    description:
      "Restyle a client's room, stage an empty one, or renovate — from a photo, in a chosen design style or from an uploaded mood board.",
    inputLabel: 'Input',
    inputHint: 'A phone photo works — shoot from a corner to capture the whole room.',
    outputCaption: 'Your redesigned room',
    emptyIcon: Sofa,
    emptyTitle: 'No redesign yet',
    emptyDescription: 'Your redesigned room will appear here. Upload a photo, pick a style, and Generate.',
    compare: { before: 'Room', after: 'Redesign' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a room photo to begin.'),
  toOptions: (s, ctx) => ({
    style: s.mode,
    refine: ctx.refine || undefined,
    referenceImages: ctx.referenceImages,
    styleVariants: ctx.styleVariants,
  }),
  promptContracts: [
    { name: 'interior prompt locks the shell', pattern: /LOCK THE SHELL/ },
    { name: 'interior prompt keeps blank walls blank', pattern: /A wall that is blank in the photo stays blank/ },
    { name: 'interior prompt audits the openings at the end', pattern: /opening by opening/ },
  ],
};

const moodboard: FeatureDef<MoodboardSettings> = {
  key: 'moodboard',
  category: 'boards',
  name: 'Mood Board',
  blurb: 'Image → Material Board',
  icon: Palette,
  inputMode: 'image',
  maxReferences: 0,
  needsMarker: false,
  defaultSettings: { aspect: '4:5' },
  buildPrompt: () => buildMoodboardPrompt(),
  sceneShow: {},
  aspectRatio: (s) => s.aspect,
  sendTargets: [],
  poolLabel: 'Material boards',
  galleryLabel: 'Material board',
  ui: {
    index: '05',
    eyebrow: 'Mood Board',
    title: 'Image → Material & Mood Board',
    description:
      'Upload any image — or pick one of your outputs — and generate a flat-lay material & mood board extracting its materials, colours, fabrics and vibe. Or compose a collage board from your outputs.',
    inputLabel: 'Input',
    inputHint: 'Any render, sketch or photo',
    outputCaption: 'Your material board',
    emptyIcon: Palette,
    emptyTitle: 'No board yet',
    emptyDescription: 'Upload an image and press Generate — the material board appears here.',
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload an image to begin.'),
  toOptions: (s) => ({ aspectRatio: s.aspect }),
  labelsFor: () => ['Material board'],
  promptContracts: [{ name: 'mood board prompt asks for a flat-lay material board', pattern: /MATERIAL & MOOD BOARD/ }],
};

/**
 * Every tool. `satisfies` makes exhaustiveness a build error in both
 * directions — a key with no definition, or a definition with no key.
 */
export const REGISTRY = {
  render,
  elevation,
  axonometric,
  interior,
  moodboard,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} satisfies Record<FeatureKind, FeatureDef<any>>;

/** The settings type belonging to one feature — replaces the N-way intersection. */
export type SettingsFor<K extends FeatureKind> = (typeof REGISTRY)[K]['defaultSettings'];

/** Live state for every feature, derived rather than hand-listed. */
export type GenerationState = { [K in FeatureKind]: FeatureRun<SettingsFor<K>> };

export const ALL_FEATURES: FeatureDef<FeatureSettings>[] = FEATURE_KEYS.map(
  (k) => REGISTRY[k] as unknown as FeatureDef<FeatureSettings>,
);

export function featureDef(key: FeatureKind): FeatureDef<FeatureSettings> {
  return REGISTRY[key] as unknown as FeatureDef<FeatureSettings>;
}

export function slugFor(key: FeatureKind): string {
  return REGISTRY[key].slug ?? key;
}

/** Seed state for every feature, built from each definition's own defaults. */
export function initialGeneration(): GenerationState {
  const ctx: PromptContext = { useMoodboard: false, useStyleRef: false };
  // Accumulate loosely, then narrow once. Writing `out[key]` directly into the
  // mapped type makes TS widen the value to an INTERSECTION of every feature's
  // settings, which nothing can satisfy — a known limitation of assigning
  // through a generic key, not a modelling mistake.
  const out: Record<string, FeatureRun<FeatureSettings>> = {};
  for (const key of FEATURE_KEYS) {
    const def = featureDef(key);
    const settings = structuredClone(def.defaultSettings);
    out[key] = baseRun(settings, def.buildPrompt(settings, ctx));
  }
  return out as GenerationState;
}
