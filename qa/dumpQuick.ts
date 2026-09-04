// Emits, as JSON, every tool's `quick` axes together with the prompt each of
// their options actually produces — so qa/verifyQuick.cjs can assert that a
// control the user can tap does something.
//
// The failure this exists for is specific and silent: `quick` names a settings
// key and a set of values, and nothing in the type system ties either to the
// prompt builder. A key that no builder reads, or an option value outside the
// settings union, compiles and renders a perfectly good-looking chip row that
// changes nothing at all — and it would be indistinguishable, on screen, from a
// model that ignored the instruction.

import { ALL_FEATURES } from '../src/features/registry';

const ctx = { useMoodboard: false, useStyleRef: false };

const out = ALL_FEATURES.map((def) => ({
  key: def.key,
  defaultKeys: Object.keys(def.defaultSettings),
  axes: (def.quick ?? []).map((axis) => {
    // Each variant is the tool's defaults with exactly this axis moved, so any
    // difference in the prompt is attributable to this axis and nothing else.
    const values: unknown[] = axis.kind === 'choice' ? axis.options.map((o) => o.value) : [true, false];
    return {
      kind: axis.kind,
      key: axis.key,
      label: axis.label,
      values: values.map((value) => {
        const settings = { ...def.defaultSettings, [axis.key]: value } as never;
        // The PROMPT is not the whole request: `resolution` on the upscale tool
        // reaches the engine as a parameter and never appears in a sentence, so
        // comparing prompts alone would report a working control as inert.
        return {
          value: String(value),
          shape: JSON.stringify({
            prompt: def.buildPrompt(settings, ctx),
            options: def.toOptions(settings, { refine: false }),
            aspect: def.aspectRatio?.(settings) ?? null,
          }),
        };
      }),
    };
  }),
}));

console.log(JSON.stringify(out, null, 2));
