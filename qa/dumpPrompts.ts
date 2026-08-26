// Enumerates EVERY prompt this app can produce, so qa/promptSnapshot.cjs can
// diff them against a committed snapshot.
//
// This exists because TypeScript cannot see a changed prompt string. The build
// stays green while a refactor silently reworded the instruction the model
// actually receives — and prompt wording is the difference between a preserved
// floor plan and a squared-off one. Every combination is enumerated, not
// sampled: the bugs that shipped were all in combinations nobody thought to try.

import { buildAxonometricPrompt, buildElevationPrompt, buildInteriorPrompt, buildMoodboardPrompt, buildRefinePrompt, buildRenderPrompt } from '../src/lib/prompts';
import { defaultScene } from '../src/lib/scene';
const sc = defaultScene();
const out: string[] = [];
const add = (k: string, v: string) => out.push(`### ${k}\n${v}`);
for (const style of ['photoreal','isometric','plan2d','clay','line','watercolour'] as const)
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
add('moodboard', buildMoodboardPrompt());
add('refine', buildRefinePrompt({ chips: ['warmer-light','change-curtains'], freeText: 'more plants' }));
console.log(out.join('\n\n'));
