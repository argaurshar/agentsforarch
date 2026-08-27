// Enumerates EVERY prompt this app can produce, so qa/promptSnapshot.cjs can
// diff them against a committed snapshot.
//
// This exists because TypeScript cannot see a changed prompt string. The build
// stays green while a refactor silently reworded the instruction the model
// actually receives — and prompt wording is the difference between a preserved
// floor plan and a squared-off one. Every combination is enumerated, not
// sampled: the bugs that shipped were all in combinations nobody thought to try.

import { buildAxonometricPrompt, buildElevationPrompt, buildInteriorPrompt, buildMoodboardPrompt, buildRefinePrompt, buildRenderPrompt } from '../src/lib/prompts';
import { buildMassingPrompt, buildSketchRenderPrompt } from '../src/lib/prompt/concept';
import { buildAnnotationPrompt, buildExplodedAxonPrompt, buildProgramDiagramPrompt } from '../src/lib/prompt/boards';
import { buildBirdsEyePrompt, buildFloorAnalysisPrompt, buildUrbanContextPrompt } from '../src/lib/prompt/site';
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
} from '../src/lib/prompt/visualization';
import {
  buildCadElevationPrompt,
  buildRenderToPlanPrompt,
  buildSectionPrompt,
  buildSketchPlanPrompt,
} from '../src/lib/prompt/drawings';
import {
  buildDeclutterPrompt,
  buildPlaceObjectPrompt,
  buildSpecSheetPrompt,
  buildTargetedSwapPrompt,
} from '../src/lib/prompt/interiors';
import { defaultScene } from '../src/lib/scene';
const sc = defaultScene();
const out: string[] = [];
const add = (k: string, v: string) => out.push(`### ${k}\n${v}`);
for (const style of ['photoreal','isometric','plan2d','clay','line'] as const)
  for (const sr of [false, true]) add(`render:${style}:ref${sr}`, buildRenderPrompt({ style, useStyleRef: sr, ...sc }));
for (const face of [null,'Front','Side','Rear'] as const)
  for (const style of ['line','rendered','shaded'] as const)
    for (const theme of ['none','contemporary','modern','traditional','boho'] as const)
      for (const mb of [false,true])
        add(`elev:${face}:${style}:${theme}:mb${mb}`, buildElevationPrompt({ face, style, materials: sc.materials, customMaterials: sc.customMaterials, lighting: sc.lighting, mood: sc.mood, theme, useMoodboard: mb, useStyleRef: false }));
for (const mode of ['restyle','stage','renovate'] as const)
  for (const room of ['living','bedroom','kitchen','bathroom','dining','office'] as const)
    for (const theme of ['none','contemporary','modern','traditional','boho','minimalist','japandi','industrial','luxury'] as const)
      add(`int:${mode}:${room}:${theme}`, buildInteriorPrompt({ mode, roomType: room, theme, mood: sc.mood }));
for (const style of ['realistic','lineart','bw'] as const)
  for (const sec of [false,true]) add(`axon:${style}:${sec}`, buildAxonometricPrompt({ section: sec, style }));
for (const keep of [true, false]) add(`declutter:builtins${keep}`, buildDeclutterPrompt({ keepBuiltIns: keep }));
for (const kind of ['furniture','lighting','artwork'] as const)
  for (const placement of ['replace','add'] as const)
    for (const target of ['', 'the grey sofa'])
      add(`place:${kind}:${placement}:${target ? 'named' : 'blank'}`, buildPlaceObjectPrompt({ kind, placement, target }));
for (const marked of [false, true]) {
  add(`swap:filled:mark${marked}`, buildTargetedSwapPrompt({ element: 'the pendant over the island', replacement: 'a brushed brass dome', marked }));
  add(`swap:blank:mark${marked}`, buildTargetedSwapPrompt({ element: '', replacement: '', marked }));
}
for (const room of ['', 'kitchen', 'living room']) add(`spec:${room || 'auto'}`, buildSpecSheetPrompt({ roomLabel: room }));
for (const density of ['low','medium','high'] as const)
  for (const filled of [false, true])
    add(`massing:${density}:${filled ? 'full' : 'bare'}`, buildMassingPrompt(filled
      ? { brief: '40-unit residential block with ground-floor retail', siteSize: '45m x 60m corner plot', density, storeys: '6 storeys stepping to 4', context: 'four-storey terraces on two sides' }
      : { brief: '', siteSize: '', density, storeys: '', context: '' }));
// Sketch to Render. The scene axes are enumerated alongside the medium because
// each one appends a clause, and an empty clause has to drop out cleanly rather
// than leave "Materials: ." in the prompt.
for (const medium of ['illustration','photoreal','hybrid'] as const)
  for (const archStyle of ['none','brutalist','biophilic','futuristic'] as const)
    for (const context of ['none','urban'] as const)
      for (const entourage of [false,true])
        for (const subject of ['', 'a two-storey house seen from the garden corner'])
          add(`sketchrender:${medium}:${archStyle}:${context}:e${entourage}:${subject ? 'named' : 'auto'}`,
            buildSketchRenderPrompt({ ...sc, archStyle, context, entourage, medium, subject }));
// Site & Urban. The free-text field is enumerated blank and filled: a tool whose
// prompt only works once you type something is a tool that fails silently on
// first use.
for (const light of ['golden','overcast','midday'] as const)
  for (const context of ['', 'coastal Goa, monsoon season'])
    add(`birdseye:${light}:${context ? 'named' : 'auto'}`, buildBirdsEyePrompt({ light, context }));
for (const density of ['low','mid','dense'] as const)
  for (const city of ['', 'Ahmedabad'])
    for (const entourage of [false,true])
      add(`urban:${density}:${city ? 'named' : 'auto'}:e${entourage}`, buildUrbanContextPrompt({ density, city, entourage }));
for (const layer of ['circulation','zoning','daylight','structure'] as const)
  for (const labels of [false,true])
    add(`flooranalysis:${layer}:l${labels}`, buildFloorAnalysisPrompt({ layer, labels }));
// Diagrams & Boards. `labels` is enumerated both ways on every tool here for the
// same reason the drawings category enumerates units: the no-text branch and the
// labelled branch are different prompts, and only one of them is the default.
for (const subject of ['circulation','ventilation','sun','program','structure','custom'] as const)
  for (const labels of [false,true])
    add(`annotate:${subject}:l${labels}`, buildAnnotationPrompt({ subject, custom: subject === 'custom' ? 'how rainwater is collected and reused' : '', labels }));
add('annotate:custom:blank', buildAnnotationPrompt({ subject: 'custom', custom: '', labels: true }));
for (const orientation of ['vertical','isometric'] as const)
  for (const levels of ['', 'Parking\nRetail\nOffices\nApartments'])
    add(`program:${orientation}:${levels ? 'given' : 'inferred'}`, buildProgramDiagramPrompt({ levels, orientation }));
for (const axis of ['vertical','layered'] as const)
  for (const labels of [false,true])
    add(`explode:${axis}:l${labels}`, buildExplodedAxonPrompt({ axis, labels }));
for (const palette of ['warm','cool','muted','monochrome'] as const)
  for (const loose of [false,true]) for (const keepLines of [false,true])
    add(`watercolour:${palette}:l${loose}:k${keepLines}`, buildWatercolourPrompt({ palette, loose, keepLines }));
// Plans & Drawings. Units are enumerated even where annotation is 'none' — a
// unit clause leaking into an unannotated drawing is exactly the kind of
// cross-axis surprise full enumeration exists to catch.
const ANN = ['none','labels','dimensioned'] as const;
const UNITS = ['metric','imperial'] as const;
for (const annotation of ANN) for (const units of UNITS) for (const furnished of [false,true]) {
  add(`sketchplan:${annotation}:${units}:f${furnished}`, buildSketchPlanPrompt({ annotation, units, furnished }));
  add(`rendertoplan:${annotation}:${units}:f${furnished}`, buildRenderToPlanPrompt({ annotation, units, furnished }));
}
for (const face of ['front','left','right','rear'] as const)
  for (const annotation of ANN) for (const units of UNITS) for (const hatch of [false,true])
    add(`cadelev:${face}:${annotation}:${units}:h${hatch}`, buildCadElevationPrompt({ face, annotation, units, hatch }));
for (const axis of ['longitudinal','cross'] as const)
  for (const style of ['line','shaded'] as const)
    for (const entourage of [false,true])
      for (const annotation of ANN) for (const units of UNITS)
        for (const levels of ['', 'Ground + 2, 3m floor-to-floor'])
          add(`section:${axis}:${style}:e${entourage}:${annotation}:${units}:${levels ? 'lv' : 'nolv'}`,
            buildSectionPrompt({ axis, style, entourage, annotation, units, levels }));
// Visualization. These all take a finished image and change ONE property, so
// the axes worth enumerating are the property itself plus every toggle that
// could leak a clause into a mode that did not ask for it.
for (const lighting of ['golden-hour','midday','overcast','dusk','night'] as const)
  for (const season of ['none','winter'] as const)
    for (const mood of ['none','dramatic'] as const)
      for (const keepPeople of [true,false])
        add(`atmos:${lighting}:${season}:${mood}:p${keepPeople}`, buildAtmospherePrompt({ lighting, season, mood, keepPeople }));
for (const level of ['polish','finish'] as const)
  for (const fixPeople of [false,true]) for (const fixMaterials of [false,true])
    add(`refine:${level}:p${fixPeople}:m${fixMaterials}`, buildRenderRefinePrompt({ level, fixPeople, fixMaterials }));
for (const materials of ['studio','brick-timber','render-stone','glass-steel','custom'] as const)
  for (const scope of ['whole','named'] as const)
    add(`facade:${materials}:${scope}`, buildFacadeMaterialPrompt({ materials, customMaterials: materials === 'custom' ? 'charred larch with black steel reveals' : '', scope, target: scope === 'named' ? 'the ground-floor plinth' : '' }));
for (const density of ['few','some','busy'] as const)
  for (const setting of ['residential','commercial','civic'] as const)
    for (const vehicles of [false,true]) for (const planting of [false,true])
      add(`scale:${density}:${setting}:v${vehicles}:p${planting}`, buildHumanScalePrompt({ density, setting, vehicles, planting }));
for (const layout of ['2x2','1x3','2x3'] as const)
  for (const views of [['front','threequarter','side','aerial'] as const, ['entrance','detail'] as const, [] as const])
    add(`sheet:${layout}:${views.length || 'default'}`, buildMultiViewPrompt({ layout, views: [...views] }));
for (const mode of ['transparent','balanced','mirror'] as const)
  for (const reflect of ['', 'the plane trees opposite'])
    add(`reflect:${mode}:${reflect ? 'named' : 'auto'}`, buildReflectionPrompt({ mode, reflect }));
for (const sharpen of [false,true]) add(`upscale:s${sharpen}`, buildUpscalePrompt({ sharpen }));
for (const materials of ['studio','glass-steel'] as const)
  for (const lighting of ['golden-hour','overcast'] as const)
    for (const keepBackground of [false,true]) for (const entourage of [false,true])
      add(`wire:${materials}:${lighting}:b${keepBackground}:e${entourage}`, buildWireframeRenderPrompt({ ...sc, materials, lighting, entourage, keepBackground }));
add('moodboard', buildMoodboardPrompt());
add('refine', buildRefinePrompt({ chips: ['warmer-light','change-curtains'], freeText: 'more plants' }));
console.log(out.join('\n\n'));
