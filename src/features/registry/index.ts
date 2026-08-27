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
import {
  Armchair,
  Box,
  Boxes,
  Building2,
  Camera,
  ClipboardList,
  DraftingCompass,
  Eraser,
  LayoutGrid,
  Lightbulb,
  Map,
  PaintRoller,
  Palette,
  PencilRuler,
  Replace,
  Sofa,
} from 'lucide-react';
import {
  buildAxonometricPrompt,
  buildElevationPrompt,
  buildInteriorPrompt,
  buildMoodboardPrompt,
  buildRenderPrompt,
} from '../../lib/prompts';
import { buildMassingPrompt } from '../../lib/prompt/concept';
import {
  buildDeclutterPrompt,
  buildPlaceObjectPrompt,
  buildSpecSheetPrompt,
  buildTargetedSwapPrompt,
} from '../../lib/prompt/interiors';
import { defaultScene } from '../../lib/scene';
import type { AspectRatio } from '../../providers/options';
import type { GenerateOptions, GenerateRequest } from '../../providers/types';
import type {
  AxonSettings,
  DeclutterSettings,
  ElevationSettings,
  PlaceObjectSettings,
  SpecSheetSettings,
  TargetedSwapSettings,
  FeatureRun,
  FeatureSettings,
  InteriorSettings,
  MassingSettings,
  MoodboardSettings,
  RenderSettings,
} from '../../store/generation';
import { baseRun } from '../../store/generation';
import type { FeatureMode } from '../../store/generation';
import type { CategoryKey, CategoryTab, FeatureKind } from './keys';
import { CATEGORY_BLURB, CATEGORY_KEYS, CATEGORY_LABEL, FEATURE_KEYS, categoryTab } from './keys';

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
  /** A red rectangle has been marked on the input and will be burned in.
   *  The prompt has to say so — an unexplained red box in the image is just
   *  something for the model to faithfully reproduce in its output. */
  hasMarker?: boolean;
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
  /**
   * Further images this tool needs in its OWN right, one entry per slot — not
   * style references. Positional: the prompt says "the SECOND image", so slot 0
   * is always that one, which is why this is an ordered list of labelled slots
   * rather than "up to N images".
   */
  extraInputs?: { label: string; hint: string }[];
  /**
   * Whether this tool offers a region marker, and whether it insists on one.
   *
   * `'required'` is structural — the tool cannot do anything without knowing
   * where. `'optional'` is an aid: it works from words alone, and the box makes
   * it more precise. The distinction matters because a required marker takes the
   * tool out of a batch run entirely, and an optional one does not.
   */
  marker?: 'required' | 'optional';
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

const massing: FeatureDef<MassingSettings> = {
  key: 'massing',
  category: 'concept',
  name: 'Massing Study',
  blurb: 'Brief to White Model',
  icon: Boxes,
  // The first tool with NO image input. Everything an uploaded drawing would
  // have told the model has to be said in words instead, which is why this
  // screen is a form rather than a dropzone.
  inputMode: 'text',
  maxReferences: 0,
  defaultSettings: { brief: '', siteSize: '', density: 'medium', storeys: '', context: '' },
  buildPrompt: (s) => buildMassingPrompt(s),
  sceneShow: {},
  // A massing model is photographed three-quarter aerial, which is a landscape
  // composition whatever the plot shape — there is no input canvas to inherit.
  aspectRatio: () => '3:2',
  sendTargets: ['render'],
  poolLabel: 'Massing studies',
  galleryLabel: 'Massing',
  ui: {
    index: '01',
    eyebrow: 'Concept & Form',
    title: 'Brief → Massing Study',
    description:
      'The first-morning question: how much building, arranged how, on this plot. Describe the brief and the site — no drawing needed — and get a white study model back.',
    inputLabel: 'Brief',
    inputHint: 'No image needed — this one generates from what you type',
    outputCaption: 'The massing model',
    emptyIcon: Boxes,
    emptyTitle: 'No massing study yet',
    emptyDescription: 'Describe the brief and press Generate — a white study model appears here.',
  },
  blockedReason: (s) => (s.brief.trim() ? null : 'Describe the project to begin.'),
  toOptions: (_s, ctx) => ({ variations: 1, refine: ctx.refine || undefined, referenceImages: ctx.referenceImages }),
  promptContracts: [
    { name: 'massing prompt refuses materials and glazing', pattern: /no materials, no brick, no timber, no glazing/i },
    { name: 'massing prompt asks for a white study model', pattern: /MASSING model, not a render/i },
    { name: 'massing prompt shows neighbouring context for scale', pattern: /lower-contrast grey blocks/i },
  ],
};

const render: FeatureDef<RenderSettings> = {
  key: 'render',
  category: 'drawings',
  name: 'Isometric',
  blurb: 'Floor Plan to 3D',
  icon: PencilRuler,
  inputMode: 'image',
  maxReferences: 1,
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
  icon: PaintRoller,
  inputMode: 'image',
  maxReferences: 1,
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

// --- The Interiors additions ------------------------------------------------

const declutter: FeatureDef<DeclutterSettings> = {
  key: 'declutter',
  category: 'interiors',
  name: 'Declutter',
  blurb: 'Messy Room to Empty Shell',
  icon: Eraser,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { keepBuiltIns: true },
  buildPrompt: (s) => buildDeclutterPrompt(s),
  sceneShow: {},
  sendTargets: ['interior'],
  poolLabel: 'Cleared rooms',
  galleryLabel: 'Declutter',
  ui: {
    index: '05',
    eyebrow: 'Interior Design',
    title: 'Messy Room → Empty Shell',
    description:
      'Strip a real room back to its bare architecture so it can be re-staged. Everything movable goes; the walls, windows, doors and finishes stay exactly as they are.',
    inputLabel: 'Input',
    inputHint: 'A photo of the room as it is now — clutter and all',
    outputCaption: 'The cleared room',
    emptyIcon: Eraser,
    emptyTitle: 'No cleared room yet',
    emptyDescription: 'Upload a room photo and press Generate — the emptied shell appears here, ready to stage.',
    compare: { before: 'As found', after: 'Cleared' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a room photo to begin.'),
  toOptions: (_s, ctx) => ({ style: 'declutter', refine: ctx.refine || undefined }),
  labelsFor: () => ['Cleared room'],
  promptContracts: [
    { name: 'declutter locks the shell', pattern: /LOCK THE SHELL/ },
    { name: 'declutter repairs surfaces rather than inventing them', pattern: /Do not invent a new floor or a feature wall/ },
    { name: 'declutter audits the openings at the end', pattern: /opening by opening/ },
  ],
};

const placeObject: FeatureDef<PlaceObjectSettings> = {
  key: 'placeObject',
  category: 'interiors',
  name: 'Place Object',
  blurb: 'Product Shot into Room',
  icon: Armchair,
  // The first tool that genuinely needs two images: the room, and the product.
  inputMode: 'images',
  maxReferences: 1,
  // Positional, and the prompt says so out loud: "the FIRST image… the SECOND".
  extraInputs: [
    { label: 'Input · the object', hint: 'A product shot of the exact item — plain background works best' },
  ],
  defaultSettings: { kind: 'furniture', placement: 'replace', target: '' },
  buildPrompt: (s) => buildPlaceObjectPrompt(s),
  sceneShow: {},
  sendTargets: [],
  poolLabel: 'Placed objects',
  galleryLabel: 'Place object',
  ui: {
    index: '06',
    eyebrow: 'Interior Design',
    title: 'Product Shot → Placed in the Room',
    description:
      'Put a specific product into a real room — a sofa, a pendant, a framed piece. It is that exact item, scaled and lit to the space, with nothing else touched.',
    inputLabel: 'Input · the room',
    inputHint: 'The room photo or render the object goes into',
    outputCaption: 'The room with the object placed',
    emptyIcon: Armchair,
    emptyTitle: 'Nothing placed yet',
    emptyDescription: 'Add a room photo and a product shot, say where it goes, and press Generate.',
    compare: { before: 'Room', after: 'With object' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload the room photo to begin.'),
  toOptions: (s, ctx) => ({ style: s.kind, refine: ctx.refine || undefined, referenceImages: ctx.referenceImages }),
  labelsFor: (req, pretty) => [pretty(req.options.style, 'Placed object')],
  promptContracts: [
    { name: 'place-object states there are two images', pattern: /TWO IMAGES ARE ATTACHED/ },
    { name: 'place-object demands the exact product, not its style', pattern: /not something in its style/ },
    { name: 'place-object locks the shell', pattern: /LOCK THE SHELL/ },
    { name: 'place-object changes nothing else', pattern: /Change NOTHING else/ },
  ],
};

const targetedSwap: FeatureDef<TargetedSwapSettings> = {
  key: 'targetedSwap',
  category: 'interiors',
  name: 'Targeted Edit',
  blurb: 'Change One Thing Only',
  icon: Replace,
  inputMode: 'image',
  maxReferences: 0,
  // Optional, not required: this tool works from words alone, and the box only
  // makes it more precise. A REQUIRED marker would take it out of batch runs.
  marker: 'optional',
  defaultSettings: { element: '', replacement: '' },
  buildPrompt: (s, ctx) => buildTargetedSwapPrompt({ ...s, marked: ctx.hasMarker }),
  sceneShow: {},
  sendTargets: [],
  poolLabel: 'Targeted edits',
  galleryLabel: 'Targeted edit',
  ui: {
    index: '07',
    eyebrow: 'Interior Design',
    title: 'Change One Thing, Leave the Rest',
    description:
      'Name one element and what it should become. Everything else in the image comes through untouched — the surgical alternative to re-running a whole render.',
    inputLabel: 'Input',
    inputHint: 'Any render or photo',
    outputCaption: 'The edited image',
    emptyIcon: Replace,
    emptyTitle: 'No edit yet',
    emptyDescription: 'Upload an image, name the element and its replacement, then Generate.',
    compare: { before: 'Before', after: 'After' },
  },
  blockedReason: (s, hasInput) => {
    if (!hasInput) return 'Upload an image to begin.';
    if (!s.element.trim()) return 'Name the element to change.';
    if (!s.replacement.trim()) return 'Say what it should become.';
    return null;
  },
  toOptions: (_s, ctx) => ({ style: 'edit', refine: ctx.refine || undefined }),
  labelsFor: () => ['Targeted edit'],
  promptContracts: [
    { name: 'targeted edit makes exactly one change', pattern: /Make ONE change/ },
    { name: 'targeted edit locks everything else', pattern: /LOCK EVERYTHING ELSE/ },
    { name: 'targeted edit forbids unrequested improvements', pattern: /Do not "improve" anything you were not asked to change/ },
  ],
};

const specSheet: FeatureDef<SpecSheetSettings> = {
  key: 'specSheet',
  category: 'interiors',
  name: 'FF&E Spec Sheet',
  blurb: 'Room to Component List',
  icon: ClipboardList,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { roomLabel: '' },
  buildPrompt: (s) => buildSpecSheetPrompt(s),
  sceneShow: {},
  aspectRatio: () => '4:5',
  sendTargets: [],
  poolLabel: 'Spec sheets',
  galleryLabel: 'Spec sheet',
  ui: {
    index: '08',
    eyebrow: 'Interior Design',
    title: 'Room → FF&E Spec Sheet',
    description:
      'Deconstruct a finished room into its kit of parts: every piece isolated on white, laid out and labelled with its material. The "shop the look" board, from a render you already have.',
    inputLabel: 'Input',
    inputHint: 'A finished interior render or photo',
    outputCaption: 'The component inventory',
    emptyIcon: ClipboardList,
    emptyTitle: 'No spec sheet yet',
    emptyDescription: 'Upload a finished interior and press Generate — its components appear here, labelled.',
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload an interior image to begin.'),
  toOptions: () => ({ style: 'specsheet' }),
  labelsFor: () => ['FF&E spec sheet'],
  promptContracts: [
    { name: 'spec sheet knolls onto white', pattern: /knolling-style flat-lay on a plain white background/ },
    { name: 'spec sheet inventories THIS room, not similar products', pattern: /not a mood board of similar products/ },
    { name: 'spec sheet labels beside items, never on them', pattern: /placed beside it — never on top of it/ },
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
  massing,
  render,
  elevation,
  axonometric,
  interior,
  declutter,
  placeObject,
  targetedSwap,
  specSheet,
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

// --- Categories -------------------------------------------------------------
//
// The sidebar used to be one row per tool. That was right at five and wrong at
// eleven — a flat list stops being scannable somewhere around a dozen rows, and
// this app is heading for ~54. Categories give the nav a fixed height: six rows
// forever, no matter how many tools land underneath them.
//
// Which categories EXIST is derived, not declared. A category with no tools does
// not appear at all, so "Site & Urban" arrives the day its first tool does
// rather than sitting in the nav as an empty promise — the same rule that makes
// a tool reachable by existing rather than by being remembered.

const CATEGORY_ICON: Record<CategoryKey, LucideIcon> = {
  concept: Lightbulb,
  drawings: DraftingCompass,
  site: Map,
  visualization: Camera,
  interiors: Sofa,
  boards: LayoutGrid,
};

export interface CategoryDef {
  key: CategoryKey;
  /** `cat:<key>` — this category's tab/route identity. */
  tab: CategoryTab;
  label: string;
  blurb: string;
  icon: LucideIcon;
  /** The tools in it, in registry order. Never empty. */
  features: FeatureDef<FeatureSettings>[];
}

/** Every category that currently holds at least one tool, in nav order. */
export const CATEGORIES: CategoryDef[] = CATEGORY_KEYS.map((key) => ({
  key,
  tab: categoryTab(key),
  label: CATEGORY_LABEL[key],
  blurb: CATEGORY_BLURB[key],
  icon: CATEGORY_ICON[key],
  features: ALL_FEATURES.filter((f) => f.category === key),
})).filter((c) => c.features.length > 0);

export function categoryDef(key: CategoryKey): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

/** The category a tool lives in. Total: every tool declares one, and a category
 *  is only in CATEGORIES because a tool put it there. */
export function categoryOf(feature: FeatureKind): CategoryDef {
  return CATEGORIES.find((c) => c.key === REGISTRY[feature].category) as CategoryDef;
}

// --- Running a tool ---------------------------------------------------------

/**
 * The provider request for one tool run.
 *
 * Extracted because there are now TWO callers — the single-tool screen and the
 * batch runner — and the pinned aspect ratio lives here. A batch that built its
 * own request would quietly drop `aspectRatio`, and the isometric would start
 * squaring off L-shaped plans again in batch mode only: a regression no type
 * and no snapshot could see.
 */
export function buildFeatureRequest(
  feature: FeatureKind,
  settings: FeatureSettings,
  args: { inputImages: string[]; prompt?: string; ctx: RunContext },
): GenerateRequest {
  const def = featureDef(feature);
  return {
    feature,
    inputImages: args.inputImages,
    prompt: args.prompt?.trim() || undefined,
    options: { ...def.toOptions(settings, args.ctx), aspectRatio: def.aspectRatio?.(settings) },
  };
}

/**
 * Why this tool cannot take part in a batch run, or null when it can.
 *
 * Two different reasons, and they are not interchangeable. A tool needing a
 * second image (`inputMode: 'images'`) or a marked region can NEVER run from the
 * shared dropzone — that is structural, and the card says "open the tool". A
 * tool whose own settings are incomplete (Targeted Edit with nothing named) is
 * merely not ready yet, and its own `blockedReason` already says so in the
 * user's language.
 */
export function batchBlockedReason(feature: FeatureKind, settings: FeatureSettings): string | null {
  const def = featureDef(feature);
  if (def.inputMode === 'images') return 'Needs a second image of its own — open the tool.';
  if (def.marker === 'required') return 'Needs a region marked on the input — open the tool.';
  if (def.inputMode === 'text') return 'Takes no image — open the tool.';
  return def.blockedReason?.(settings, true, 'compose') ?? null;
}
