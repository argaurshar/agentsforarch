// THE feature registry — the single source of truth for every generation tool.
//
// Before this existed, adding one feature meant editing 15 places, and only 6 of
// them were compile-enforced: the other 9 (nav items, route slugs, output
// labels, batch expansion, pool groups, gallery labels, the tool index,
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
  Brush,
  Building,
  Building2,
  Camera,
  ClipboardList,
  Gem,
  DraftingCompass,
  Eraser,
  Layers,
  Layers3,
  LayoutGrid,
  LayoutPanelTop,
  Lightbulb,
  Maximize2,
  Map,
  PaintRoller,
  Palette,
  PenLine,
  PenTool,
  PencilRuler,
  Plane,
  Replace,
  Route,
  Rows3,
  Ruler,
  Users,
  Sofa,
  Sparkle,
  SquareSplitVertical,
  Sun,
  Undo2,
  Wand2,
} from 'lucide-react';
import {
  buildAxonometricPrompt,
  buildElevationPrompt,
  buildInteriorPrompt,
  buildMoodboardPrompt,
  buildRenderPrompt,
} from '../../lib/prompts';
import { buildMassingPrompt, buildSketchRenderPrompt } from '../../lib/prompt/concept';
import {
  buildAnnotationPrompt,
  buildExplodedAxonPrompt,
  buildProgramDiagramPrompt,
} from '../../lib/prompt/boards';
import {
  buildBirdsEyePrompt,
  buildFloorAnalysisPrompt,
  buildUrbanContextPrompt,
} from '../../lib/prompt/site';
import {
  buildAtmospherePrompt,
  buildFacadeMaterialPrompt,
  buildHumanScalePrompt,
  buildMultiViewPrompt,
  buildReflectionPrompt,
  buildRenderRefinePrompt,
  buildUpscalePrompt,
  buildWatercolourPrompt,
  buildWireframeRenderPrompt,
} from '../../lib/prompt/visualization';
import {
  buildCadElevationPrompt,
  buildRenderToPlanPrompt,
  buildSectionPrompt,
  buildSketchPlanPrompt,
} from '../../lib/prompt/drawings';
import {
  buildDeclutterPrompt,
  buildPlaceObjectPrompt,
  buildSpecSheetPrompt,
  buildTargetedSwapPrompt,
} from '../../lib/prompt/interiors';
import { LIGHTING, MATERIAL_PRESETS, MOODS, SEASONS, defaultScene } from '../../lib/scene';
import type { AspectRatio } from '../../providers/options';
import type { GenerateOptions, GenerateRequest } from '../../providers/types';
import type {
  AnnotationSettings,
  AxonSettings,
  BirdsEyeSettings,
  DeclutterSettings,
  ExplodedAxonSettings,
  FloorAnalysisSettings,
  ProgramDiagramSettings,
  SketchRenderSettings,
  UrbanContextSettings,
  WatercolourSettings,
  ElevationSettings,
  PlaceObjectSettings,
  SpecSheetSettings,
  TargetedSwapSettings,
  FeatureRun,
  FeatureSettings,
  CadElevationSettings,
  InteriorSettings,
  MassingSettings,
  AtmosphereSettings,
  FacadeMaterialSettings,
  HumanScaleSettings,
  MultiViewSettings,
  ReflectionSettings,
  RenderRefineSettings,
  RenderToPlanSettings,
  SectionSettings,
  SketchPlanSettings,
  UpscaleSettings,
  WireframeRenderSettings,
  MoodboardSettings,
  RenderSettings,
} from '../../store/generation';
import { baseRun } from '../../store/generation';
import type { FeatureMode } from '../../store/generation';
import type { CategoryKey, CategoryTab, FeatureKind, InputKind } from './keys';
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

/**
 * One axis of a tool worth changing without leaving the result.
 *
 * These are declared HERE rather than written into each tool's screen because
 * two surfaces now render them: the tool screen, and the front door's Tweak
 * sheet. Two hand-written copies of "Light: golden / overcast / midday" is the
 * parallel table this codebase keeps deleting — the second copy would be the
 * one that silently lost an option.
 *
 * It is deliberately a SHORTLIST, not every control. A tool's free-text fields,
 * scene sliders, extra dropzones and multi-selects stay on its own screen; what
 * belongs here is what someone re-runs to change after seeing a result. A tool
 * with nothing worth changing that way declares nothing, and its sheet says so.
 */
export type QuickAxis<S> =
  | {
      kind: 'choice';
      /** The settings key this patches. `keyof S` keeps a typo from compiling. */
      key: Extract<keyof S, string>;
      label: string;
      /** One line under the row. Worth writing when the choice has a cost. */
      hint?: string;
      /** A per-option `hint` replaces the axis hint while that option is
       *  selected. Several tools already worked this way — "the rear face is
       *  not in the input at all" is true of one choice, not of the axis — and
       *  flattening those into one static line would have made every hint
       *  hedge. */
      options: readonly { value: string; label: string; hint?: string }[];
    }
  | { kind: 'toggle'; key: Extract<keyof S, string>; label: string; hint: string };

/** `{ golden: { label: 'Golden hour' } }` → `[{ value: 'golden', label: '…' }]`.
 *  Derived from the scene vocabulary so a tool and the scene controls can never
 *  offer different options for the same axis. */
function vocab<K extends string>(o: Record<K, { label: string }>): { value: string; label: string }[] {
  return (Object.keys(o) as K[]).map((value) => ({ value, label: o[value].label }));
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

  /**
   * The action this tool performs, as a verb the user would use. The front door
   * shows cards, not tool names: "Make it 3D" is what somebody holding a plan
   * is trying to do, where "Isometric" is what the studio calls the output.
   * `name` stays for the nav, the gallery and the tool screen's own heading.
   */
  verb: string;
  /**
   * Which kinds of dropped image this tool can work on. Empty means it takes no
   * image at all, so it never appears among the cards for one.
   *
   * This is what turns thirty tools into a shortlist without anyone navigating
   * a category: the user answers "what do you have?" once, and every tool that
   * cannot take it disappears. Order does not matter; nav order still comes
   * from FEATURE_KEYS.
   */
  inputKind: InputKind[];
  /**
   * What this tool PRODUCES, so a result knows what it can become next.
   *
   * Chaining on the input's kind is wrong and was: a rendered elevation made
   * from a sketch is a `building`, and offering it the sketch tools again is
   * offering to do what was just done. `'same'` is for tools that change a
   * property without changing what the thing is — an upscale of a plan is
   * still a plan. `null` is for outputs the app has no input kind for: a
   * section, a sheet, a diagram, a board. Those are ends of a chain, and
   * saying so is more honest than pretending otherwise.
   */
  outputKind: InputKind | 'same' | null;

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
  /**
   * Shown ON the output: this tool had to infer something the input could not
   * show. A function of settings, because for several tools it is true only
   * sometimes — a rear elevation is reconstructed, the three visible faces are
   * not, and a static string would have to warn about all four or none.
   */
  accuracyWarning?: (settings: S) => string | undefined;

  defaultSettings: S;
  /**
   * The one to four axes worth changing from a result — rendered by the tool
   * screen AND by the front door's Tweak sheet, from this one declaration.
   * Omitted when a tool has nothing that fits (its controls are all free text,
   * or it has none at all).
   */
  quick?: QuickAxis<S>[];
  buildPrompt: (settings: S, ctx: PromptContext) => string;
  // `sceneShow` used to sit here: a Record<string, boolean> that thirty tools
  // filled in and NOTHING read. The screens that show scene controls pass their
  // own `show` object to <SceneControls> — sketchRender stated the same five
  // flags twice, once here and once in its component — so the registry copy was
  // a claim with no effect, free to drift from what the screen actually renders.
  // The alternative was wiring the shell to render SceneControls from this
  // field; that needs a runtime narrowing for the six tools whose settings carry
  // a `scene` and would reorder six screens, so it is a change of its own rather
  // than a side effect of deleting a lie.
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
  // `stage` used to sit here: `{ what: string }` on four of thirty tools,
  // feeding the home dashboard's numbered pipeline map. That dashboard is gone —
  // the front door is the way in, and the chain row tells the pipeline story
  // from what each tool actually PRODUCES (`outputKind`) rather than from a
  // hand-picked four. With its only reader deleted the field was write-only,
  // the same shape as `sceneShow` before it: a claim on the registry that
  // nothing could act on and nothing could contradict.

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

/**
 * The options a tool with no style axis and no reference images sends.
 *
 * Five definitions had this exact object literal copy-pasted, and in all five
 * the `referenceImages` pass-through was dead: they declare `maxReferences: 0`
 * and no screen supplies any. Naming it makes the reference-less contract
 * explicit rather than accidental.
 */
export function plainOptions(ctx: RunContext): GenerateOptions {
  return { variations: 1, refine: ctx.refine || undefined };
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
  verb: 'Model the brief',
  inputKind: [],
  outputKind: 'building',
  icon: Boxes,
  // The first tool with NO image input. Everything an uploaded drawing would
  // have told the model has to be said in words instead, which is why this
  // screen is a form rather than a dropzone.
  inputMode: 'text',
  maxReferences: 0,
  defaultSettings: { brief: '', siteSize: '', density: 'medium', storeys: '', context: '' },
  quick: [
    {
      kind: 'choice',
      key: 'density',
      label: 'Density',
      options: [
        { value: 'low', label: 'Low-rise' },
        { value: 'medium', label: 'Mid-rise' },
        { value: 'high', label: 'High-density' },
      ],
    },
  ],
  buildPrompt: (s) => buildMassingPrompt(s),
  // A massing model is photographed three-quarter aerial, which is a landscape
  // composition whatever the plot shape — there is no input canvas to inherit.
  aspectRatio: () => '3:2',
  sendTargets: ['render'],
  poolLabel: 'Massing studies',
  galleryLabel: 'Massing',
  ui: {
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
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'massing prompt refuses materials and glazing', pattern: /no materials, no brick, no timber, no glazing/i },
    { name: 'massing prompt asks for a white study model', pattern: /MASSING model, not a render/i },
    { name: 'massing prompt shows neighbouring context for scale', pattern: /lower-contrast grey blocks/i },
  ],
};

const sketchRender: FeatureDef<SketchRenderSettings> = {
  key: 'sketchRender',
  category: 'concept',
  name: 'Sketch to Render',
  blurb: 'Hand Sketch to Finished Image',
  verb: 'Finish the sketch',
  inputKind: ['sketch'],
  outputKind: 'building',
  icon: Wand2,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { medium: 'illustration', subject: '', scene: defaultScene() },
  quick: [
    {
      kind: 'choice',
      key: 'medium',
      label: 'Finish',
      hint: 'Hybrid keeps your own linework visible over the colour — the closest thing to a sketch that has been painted rather than replaced.',
      options: [
        { value: 'illustration', label: 'Illustration' },
        { value: 'photoreal', label: 'Photoreal' },
        { value: 'hybrid', label: 'Hybrid' },
      ],
    },
  ],
  buildPrompt: (s) => buildSketchRenderPrompt({ ...s.scene, medium: s.medium, subject: s.subject }),
  // Deliberately unpinned. The sketch's own crop IS the composition the
  // architect drew, and the prompt locks the viewpoint to it — pinning a ratio
  // here would fight the instruction three sentences later.
  sendTargets: ['render', 'moodboard'],
  poolLabel: 'Sketch renders',
  galleryLabel: 'Sketch render',
  ui: {
    eyebrow: 'Concept & Form',
    title: 'Hand Sketch → Finished Image',
    description:
      'The napkin drawing, made presentable. Same viewpoint, same masses, same idea — resolved into an illustration or a render, with nothing invented that you did not draw.',
    inputLabel: 'Input',
    inputHint: 'A photo or scan of the sketch',
    outputCaption: 'The resolved sketch',
    emptyIcon: Wand2,
    emptyTitle: 'Nothing resolved yet',
    emptyDescription: 'Upload a sketch and press Generate — the finished image appears here.',
    compare: { before: 'Sketch', after: 'Resolved' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a sketch to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'sketch-render locks the drawing', pattern: /LOCK THE DRAWING/ },
    { name: 'sketch-render forbids invented geometry', pattern: /no extra wing, tower, canopy, balcony, storey or second building/ },
    { name: 'sketch-render refuses to improve the massing', pattern: /do not rebalance the massing/ },
    { name: 'sketch-render resolves ambiguity downward', pattern: /the simplest way rather than the most impressive one/ },
  ],
};

const render: FeatureDef<RenderSettings> = {
  key: 'render',
  category: 'drawings',
  name: 'Isometric',
  blurb: 'Floor Plan to 3D',
  verb: 'Make it 3D',
  inputKind: ['plan'],
  outputKind: 'model',
  icon: PencilRuler,
  inputMode: 'image',
  maxReferences: 1,
  defaultSettings: { style: 'isometric', variations: 1, scene: defaultScene() },
  quick: [
    {
      kind: 'choice',
      key: 'style',
      label: 'Output view',
      options: [
        { value: 'isometric', label: '3D isometric' },
        { value: 'plan2d', label: '2D furnished plan' },
      ],
    },
  ],
  buildPrompt: (s, ctx) => buildRenderPrompt({ style: s.style, useStyleRef: ctx.useStyleRef, ...s.scene }),
  // An isometric of ANY plan is a ~4:3 landscape composition (the plan's own
  // width:depth cancels in the projection), so inheriting a portrait plan's
  // canvas pressured the model to compact the footprint. plan2d stays unpinned
  // — following the input is correct for a flat top-down view.
  aspectRatio: (s) => (s.style === 'isometric' ? '4:3' : undefined),
  sendTargets: ['elevation', 'axonometric'],
  poolLabel: 'Renders',
  galleryLabel: 'Isometric',
  ui: {
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

const sketchPlan: FeatureDef<SketchPlanSettings> = {
  key: 'sketchPlan',
  category: 'drawings',
  name: 'Sketch to CAD Plan',
  blurb: 'Napkin Sketch to Drawing',
  verb: 'Draw it up',
  inputKind: ['sketch', 'plan'],
  outputKind: 'plan',
  icon: PenLine,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { annotation: 'none', units: 'metric', furnished: false },
  quick: [
    {
      kind: 'toggle',
      key: 'furnished',
      label: 'Include fixtures',
      hint: 'Sanitary ware, kitchen counters, beds and the stair, as plan symbols.',
    },
  ],
  buildPrompt: (s) => buildSketchPlanPrompt(s),
  // A drawn-up plan follows the sketch's own proportions — pinning a ratio here
  // would be the isometric bug in reverse, squeezing a long plan into a square.
  sendTargets: ['render', 'section'],
  poolLabel: 'CAD plans',
  galleryLabel: 'CAD plan',
  ui: {
    eyebrow: 'Plans & Drawings',
    title: 'Hand Sketch → CAD Plan',
    description:
      'Draw up a rough sketch as a precise 2D plan — squared corners, poché walls, swing arcs. It draws up what you sketched; it does not redesign it.',
    inputLabel: 'Input',
    inputHint: 'A hand-drawn plan — napkin sketch, marker on trace, anything legible',
    outputCaption: 'The drawn-up plan',
    emptyIcon: PenLine,
    emptyTitle: 'No plan drawn up yet',
    emptyDescription: 'Upload a sketch and press Generate — the CAD plan appears here.',
    compare: { before: 'Sketch', after: 'Plan' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a sketch to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'sketch plan keeps the sketch topology, not its literal outline', pattern: /Keep the outline’s topology exactly/ },
    { name: 'sketch plan straightens without reshaping', pattern: /straightening those lines, NOT reshaping the plan/ },
    { name: 'sketch plan draws up rather than redesigns', pattern: /not redesigning it/i },
    { name: 'sketch plan uses CAD conventions', pattern: /quarter-circle swing arc/i },
    { name: 'sketch plan forbids perspective', pattern: /no vanishing point/i },
  ],
};

const cadElevation: FeatureDef<CadElevationSettings> = {
  key: 'cadElevation',
  category: 'drawings',
  name: 'CAD Elevation',
  blurb: '3D Model to Line Drawing',
  verb: 'Measure an elevation',
  inputKind: ['model', 'building'],
  outputKind: 'building',
  icon: Ruler,
  inputMode: 'image',
  maxReferences: 0,
  accuracyWarning: (s) =>
    s.face === 'rear'
      ? 'The rear face is not in the input image — it is reconstructed from the volume, roof form and materials that are. Treat its openings as a proposal, not a survey.'
      : undefined,
  defaultSettings: { face: 'front', annotation: 'none', units: 'metric', hatch: true },
  quick: [
    {
      kind: 'choice',
      key: 'face',
      label: 'Which face',
      options: [
        { value: 'front', label: 'Facing camera', hint: 'Drawn from what the input shows, flattened.' },
        { value: 'left', label: 'Left', hint: 'The flank on the left of the view, turned square-on.' },
        { value: 'right', label: 'Right', hint: 'The flank on the right of the view, turned square-on.' },
        {
          value: 'rear',
          label: 'Rear',
          hint: 'Not visible in the input — reconstructed from the volume, roof form and materials that are.',
        },
      ],
    },
    {
      kind: 'toggle',
      key: 'hatch',
      label: 'Material hatching',
      hint: 'Conventional flat hatching for brick, render, stone and glazing.',
    },
  ],
  buildPrompt: (s) => buildCadElevationPrompt(s),
  // The input is a 3D viewport of any shape; the output is one flat facade.
  // Inheriting the screenshot's canvas is the pressure that squashed L-shaped
  // plans into the isometric frame, pointed at an elevation instead.
  aspectRatio: () => '3:2',
  sendTargets: ['axonometric'],
  poolLabel: 'CAD elevations',
  galleryLabel: 'CAD elevation',
  ui: {
    eyebrow: 'Plans & Drawings',
    title: '3D Model → CAD Elevation',
    description:
      'The measured line elevation that goes in the drawing set — not a render. Takes a viewport screenshot and flattens the perspective out of it.',
    inputLabel: 'Input',
    inputHint: 'A SketchUp, Revit or Rhino viewport screenshot — or any 3D view',
    outputCaption: 'The elevation drawing',
    emptyIcon: Ruler,
    emptyTitle: 'No elevation drawing yet',
    emptyDescription: 'Upload a 3D view and press Generate — the flattened elevation appears here.',
    compare: { before: '3D view', after: 'Elevation' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a 3D view to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'CAD elevation flattens the perspective', pattern: /UNDO THE PERSPECTIVE/ },
    { name: 'CAD elevation shows one face only', pattern: /this is one flat face and nothing else/i },
    { name: 'CAD elevation tests itself for leftover 3D', pattern: /if the roof line slopes when it should be level/i },
  ],
};

const section: FeatureDef<SectionSettings> = {
  key: 'section',
  category: 'drawings',
  name: 'Section',
  blurb: 'Cut Through the Building',
  verb: 'Cut a section',
  inputKind: ['plan', 'model', 'building'],
  outputKind: null,
  icon: SquareSplitVertical,
  inputMode: 'image',
  maxReferences: 0,
  accuracyWarning: (s) =>
    s.levels.trim()
      ? undefined
      : 'Nothing here says how tall the building is — a plan cannot show it and one view rarely can, so the storey heights and roof form are the model’s guess. Fill in "Storeys and levels" to pin them down.',
  defaultSettings: { axis: 'longitudinal', style: 'line', levels: '', entourage: true, annotation: 'none', units: 'metric' },
  quick: [
    {
      kind: 'choice',
      key: 'axis',
      label: 'Cut direction',
      options: [
        { value: 'longitudinal', label: 'Along the long axis' },
        { value: 'cross', label: 'Across the short axis' },
      ],
    },
    {
      kind: 'choice',
      key: 'style',
      label: 'Style',
      options: [
        { value: 'line', label: 'Line drawing' },
        { value: 'shaded', label: 'Shaded' },
      ],
    },
    {
      kind: 'toggle',
      key: 'entourage',
      label: 'People and furniture',
      hint: 'Light outlines inside the rooms, so ceiling heights read at a glance.',
    },
  ],
  buildPrompt: (s) => buildSectionPrompt(s),
  // A section is a wide drawing whatever the building — it spans the full length
  // or width and is only ever a couple of storeys tall.
  aspectRatio: () => '3:2',
  sendTargets: [],
  poolLabel: 'Sections',
  galleryLabel: 'Section',
  ui: {
    eyebrow: 'Plans & Drawings',
    title: 'Architectural Section',
    description:
      'Saw the building in half and look straight into it — floor slabs in poché, the stair, real ceiling heights. The drawing that explains how a scheme actually works.',
    inputLabel: 'Input',
    inputHint: 'A 3D view, a render or a floor plan of the building',
    outputCaption: 'The section drawing',
    emptyIcon: SquareSplitVertical,
    emptyTitle: 'No section yet',
    emptyDescription: 'Upload the building and press Generate — the section appears here.',
    compare: { before: 'Input', after: 'Section' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload the building to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'section describes the cut physically, not by name', pattern: /sawn straight through/i },
    { name: 'section says it is not an elevation', pattern: /NOT an elevation/ },
    { name: 'section fills the cut with poché', pattern: /solid, heavy, filled poch/i },
    { name: 'section ends on a concrete elevation test', pattern: /you have drawn an elevation/i },
  ],
};

const renderToPlan: FeatureDef<RenderToPlanSettings> = {
  key: 'renderToPlan',
  category: 'drawings',
  name: 'Render to Plan',
  blurb: '3D View Back to Plan',
  verb: 'Get the floor plan',
  inputKind: ['building', 'model', 'room'],
  outputKind: 'plan',
  icon: Undo2,
  inputMode: 'image',
  maxReferences: 0,
  // The only tool in this category that must INVENT: one viewpoint cannot show a
  // whole plan, so part of the output is inference presented as drawing.
  accuracyWarning: () =>
    'A plan reverse-engineered from one view is part measurement, part inference. Everything the image could not see is the model’s plainest guess — check it against the real thing before drawing on it.',
  defaultSettings: { annotation: 'none', units: 'metric', furnished: false },
  quick: [
    {
      kind: 'toggle',
      key: 'furnished',
      label: 'Include furniture',
      hint: 'Plan symbols for what the view shows in each room.',
    },
  ],
  buildPrompt: (s) => buildRenderToPlanPrompt(s),
  // Same reason: a plan derived from a 16:9 render must not be generated into a
  // 16:9 frame, because the building's footprint has nothing to do with the
  // camera the render used.
  aspectRatio: () => '4:3',
  sendTargets: ['render', 'section'],
  poolLabel: 'Derived plans',
  galleryLabel: 'Derived plan',
  ui: {
    eyebrow: 'Plans & Drawings',
    title: '3D View → Floor Plan',
    description:
      'Run the pipeline backwards: recover the floor plan implied by a render or a photograph. Useful when the visual exists and the drawing does not.',
    inputLabel: 'Input',
    inputHint: 'A render, a 3D view or a photograph of the building or room',
    outputCaption: 'The derived plan',
    emptyIcon: Undo2,
    emptyTitle: 'No derived plan yet',
    emptyDescription: 'Upload a render and press Generate — the plan it implies appears here.',
    compare: { before: 'View', after: 'Plan' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a render or photo to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'render-to-plan undoes the perspective', pattern: /UNDO THE PERSPECTIVE/ },
    { name: 'render-to-plan is honest about what it cannot see', pattern: /BE HONEST ABOUT WHAT YOU CANNOT SEE/ },
    { name: 'render-to-plan keeps its guesses plain', pattern: /A plain guess is correct here; an interesting one is not/ },
  ],
};

const elevation: FeatureDef<ElevationSettings> = {
  key: 'elevation',
  category: 'drawings',
  name: 'Elevation',
  blurb: 'Sketch to Elevation',
  verb: 'Render an elevation',
  inputKind: ['sketch', 'model'],
  outputKind: 'building',
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
  quick: [
    {
      kind: 'choice',
      key: 'face',
      label: 'Elevation type',
      options: [
        { value: 'Front', label: 'Front' },
        { value: 'Side', label: 'Side' },
        { value: 'Rear', label: 'Rear' },
        { value: 'All', label: 'All faces' },
      ],
    },
    {
      kind: 'choice',
      key: 'style',
      label: 'Style',
      options: [
        { value: 'line', label: 'Line' },
        { value: 'rendered', label: 'Rendered' },
        { value: 'shaded', label: 'Shaded' },
      ],
    },
  ],
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
  sendTargets: ['axonometric'],
  poolLabel: 'Elevations',
  galleryLabel: 'Elevation',
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
  blurb: 'Elevation or 3D to Axonometric',
  verb: 'Turn it axonometric',
  inputKind: ['building', 'model'],
  outputKind: 'model',
  icon: Box,
  inputMode: 'image',
  maxReferences: 1,
  defaultSettings: { source: 'elevation', viewpoints: ['NE'], style: 'realistic', section: false, scene: defaultScene() },
  quick: [
    {
      kind: 'choice',
      key: 'source',
      label: 'Built from',
      options: [
        {
          value: 'elevation',
          label: 'An elevation',
          hint: 'An elevation shows one face, so the depth and roof behind it are inferred — the output says so.',
        },
        {
          value: 'model',
          label: 'A 3D model',
          hint: 'A viewport screenshot already carries the depth. This flattens the perspective instead of guessing.',
        },
      ],
    },
    {
      kind: 'choice',
      key: 'style',
      label: 'Axonometric style',
      options: [
        { value: 'realistic', label: 'Realistic render' },
        { value: 'lineart', label: 'Line art' },
        { value: 'bw', label: 'Black & white lines' },
      ],
    },
    {
      kind: 'toggle',
      key: 'section',
      label: 'Section axonometric',
      hint: 'Adds a cut plane and labels views \u201c\u2014 section\u201d.',
    },
  ],
  buildPrompt: (s) => buildAxonometricPrompt({ section: s.section, style: s.style, source: s.source }),
  // Only the elevation branch is guessing. A modelled viewport carries the depth
  // the drawing needs, so warning about it there would be a warning the user
  // learns to ignore — which is how a real warning stops working.
  accuracyWarning: (s) =>
    s.source === 'elevation'
      ? 'An elevation cannot show depth, so the returning walls and roof form are inferred. Check them against the design.'
      : undefined,
  // Deliberately none: this is a pure conversion of an already-rendered image,
  // so it must preserve the input's materials rather than restyle them.
  sendTargets: [],
  poolLabel: 'Axonometrics',
  galleryLabel: 'Axonometric',
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
    eyebrow: 'Drawing conversion',
    title: 'Elevation or 3D Model → Axonometric',
    description:
      'Axonometric and section-axonometric views from either an elevation or a 3D viewport screenshot. Say which — from an elevation the depth is inferred, from a model it is read off the image, and the two are different jobs.',
    inputLabel: 'Input',
    inputHint: 'An elevation, or a SketchUp / Revit / Rhino screenshot',
    outputCaption: 'One image per viewpoint',
    emptyIcon: Box,
    emptyTitle: 'No axonometric views yet',
    emptyDescription:
      'Upload an elevation or a 3D view, pick the corners you want and press Generate — one view appears here per viewpoint.',
    compare: { before: 'Input', after: 'Axonometric' },
  },
  blockedReason: (s, hasInput, mode) => {
    if (!hasInput) return 'Upload an elevation or a 3D view to begin.';
    if (mode !== 'refine' && s.viewpoints.length === 0) return 'Select at least one viewpoint.';
    return null;
  },
  toOptions: (s, ctx) =>
    ctx.refine
      ? { style: s.style, section: s.section, refine: true }
      : { viewpoints: s.viewpoints, style: s.style, section: s.section },
  plannedCount: (s, mode) => (mode === 'refine' ? 1 : Math.max(1, s.viewpoints.length)),
  promptContracts: [
    { name: 'axonometric prompt forbids a flat front-on result', pattern: /do NOT reproduce a flat, front-on elevation/i },
    { name: 'axonometric prompt holds parallel projection', pattern: /no perspective distortion and no vanishing point/ },
    { name: 'from an elevation it infers only the depth', pattern: /INFER THE DEPTH, AND ONLY THE DEPTH/ },
  ],
};

const watercolour: FeatureDef<WatercolourSettings> = {
  key: 'watercolour',
  category: 'visualization',
  name: 'Watercolour Sketch',
  blurb: 'Render to Painted Illustration',
  verb: 'Paint it',
  inputKind: ['building', 'room', 'sketch'],
  outputKind: 'same',
  icon: Brush,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { palette: 'warm', loose: true, keepLines: true },
  quick: [
    {
      kind: 'choice',
      key: 'palette',
      label: 'Palette',
      options: [
        { value: 'warm', label: 'Warm' },
        { value: 'cool', label: 'Cool' },
        { value: 'muted', label: 'Muted' },
        { value: 'monochrome', label: 'Monochrome' },
      ],
    },
    { kind: 'toggle', key: 'loose', label: 'Loose washes', hint: 'Bleeding edges and pooling pigment. The paint gets to be loose; the building does not.' },
    { kind: 'toggle', key: 'keepLines', label: 'Ink line over the paint', hint: 'Off leaves the form described by the washes alone — softer, and harder to read at small sizes.' },
  ],
  buildPrompt: (s) => buildWatercolourPrompt(s),
  sendTargets: ['moodboard'],
  poolLabel: 'Watercolours',
  galleryLabel: 'Watercolour',
  ui: {
    eyebrow: 'Visualization',
    title: 'Render → Watercolour',
    description:
      'The same building, painted. Useful precisely because it looks unfinished — a watercolour invites comment on the idea, where a photoreal render invites argument about the brick.',
    inputLabel: 'Input',
    inputHint: 'A render, elevation or photograph',
    outputCaption: 'The painting',
    emptyIcon: Brush,
    emptyTitle: 'Nothing painted yet',
    emptyDescription: 'Upload an image and press Generate — the watercolour appears here.',
    compare: { before: 'Render', after: 'Watercolour' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload an image to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'watercolour changes only the medium', pattern: /LOCK EVERYTHING EXCEPT the medium it is painted in/ },
    { name: 'watercolour keeps looseness off the geometry', pattern: /looseness is a property of the paint, not of the building/ },
    { name: 'watercolour refuses a filter', pattern: /paint on paper, not as a photograph with a filter over it/ },
  ],
};

const interior: FeatureDef<InteriorSettings> = {
  key: 'interior',
  category: 'interiors',
  name: 'Interior',
  blurb: 'Room Photo to Design',
  verb: 'Redesign it',
  inputKind: ['room'],
  outputKind: 'room',
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
  quick: [
    {
      kind: 'choice',
      key: 'mode',
      label: 'Mode',
      options: [
        {
          value: 'restyle',
          label: 'Restyle',
          hint: 'Keeps the room\u2019s architecture; replaces furniture, finishes and décor in the new style.',
        },
        {
          value: 'stage',
          label: 'Stage (furnish empty room)',
          hint: 'Furnishes a bare room with movable pieces only — walls, windows, doors, finishes and camera stay untouched.',
        },
        {
          value: 'renovate',
          label: 'Renovate',
          hint: 'Bigger changes allowed: finishes, flooring, ceiling and fixtures may be replaced.',
        },
      ],
    },
  ],
  buildPrompt: (s, ctx) =>
    buildInteriorPrompt({
      mode: s.mode,
      roomType: s.roomType,
      theme: s.theme,
      useMoodboard: ctx.useMoodboard,
      useStyleRef: ctx.useStyleRef,
      mood: s.scene.mood,
    }),
  sendTargets: [],
  poolLabel: 'Interiors',
  galleryLabel: 'Interior',
  labelsFor: (req, pretty) => [pretty(req.options.style, 'Interior')],
  ui: {
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
  verb: 'Empty it',
  inputKind: ['room'],
  outputKind: 'room',
  icon: Eraser,
  inputMode: 'image',
  maxReferences: 0,
  // Live run 12: the strip-out itself was flawless — every movable object gone,
  // the radiator, the skirting and even the wall blemishes preserved — but the
  // camera swung to straight-on and a single casement came back as three panes.
  // The prompt already carries the strongest lock language in the app ("keep
  // the camera position, the lens and the crop exactly as shown", and a closing
  // opening-by-opening re-check). It was not enough. Writing MORE lock language
  // is not the fix; saying so on the output is, because a user comparing a
  // before and after needs to know the geometry is not evidence.
  accuracyWarning: () =>
    'Check the shell against your photo before you rely on this. Emptying a room is reliable; holding the camera and '
    + 'the window sizes exactly is not, and a cleared room that quietly gained a wider window still looks convincing.',
  defaultSettings: { keepBuiltIns: true },
  quick: [
    {
      kind: 'toggle',
      key: 'keepBuiltIns',
      label: 'Keep fitted joinery',
      hint: 'On: wardrobes, kitchen units and fixed shelving stay. Off: a full strip-out to bare walls.',
    },
  ],
  buildPrompt: (s) => buildDeclutterPrompt(s),
  sendTargets: ['interior'],
  poolLabel: 'Cleared rooms',
  galleryLabel: 'Declutter',
  ui: {
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
    // Order, not just presence. Live run 12 failed because the closing audit
    // checked openings and never mentioned the camera — and a moved camera is
    // what forces the walls to be redrawn in the first place. This asserts the
    // camera is checked FIRST and the openings only after it matches, so a later
    // edit cannot quietly demote it back to an also-ran.
    {
      name: 'declutter audits the camera BEFORE the openings',
      pattern: /FIRST, the camera[\s\S]*SECOND, and only once the camera matches[\s\S]*opening by opening/,
    },
  ],
};

const placeObject: FeatureDef<PlaceObjectSettings> = {
  key: 'placeObject',
  category: 'interiors',
  name: 'Place Object',
  blurb: 'Product Shot into Room',
  verb: 'Place a product',
  inputKind: ['room'],
  outputKind: 'room',
  icon: Armchair,
  // The first tool that genuinely needs two images: the room, and the product.
  inputMode: 'images',
  maxReferences: 1,
  // Positional, and the prompt says so out loud: "the FIRST image… the SECOND".
  extraInputs: [
    { label: 'Input · the object', hint: 'A product shot of the exact item — plain background works best' },
  ],
  defaultSettings: { kind: 'furniture', placement: 'replace', target: '' },
  quick: [
    {
      kind: 'choice',
      key: 'kind',
      label: 'Object type',
      options: [
        {
          value: 'furniture',
          label: 'Furniture',
          hint: 'Grounded with a contact shadow and correct occlusion against what is already there.',
        },
        {
          value: 'lighting',
          label: 'Light fitting',
          hint: 'Placed switched ON — its light falls on the surrounding ceiling, walls and furniture.',
        },
        { value: 'artwork', label: 'Artwork', hint: 'Mounted flat to the wall plane in correct perspective, wall finish untouched.' },
      ],
    },
    {
      kind: 'choice',
      key: 'placement',
      label: 'Placement',
      options: [
        { value: 'replace', label: 'Replace something' },
        { value: 'add', label: 'Add to the room' },
      ],
    },
  ],
  buildPrompt: (s) => buildPlaceObjectPrompt(s),
  sendTargets: [],
  poolLabel: 'Placed objects',
  galleryLabel: 'Place object',
  ui: {
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
  verb: 'Swap one thing',
  inputKind: ['room'],
  outputKind: 'room',
  icon: Replace,
  inputMode: 'image',
  maxReferences: 0,
  // Optional, not required: this tool works from words alone, and the box only
  // makes it more precise. A REQUIRED marker would take it out of batch runs.
  marker: 'optional',
  defaultSettings: { element: '', replacement: '' },
  buildPrompt: (s, ctx) => buildTargetedSwapPrompt({ ...s, marked: ctx.hasMarker }),
  sendTargets: [],
  poolLabel: 'Targeted edits',
  galleryLabel: 'Targeted edit',
  ui: {
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
  blockedReason: (s, hasInput, mode) => {
    if (!hasInput) return 'Upload an image to begin.';
    // Refine replaces these controls with the refine panel, so a settings-based
    // block here would disable Generate with no field on screen to satisfy it.
    if (mode === 'refine') return null;
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
  verb: 'List the furniture',
  inputKind: ['room'],
  outputKind: null,
  icon: ClipboardList,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { roomLabel: '' },
  buildPrompt: (s) => buildSpecSheetPrompt(s),
  aspectRatio: () => '4:5',
  sendTargets: [],
  poolLabel: 'Spec sheets',
  galleryLabel: 'Spec sheet',
  ui: {
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

// --- Visualization ----------------------------------------------------------

// --- Site & Urban -----------------------------------------------------------
//
// The category that arrives with its first tool. Both of these take an image the
// app did not make — a Maps screenshot, a render on white — which is why they
// are the only two tools carrying a free-text "where is this" field: the input
// genuinely cannot say.

const birdsEye: FeatureDef<BirdsEyeSettings> = {
  key: 'birdsEye',
  category: 'site',
  name: "Bird's Eye View",
  blurb: 'Satellite to Aerial Photo',
  verb: 'Fly over it',
  inputKind: ['map'],
  outputKind: 'building',
  icon: Plane,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { light: 'golden', context: '' },
  quick: [
    {
      kind: 'choice',
      key: 'light',
      label: 'Light',
      hint: 'Golden hour throws long shadows, which is what makes a flat satellite image read as three-dimensional.',
      options: [
        { value: 'golden', label: 'Golden hour' },
        { value: 'overcast', label: 'Overcast' },
        { value: 'midday', label: 'Midday' },
      ],
    },
  ],
  buildPrompt: (s) => buildBirdsEyePrompt(s),
  // A drone shot is a landscape composition whatever shape the screenshot was
  // cropped to, and the input crop carries no compositional intent — it is
  // wherever the user happened to stop dragging.
  aspectRatio: () => '16:9',
  // Everything the input could not show — building heights, roof pitches, the
  // state of the vegetation — is inferred from a flat orthographic image.
  accuracyWarning: () =>
    'Heights, roof forms and planting are inferred — a satellite image cannot show them. Treat this as a study, not a survey.',
  sendTargets: ['moodboard'],
  poolLabel: 'Aerial views',
  galleryLabel: "Bird's eye",
  ui: {
    eyebrow: 'Site & Urban',
    title: 'Satellite Screenshot → Aerial Photograph',
    description:
      'Drop a Google Earth or Maps screenshot and get a cinematic drone shot of the same place — same streets, same blocks, same water, with real elevation and real light.',
    inputLabel: 'Input',
    inputHint: 'A top-down satellite or Maps screenshot',
    outputCaption: 'The aerial view',
    emptyIcon: Plane,
    emptyTitle: 'No aerial view yet',
    emptyDescription: 'Upload a satellite screenshot and press Generate — the drone shot appears here.',
    compare: { before: 'Satellite', after: 'Aerial' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a satellite or map screenshot to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: "bird's-eye strips the map interface", pattern: /map pins, the search bar, zoom controls/ },
    { name: "bird's-eye refuses a flat ground plane", pattern: /The ground must never look flat/ },
    { name: "bird's-eye keeps the real geography", pattern: /changing the camera and the light, not the geography/ },
  ],
};

const urbanContext: FeatureDef<UrbanContextSettings> = {
  key: 'urbanContext',
  category: 'site',
  name: 'Urban Context',
  blurb: 'Isolated Building into a Street',
  verb: 'Put it in a street',
  inputKind: ['building'],
  outputKind: 'building',
  icon: Building,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { density: 'mid', city: '', entourage: true },
  quick: [
    {
      kind: 'choice',
      key: 'density',
      label: 'Neighbours',
      options: [
        { value: 'low', label: 'Low-rise' },
        { value: 'mid', label: 'Mid-rise' },
        { value: 'dense', label: 'Dense city' },
      ],
    },
    {
      kind: 'toggle',
      key: 'entourage',
      label: 'People on the street',
      hint: 'At correct scale against the building — the cheapest way to make the height read.',
    },
  ],
  buildPrompt: (s) => buildUrbanContextPrompt(s),
  // Unpinned on purpose: the prompt's second instruction is that the camera does
  // not move, and a pinned ratio is a re-crop, which is a camera move.
  accuracyWarning: () =>
    'The neighbours are invented, not surveyed. This shows scale and character, not what is actually next door.',
  sendTargets: ['humanScale', 'atmosphere', 'moodboard'],
  poolLabel: 'Contextual views',
  galleryLabel: 'Urban context',
  ui: {
    eyebrow: 'Site & Urban',
    title: 'Isolated Building → Real Street',
    description:
      'A render on white tells a planning committee nothing about scale. Put the same building — untouched — into a street of the right density and the right city.',
    inputLabel: 'Input',
    inputHint: 'A render or photo of the building alone',
    outputCaption: 'The building in context',
    emptyIcon: Building,
    emptyTitle: 'No context yet',
    emptyDescription: 'Upload a render of the building and press Generate — the street appears around it.',
    compare: { before: 'Isolated', after: 'In context' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a render of the building to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'urban context locks the building first', pattern: /LOCK THE BUILDING/ },
    { name: 'urban context builds the street only after', pattern: /ONLY THEN BUILD THE CONTEXT/ },
    { name: 'urban context refuses to restyle the subject', pattern: /the context serves the building, not the other way round/ },
  ],
};

const wireframeRender: FeatureDef<WireframeRenderSettings> = {
  key: 'wireframeRender',
  category: 'visualization',
  name: 'Wireframe to Render',
  blurb: '3D Model to Photoreal',
  verb: 'Render the model',
  inputKind: ['model'],
  outputKind: 'building',
  icon: Camera,
  inputMode: 'image',
  maxReferences: 1,
  defaultSettings: { keepBackground: false, scene: defaultScene() },
  quick: [
    {
      kind: 'toggle',
      key: 'keepBackground',
      label: 'Keep the viewport background',
      hint: 'On: whatever is behind the model stays. Off: a plausible setting is built around it.',
    },
  ],
  buildPrompt: (s) => buildWireframeRenderPrompt({ ...s.scene, keepBackground: s.keepBackground }),
  sendTargets: ['atmosphere', 'humanScale', 'upscale'],
  poolLabel: 'Renders',
  galleryLabel: 'Render',
  ui: {
    eyebrow: 'Visualization',
    title: '3D Model → Photoreal Render',
    description:
      'Give an untextured model materials, light and a setting. The geometry is fixed input — it renders what you modelled, not a better-balanced version of it.',
    inputLabel: 'Input',
    inputHint: 'A wireframe, clay or shaded viewport screenshot',
    outputCaption: 'The finished render',
    emptyIcon: Camera,
    emptyTitle: 'No render yet',
    emptyDescription: 'Upload a model view and press Generate — the render appears here.',
    compare: { before: 'Model', after: 'Render' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a 3D model view to begin.'),
  toOptions: (_s, ctx) => ({ variations: 1, refine: ctx.refine || undefined, referenceImages: ctx.referenceImages }),
  promptContracts: [
    { name: 'wireframe render locks the modelled geometry', pattern: /LOCK THE GEOMETRY/ },
    { name: 'wireframe render refuses to rebalance the elevation', pattern: /look better balanced/i },
  ],
};

const renderRefine: FeatureDef<RenderRefineSettings> = {
  key: 'renderRefine',
  category: 'visualization',
  name: 'Render Refinement',
  blurb: 'Draft to Portfolio Quality',
  verb: 'Finish the render',
  inputKind: ['building', 'room'],
  outputKind: 'building',
  icon: Gem,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { level: 'finish', fixPeople: true, fixMaterials: true },
  quick: [
    {
      kind: 'choice',
      key: 'level',
      label: 'How far',
      options: [
        { value: 'polish', label: 'Polish', hint: 'Clean up what is soft or noisy. The lightest touch — closest to the original.' },
        {
          value: 'finish',
          label: 'Finish',
          hint: 'Bring it to portfolio standard: real material detail, contact shadows, believable glass.',
        },
      ],
    },
    { kind: 'toggle', key: 'fixMaterials', label: 'Fix materials', hint: 'Kill repeating textures, stretched mapping and brick courses at the wrong scale.' },
    { kind: 'toggle', key: 'fixPeople', label: 'Fix people', hint: 'Correct anatomy, hands and feet, and shadows that actually touch the ground.' },
  ],
  buildPrompt: (s) => buildRenderRefinePrompt(s),
  sendTargets: ['upscale', 'humanScale'],
  poolLabel: 'Refined renders',
  galleryLabel: 'Refined render',
  ui: {
    eyebrow: 'Visualization',
    title: 'Draft Render → Finished Render',
    description:
      'The same image, produced properly: resolved materials, correct contact shadows, believable glass. It changes nothing about the design, the view or the light — for a requested change, use Refine on an output instead.',
    inputLabel: 'Input',
    inputHint: 'A draft, quick or AI render that needs finishing',
    outputCaption: 'The finished version',
    emptyIcon: Gem,
    emptyTitle: 'No refined render yet',
    emptyDescription: 'Upload a draft render and press Generate — the finished version appears here.',
    compare: { before: 'Draft', after: 'Finished' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a render to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'refinement locks everything but execution', pattern: /LOCK EVERYTHING EXCEPT the quality of the rendering itself/ },
    { name: 'refinement says it is not a new picture', pattern: /not making a new picture/ },
  ],
};

const atmosphere: FeatureDef<AtmosphereSettings> = {
  key: 'atmosphere',
  category: 'visualization',
  name: 'Atmosphere & Light',
  blurb: 'Re-light an Existing Render',
  verb: 'Change the light',
  inputKind: ['building'],
  outputKind: 'building',
  icon: Sun,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { lighting: 'golden-hour', season: 'none', mood: 'none', keepPeople: true },
  quick: [
    { kind: 'choice', key: 'lighting', label: 'Light', options: vocab(LIGHTING) },
    { kind: 'choice', key: 'season', label: 'Season', options: vocab(SEASONS) },
    { kind: 'choice', key: 'mood', label: 'Mood', options: vocab(MOODS) },
    {
      kind: 'toggle',
      key: 'keepPeople',
      label: 'Keep the people',
      hint: 'Off clears the render of people and vehicles, leaving the architecture.',
    },
  ],
  buildPrompt: (s) => buildAtmospherePrompt(s),
  sendTargets: ['upscale', 'humanScale'],
  poolLabel: 'Re-lit renders',
  galleryLabel: 'Atmosphere',
  ui: {
    eyebrow: 'Visualization',
    title: 'Re-light the Render',
    description:
      'Golden hour, overcast, dusk, winter — applied to an image that already exists. The same vocabulary as the scene controls, pointed the other way: at a finished render rather than a new one.',
    inputLabel: 'Input',
    inputHint: 'Any finished render or photograph of the building',
    outputCaption: 'The re-lit image',
    emptyIcon: Sun,
    emptyTitle: 'No re-lit image yet',
    emptyDescription: 'Upload a render, pick the light and press Generate.',
    compare: { before: 'Original', after: 'Re-lit' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a render to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'atmosphere locks all but the light', pattern: /LOCK EVERYTHING EXCEPT the light, the sky and the season/ },
    // Live run W1: night + winter + dramatic returned the flat overhanging roof
    // as a hipped one, with "the roof form" and "a different roofline" both
    // already in the prompt. Naming the failure, not the property, is what
    // worked on Exploded Axonometric (V2), so the shared lock now carries it.
    { name: 'atmosphere forbids inventing a pitched roof', pattern: /THE ROOF IS THE PART THAT DRIFTS/ },
    { name: 'atmosphere recomputes what follows from the light', pattern: /Recompute everything that follows from that light/ },
  ],
};

const facadeMaterial: FeatureDef<FacadeMaterialSettings> = {
  key: 'facadeMaterial',
  category: 'visualization',
  name: 'Facade Material Study',
  blurb: 'Same Building, New Material',
  verb: 'Re-clad it',
  inputKind: ['building'],
  outputKind: 'building',
  icon: Layers,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { materials: 'brick-timber', customMaterials: '', scope: 'whole', target: '' },
  quick: [
    // `scope` is deliberately NOT here. "One named element" does nothing until
    // an element is named, and that text field cannot live in a one-tap sheet —
    // so in the sheet it would be a chip that changes the request not at all.
    // qa/verifyQuick.cjs caught exactly that on its first run.
    { kind: 'choice', key: 'materials', label: 'Material', options: vocab(MATERIAL_PRESETS) },
  ],
  buildPrompt: (s) => buildFacadeMaterialPrompt(s),
  sendTargets: ['atmosphere', 'upscale'],
  poolLabel: 'Material studies',
  galleryLabel: 'Material study',
  ui: {
    eyebrow: 'Visualization',
    title: 'Facade Material Study',
    description:
      'The same building, the same view, a different cladding. Only useful if nothing else moves — so the openings are locked hard: a new material does not get new windows.',
    inputLabel: 'Input',
    inputHint: 'A render or photograph showing the facade',
    outputCaption: 'The re-clad building',
    emptyIcon: Layers,
    emptyTitle: 'No material study yet',
    emptyDescription: 'Upload a facade, pick a material and press Generate.',
    compare: { before: 'Original', after: 'Re-clad' },
  },
  blockedReason: (s, hasInput, mode) => {
    if (!hasInput) return 'Upload a facade to begin.';
    // Refine replaces these controls with the refine panel, so a settings-based
    // block here would disable Generate with no field on screen to satisfy it.
    if (mode === 'refine') return null;
    if (s.materials === 'custom' && !s.customMaterials.trim()) return 'Describe the material to use.';
    if (s.scope === 'named' && !s.target.trim()) return 'Name the element to re-clad.';
    return null;
  },
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'material study locks the openings', pattern: /A new material does not get new openings/ },
    { name: 'material study shows the real module', pattern: /its real module and coursing/ },
  ],
};

const humanScale: FeatureDef<HumanScaleSettings> = {
  key: 'humanScale',
  category: 'visualization',
  name: 'Add Human Scale',
  blurb: 'People, Vehicles, Planting',
  verb: 'Add people',
  inputKind: ['building'],
  outputKind: 'building',
  icon: Users,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { density: 'some', setting: 'residential', vehicles: false, planting: false },
  quick: [
    {
      kind: 'choice',
      key: 'density',
      label: 'How many',
      options: [
        { value: 'few', label: 'A few' },
        { value: 'some', label: 'Some' },
        { value: 'busy', label: 'Busy' },
      ],
    },
    {
      kind: 'choice',
      key: 'setting',
      label: 'Who',
      hint: 'Sets what the figures are doing, which is what stops them reading as stock cut-outs.',
      options: [
        { value: 'residential', label: 'Residential' },
        { value: 'commercial', label: 'Commercial' },
        { value: 'civic', label: 'Civic / public' },
      ],
    },
    { kind: 'toggle', key: 'vehicles', label: 'Vehicles', hint: 'One or two, where a vehicle would actually be — never blocking the facade.' },
    { kind: 'toggle', key: 'planting', label: 'Planting', hint: 'Street trees, hedging or beds at believable mature sizes.' },
  ],
  buildPrompt: (s) => buildHumanScalePrompt(s),
  sendTargets: ['atmosphere', 'upscale'],
  poolLabel: 'Populated renders',
  galleryLabel: 'Human scale',
  ui: {
    eyebrow: 'Visualization',
    title: 'Add Life and Human Scale',
    description:
      'Figures sized against the door height rather than by eye, doing something rather than posing. Scale is what stops a render reading as a model, and a row of people facing the camera is what makes one read as fake.',
    inputLabel: 'Input',
    inputHint: 'A finished render, ideally an empty one',
    outputCaption: 'The populated render',
    emptyIcon: Users,
    emptyTitle: 'No populated render yet',
    emptyDescription: 'Upload a render and press Generate — the people appear here.',
    compare: { before: 'Empty', after: 'Populated' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a render to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'human scale measures figures against the door', pattern: /shorter than a standard door opening/ },
    { name: 'human scale forbids posing at the camera', pattern: /Nobody poses, nobody faces the lens/ },
  ],
};

const multiView: FeatureDef<MultiViewSettings> = {
  key: 'multiView',
  category: 'visualization',
  name: 'Multi-View Sheet',
  blurb: 'One Building, Several Views',
  verb: 'Make a sheet',
  inputKind: ['building', 'model'],
  outputKind: null,
  icon: LayoutPanelTop,
  inputMode: 'image',
  maxReferences: 0,
  // The one tool here that can fail in a way that looks entirely plausible:
  // four beautiful panels showing four slightly different buildings.
  accuracyWarning: () =>
    'Check the panels against each other before you use this — count storeys and windows in each. Generating several views of one building is the hardest thing this app asks, and a sheet of four near-misses looks convincing at a glance.',
  defaultSettings: { views: ['front', 'threequarter', 'side', 'aerial'], layout: '2x2' },
  quick: [
    {
      kind: 'choice',
      key: 'layout',
      label: 'Layout',
      options: [
        { value: '1x3', label: '3 across' },
        { value: '2x2', label: '2 \u00d7 2' },
        { value: '2x3', label: '2 \u00d7 3' },
      ],
    },
  ],
  buildPrompt: (s) => buildMultiViewPrompt(s),
  // A sheet is a landscape composition whatever the building.
  aspectRatio: () => '3:2',
  sendTargets: ['upscale'],
  poolLabel: 'View sheets',
  galleryLabel: 'View sheet',
  ui: {
    eyebrow: 'Visualization',
    title: 'Multi-View Presentation Sheet',
    description:
      'One building, several cameras, one sheet — the thing you actually send a client. The whole difficulty is consistency: every panel has to be the same building, not four similar ones.',
    inputLabel: 'Input',
    inputHint: 'A render or photograph of the building',
    outputCaption: 'The presentation sheet',
    emptyIcon: LayoutPanelTop,
    emptyTitle: 'No sheet yet',
    emptyDescription: 'Upload the building, pick the views and press Generate.',
  },
  blockedReason: (s, hasInput, mode) => {
    if (!hasInput) return 'Upload the building to begin.';
    // Refine replaces these controls with the refine panel, so a settings-based
    // block here would disable Generate with no field on screen to satisfy it.
    if (mode === 'refine') return null;
    if (s.views.length < 2) return 'Pick at least two views.';
    return null;
  },
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'multi-view states the consistency rule first', pattern: /every panel shows THE SAME BUILDING/ },
    { name: 'multi-view calls near-misses a failure', pattern: /is a complete failure of this task/ },
    { name: 'multi-view ends on a panel-by-panel count', pattern: /count the storeys in each/ },
  ],
};

const reflection: FeatureDef<ReflectionSettings> = {
  key: 'reflection',
  category: 'visualization',
  name: 'Reflection Control',
  blurb: 'Tune What the Glass Does',
  verb: 'Fix the glass',
  inputKind: ['building'],
  outputKind: 'building',
  icon: Sparkle,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { mode: 'balanced', reflect: '' },
  quick: [
    {
      kind: 'choice',
      key: 'mode',
      label: 'What the glass does',
      options: [
        {
          value: 'transparent',
          label: 'See through it',
          hint: 'Interiors visible through the glass — the reading that makes a building look occupied.',
        },
        {
          value: 'balanced',
          label: 'Balanced',
          hint: 'Part interior, part sky, varying pane by pane with the angle. The most photographic.',
        },
        { value: 'mirror', label: 'Mirror it', hint: 'The facade disappears into its surroundings. Strongest at a distance.' },
      ],
    },
  ],
  buildPrompt: (s) => buildReflectionPrompt(s),
  sendTargets: ['upscale', 'atmosphere'],
  poolLabel: 'Glazing studies',
  galleryLabel: 'Reflection',
  ui: {
    eyebrow: 'Visualization',
    title: 'Reflection Control',
    description:
      'Transparent enough to look occupied, or mirrored enough to disappear into the sky. Reflections break at every mullion and change pane by pane — a continuous mirrored sheet is the tell that gives an AI render away.',
    inputLabel: 'Input',
    inputHint: 'A render or photograph with glazing in it',
    outputCaption: 'The adjusted image',
    emptyIcon: Sparkle,
    emptyTitle: 'No glazing study yet',
    emptyDescription: 'Upload a render with glazing and press Generate.',
    compare: { before: 'Original', after: 'Adjusted' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a render to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'reflection breaks at the mullions', pattern: /Reflections break at every mullion/ },
    { name: 'reflection keeps the frames put', pattern: /keep exactly the size, shape and position/ },
  ],
};

const upscale: FeatureDef<UpscaleSettings> = {
  key: 'upscale',
  category: 'visualization',
  name: 'Upscale for Print',
  blurb: 'Approved Image to Print Master',
  verb: 'Upscale for print',
  inputKind: ['plan', 'sketch', 'room', 'building', 'model', 'map'],
  outputKind: 'same',
  icon: Maximize2,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { resolution: '2K', sharpen: true },
  quick: [
    {
      kind: 'choice',
      key: 'resolution',
      label: 'Target size',
      options: [
        { value: '2K', label: '2K' },
        { value: '4K', label: '4K' },
      ],
    },
    { kind: 'toggle', key: 'sharpen', label: 'Output sharpening', hint: 'Restrained, for large-format print. Off leaves the result naturally soft.' },
  ],
  buildPrompt: (s) => buildUpscalePrompt(s),
  sendTargets: [],
  poolLabel: 'Print masters',
  galleryLabel: 'Print master',
  ui: {
    eyebrow: 'Visualization',
    title: 'Upscale for Print',
    description:
      'The one already approved, at board size. It resolves detail rather than inventing it — an upscaler that adds a more interesting balcony has destroyed the image for the only purpose it had.',
    inputLabel: 'Input',
    inputHint: 'The finished image to print',
    outputCaption: 'The print master',
    emptyIcon: Maximize2,
    emptyTitle: 'No print master yet',
    emptyDescription: 'Upload the approved image and press Generate.',
    compare: { before: 'Original', after: 'Print master' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload an image to begin.'),
  // The only tool that sends `resolution`. It reaches the kie.ai API; Gemini
  // takes no equivalent parameter, so there the prompt does the work alone —
  // which the screen says out loud rather than quietly under-delivering.
  toOptions: (s, ctx) => ({ variations: 1, refine: ctx.refine || undefined, resolution: s.resolution }),
  promptContracts: [
    { name: 'upscale resolves rather than invents', pattern: /resolve detail, do not invent it/ },
    { name: 'upscale refuses to improve the design', pattern: /your job is to make it printable, not better/ },
    // `outputKind: 'same'` promises, in the registry's own words, that "an
    // upscale of a plan is still a plan". Live run V6 broke that promise: a line
    // elevation came back as a photoreal render with sky, lawn and driveway.
    { name: 'upscale keeps the input medium', pattern: /a line drawing stays a line drawing|A line drawing stays a line drawing/ },
    { name: 'upscale never converts a drawing to a render', pattern: /Never convert a drawing into a render/ },
  ],
};

// --- Diagrams & Boards ------------------------------------------------------
//
// This category inverts the app's usual rule about text. Everywhere else a
// label is a liability, because models misspell and a misspelled drawing is
// unusable; here the label IS the output, so each of these tools asks for
// correct spelling rather than for silence, and the switch defaults ON.

const floorAnalysis: FeatureDef<FloorAnalysisSettings> = {
  key: 'floorAnalysis',
  category: 'boards',
  name: 'Floor Analysis',
  blurb: 'Plan to Analysis Diagram',
  verb: 'Analyse the plan',
  inputKind: ['plan'],
  outputKind: null,
  icon: Route,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { layer: 'circulation', labels: true },
  quick: [
    {
      kind: 'choice',
      key: 'layer',
      label: 'Layer',
      hint: 'One at a time on purpose. Four layers on one plan is a colourful mess; four runs is a series.',
      options: [
        { value: 'circulation', label: 'Circulation' },
        { value: 'zoning', label: 'Zoning' },
        { value: 'daylight', label: 'Daylight' },
        { value: 'structure', label: 'Structure' },
      ],
    },
    {
      kind: 'toggle',
      key: 'labels',
      label: 'Room names and a title',
      hint: 'On by default here — an analysis diagram nobody can read explains nothing.',
    },
  ],
  buildPrompt: (s) => buildFloorAnalysisPrompt(s),
  sendTargets: [],
  poolLabel: 'Analysis diagrams',
  galleryLabel: 'Floor analysis',
  ui: {
    eyebrow: 'Diagrams & Boards',
    title: 'Floor Plan → Analysis Diagram',
    description:
      'One layer at a time, on purpose. Circulation, zoning, daylight or structure over the same plan — run it four times and you have a series that reads as a set.',
    inputLabel: 'Input',
    inputHint: 'A floor plan',
    outputCaption: 'The analysis',
    emptyIcon: Route,
    emptyTitle: 'No analysis yet',
    emptyDescription: 'Upload a floor plan, pick a layer and press Generate.',
    compare: { before: 'Plan', after: 'Analysis' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload a floor plan to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'floor analysis keeps the plan underneath', pattern: /KEEP THE PLAN UNDERNEATH/ },
    { name: 'floor analysis draws exactly one layer', pattern: /Overlay exactly one analysis/ },
    { name: 'floor analysis refuses to combine layers', pattern: /says one thing clearly beats one that says four things faintly/ },
  ],
};

const programDiagram: FeatureDef<ProgramDiagramSettings> = {
  key: 'programDiagram',
  category: 'boards',
  name: 'Program Diagram',
  blurb: 'Building to Labelled Floors',
  verb: 'Break down the floors',
  inputKind: ['building', 'model'],
  outputKind: null,
  icon: Rows3,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { levels: '', orientation: 'vertical' },
  quick: [
    {
      kind: 'choice',
      key: 'orientation',
      label: 'Arrangement',
      options: [
        { value: 'vertical', label: 'Stacked' },
        { value: 'isometric', label: 'Exploded isometric' },
      ],
    },
  ],
  buildPrompt: (s) => buildProgramDiagramPrompt(s),
  // A separated stack is tall whichever way you cut it; an isometric explosion
  // spreads sideways as well, so it gets a squarer frame.
  aspectRatio: (s) => (s.orientation === 'vertical' ? '4:5' : '4:3'),
  sendTargets: [],
  poolLabel: 'Program diagrams',
  galleryLabel: 'Program diagram',
  ui: {
    eyebrow: 'Diagrams & Boards',
    title: 'Building → Program Breakdown',
    description:
      'The floors pulled apart and named — retail, then apartments, then the roof terrace. The slabs stay recognisably this building, which is the whole difficulty.',
    inputLabel: 'Input',
    inputHint: 'A render, elevation or photo of the whole building',
    outputCaption: 'The program breakdown',
    emptyIcon: Rows3,
    emptyTitle: 'No breakdown yet',
    emptyDescription: 'Upload the building and press Generate — the floors separate and label themselves.',
    compare: { before: 'Building', after: 'Program' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload the building to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'program diagram names the output', pattern: /PROGRAM BREAKDOWN/ },
    { name: 'program diagram separates without redesigning', pattern: /SEPARATE, DO NOT REDESIGN/ },
    { name: 'program diagram refuses generic slabs', pattern: /A stack of generic slabs that merely share a style is a failure of this task/ },
  ],
};

const explodedAxon: FeatureDef<ExplodedAxonSettings> = {
  key: 'explodedAxon',
  category: 'boards',
  name: 'Exploded Axonometric',
  blurb: 'Building to Assembly Diagram',
  verb: 'Explode it',
  inputKind: ['building', 'model'],
  outputKind: null,
  icon: Layers3,
  inputMode: 'image',
  maxReferences: 0,
  // Live run 08: layer labels were spelled correctly on their leader lines and
  // the facade kept the input's garage, stone and glazed stair — but the flat
  // overhanging roof came back hipped and pitched. Separating a building into
  // layers means rebuilding each one, and the roof is the layer that drifts.
  accuracyWarning: () =>
    'Check the roof form against your input. Exploding a building means redrawing every layer, and the roof is the '
    + 'one that comes back changed most often — a flat roof can return pitched without the rest of the diagram moving.',
  defaultSettings: { axis: 'vertical', labels: true },
  quick: [
    {
      kind: 'choice',
      key: 'axis',
      label: 'Explode',
      hint: 'Upward reads as an assembly sequence. Outward peels the envelope off the structure — better for showing a facade build-up.',
      options: [
        { value: 'vertical', label: 'Upward' },
        { value: 'layered', label: 'Outward' },
      ],
    },
    {
      kind: 'toggle',
      key: 'labels',
      label: 'Label each layer',
      hint: 'Roof structure, floor plates, frame, facade, ground — on leader lines.',
    },
  ],
  buildPrompt: (s) => buildExplodedAxonPrompt(s),
  aspectRatio: (s) => (s.axis === 'vertical' ? '4:5' : '4:3'),
  sendTargets: [],
  poolLabel: 'Exploded views',
  galleryLabel: 'Exploded axon',
  ui: {
    eyebrow: 'Diagrams & Boards',
    title: 'Building → Exploded Axonometric',
    description:
      'Roof, frame, floor plates, envelope, ground — separated along one axis so the assembly reads. Distinct from the program diagram: that one names floors, this one shows how it goes together.',
    inputLabel: 'Input',
    inputHint: 'A render, model view or photo of the building',
    outputCaption: 'The exploded view',
    emptyIcon: Layers3,
    emptyTitle: 'Nothing exploded yet',
    emptyDescription: 'Upload the building and press Generate — the layers pull apart here.',
    compare: { before: 'Building', after: 'Exploded' },
  },
  blockedReason: (_s, hasInput) => (hasInput ? null : 'Upload the building to begin.'),
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'exploded axon names the output', pattern: /EXPLODED AXONOMETRIC/ },
    { name: 'exploded axon holds true axonometric projection', pattern: /parallel lines stay parallel, no vanishing point/ },
    { name: 'exploded axon keeps every layer on the same building', pattern: /Every separated layer belongs to THIS building/ },
    // Live run 08 returned a flat overhanging roof as a hipped one. "Every layer
    // belongs to THIS building" listed footprint, proportions, materials and
    // openings — never roof form — so the one layer that drifted was the one
    // nothing named. This pins the clause that now names it.
    { name: 'exploded axon locks the roof form specifically', pattern: /ROOF LAYER IS THE ONE THAT DRIFTS/ },
    {
      name: 'exploded axon forbids inventing a pitched roof',
      pattern: /Do not give this building a pitched, hipped or gabled roof unless the input already has one/,
    },
  ],
};

const annotation: FeatureDef<AnnotationSettings> = {
  key: 'annotation',
  category: 'boards',
  name: 'Annotation Sketch',
  blurb: 'Image to Explained Diagram',
  verb: 'Annotate it',
  inputKind: ['plan', 'sketch', 'room', 'building', 'model'],
  outputKind: null,
  icon: PenTool,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { subject: 'circulation', custom: '', labels: true },
  quick: [
    {
      kind: 'choice',
      key: 'subject',
      label: 'Explain',
      options: [
        { value: 'circulation', label: 'Circulation' },
        { value: 'ventilation', label: 'Ventilation' },
        { value: 'sun', label: 'Sun path' },
        { value: 'program', label: 'Program' },
        { value: 'structure', label: 'Structure' },
        { value: 'custom', label: 'Something else' },
      ],
    },
    {
      kind: 'toggle',
      key: 'labels',
      label: 'Labels and a legend',
      hint: 'Off leaves arrows and highlight zones only — cleaner, and it needs someone present to explain it.',
    },
  ],
  buildPrompt: (s) => buildAnnotationPrompt(s),
  sendTargets: [],
  poolLabel: 'Annotated diagrams',
  galleryLabel: 'Annotation',
  ui: {
    eyebrow: 'Diagrams & Boards',
    title: 'Image → Annotated Diagram',
    description:
      'Arrows, flow lines and labels drawn over your own render or drawing — the sheet that explains why the building is the way it is. The image underneath is not redrawn.',
    inputLabel: 'Input',
    inputHint: 'A render, section, plan or photograph',
    outputCaption: 'The annotated diagram',
    emptyIcon: PenTool,
    emptyTitle: 'Nothing annotated yet',
    emptyDescription: 'Upload an image, choose what to explain and press Generate.',
    compare: { before: 'Image', after: 'Annotated' },
  },
  blockedReason: (s, hasInput, mode) => {
    if (!hasInput) return 'Upload an image to begin.';
    // Refine replaces these controls with the refine panel, so a settings-based
    // block here would disable Generate with no field on screen to satisfy it.
    if (mode === 'refine') return null;
    if (s.subject === 'custom' && !s.custom.trim()) return 'Describe what the diagram should explain.';
    return null;
  },
  toOptions: (_s, ctx) => plainOptions(ctx),
  promptContracts: [
    { name: 'annotation locks the base image', pattern: /LOCK THE BASE IMAGE/ },
    { name: 'annotation draws over rather than redraws', pattern: /You are drawing ON it, not redrawing it/ },
    { name: 'annotation keeps the overlay economical', pattern: /six clear marks explains more than one with thirty/ },
  ],
};

const moodboard: FeatureDef<MoodboardSettings> = {
  key: 'moodboard',
  category: 'boards',
  name: 'Mood Board',
  blurb: 'Image → Material Board',
  verb: 'Board it',
  inputKind: ['plan', 'sketch', 'room', 'building'],
  outputKind: null,
  icon: Palette,
  inputMode: 'image',
  maxReferences: 0,
  defaultSettings: { aspect: '4:5' },
  buildPrompt: () => buildMoodboardPrompt(),
  aspectRatio: (s) => s.aspect,
  sendTargets: [],
  poolLabel: 'Material boards',
  galleryLabel: 'Material board',
  ui: {
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
  sketchRender,
  render,
  sketchPlan,
  elevation,
  cadElevation,
  section,
  renderToPlan,
  birdsEye,
  urbanContext,
  wireframeRender,
  renderRefine,
  atmosphere,
  facadeMaterial,
  humanScale,
  multiView,
  reflection,
  upscale,
  watercolour,
  axonometric,
  interior,
  declutter,
  placeObject,
  targetedSwap,
  specSheet,
  floorAnalysis,
  programDiagram,
  explodedAxon,
  annotation,
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

/**
 * Every tool that can work on this kind of image, in registry order.
 *
 * Derived, like everything else here: a tool joins a shortlist by declaring the
 * kind, not by being added to a list somewhere. That is the property that makes
 * the front door survive the next twenty tools — the same reason the nav rows
 * and the prompt snapshot are derived rather than maintained.
 */
export function toolsForKind(kind: InputKind): FeatureDef<FeatureSettings>[] {
  return (
    ALL_FEATURES.filter((f) => f.inputKind.includes(kind))
      // SPECIFIC FIRST, and the measure is a property tools already declare:
      // how many kinds of image a tool accepts. One that reads only a floor
      // plan is ABOUT floor plans; one that reads all six — Upscale for Print —
      // is a utility that happens to accept yours, and it was taking a slot in
      // the six cards the front door shows before "Show all".
      //
      // Dropping a plan used to lead with "Sketch to CAD Plan" and put Upscale
      // fourth, so a third of the visible shortlist was catch-alls rather than
      // answers to "what is this?". Sorting by `inputKind.length` puts
      // Isometric and Floor Analysis first and pushes Upscale off the visible
      // row entirely.
      //
      // A stable sort, so registry order — which is workflow order, and
      // deliberate — still decides between two tools of equal specificity.
      .sort((a, b) => a.inputKind.length - b.inputKind.length)
  );
}

/**
 * The kind a result of `feature` is, given the kind that went in.
 *
 * `'same'` resolves against the input, which is the only reason this needs the
 * input kind at all — an upscale of a plan is a plan, an upscale of a room is a
 * room. `null` means the output is not something the app can chain from.
 */
export function outputKindOf(feature: FeatureKind, inputKind: InputKind): InputKind | null {
  const declared = REGISTRY[feature].outputKind;
  return declared === 'same' ? inputKind : declared;
}

/** Tools that take no image at all — the only ones reachable before a drop. */
export function toolsWithoutImage(): FeatureDef<FeatureSettings>[] {
  return ALL_FEATURES.filter((f) => f.inputKind.length === 0);
}

/**
 * The two-digit number in a tool's section header — its position in its own
 * category.
 *
 * Derived, because the hand-written version had already drifted into nonsense:
 * across fourteen tools there were two 01s, two 02s, two 04s, two 05s and two
 * 06s. A number nobody can trust is worse than no number, and this one is now
 * correct by construction — reordering a category renumbers it.
 */
export function displayIndex(feature: FeatureKind): string {
  const position = categoryOf(feature).features.findIndex((f) => f.key === feature);
  return String(position + 1).padStart(2, '0');
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
