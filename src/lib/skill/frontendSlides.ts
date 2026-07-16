// The `frontend-slides` skill, wired into the app.
//
// We vendor the skill's own files verbatim (see ./resources/NOTICE.md) and feed
// them to Claude so every generated deck follows the skill precisely — its fixed
// 1920×1080 stage, distinctive design system, and animation grammar.
//
// Source: https://github.com/zarazhangrui/frontend-slides (author: zarazhangrui)
//
// The skill was authored for a filesystem coding agent (Claude Code) that asks
// questions, writes files, and runs scripts. This app runs it *headless* in a
// single browser API call, so `buildSkillSystemPrompt` appends an execution
// contract that pins the interactive/filesystem phases to our context: no
// questions, provided selections, image placeholder tokens, and raw-HTML output.

import animationPatterns from './resources/animation-patterns.md?raw';
import skillMd from './resources/SKILL.md?raw';
import stylePresets from './resources/STYLE_PRESETS.md?raw';
import htmlTemplate from './resources/html-template.md?raw';
import viewportBaseCss from './resources/viewport-base.css?raw';

export const SKILL_ATTRIBUTION = {
  name: 'frontend-slides',
  author: 'zarazhangrui',
  url: 'https://github.com/zarazhangrui/frontend-slides',
} as const;

/** Placeholder tokens the model must use to reference app-provided images. */
export const IMAGE_TOKEN = (i: number) => `{{IMG_${i}}}`;
export const LOGO_TOKEN = '{{LOGO}}';

/**
 * The execution contract that adapts the skill to a single headless browser
 * call. This is the ONLY place the skill's assumptions are overridden — the
 * design system, fixed-stage rules, and aesthetics above are used verbatim.
 */
const BROWSER_EXECUTION_CONTRACT = `
# Execution contract (headless, single call — READ THIS LAST, IT OVERRIDES PROCESS STEPS ABOVE)

You are running as the \`frontend-slides\` skill **headless**, inside a browser
app, in ONE API call. You cannot ask questions, open a browser, write files, run
scripts, take screenshots, deploy to Vercel, or convert .pptx. Ignore every
phase that requires those (Phase 0 mode questions, Phase 1 Q&A, Phase 2 preview
picking, Phase 4 conversion, Phase 5 open, Phase 6 deploy/PDF). Everything you
need is provided in the user message. Go straight to **Phase 3: Generate
Presentation** and produce the finished deck in one shot.

Apply the skill in full for the parts that DO apply:
- Honor the Design Aesthetics section: distinctive typography, a committed
  palette, atmosphere over flat color — no "AI slop", no purple-on-white cliché.
- Obey the Fixed Stage Rules for EVERY slide: fixed 1920×1080 stage scaled as a
  whole; \`.active\`/\`.visible\` via visibility/opacity, never \`display:none\`;
  fixed measurements; full \`prefers-reduced-motion\` support.
- Include the FULL contents of viewport-base.css (given above) in the <style>.
- Include the SlidePresentation controller (stage scaling + keyboard + touch +
  wheel nav) and the JS-based inline-editing affordance, per html-template.md.
- Use Google Fonts / Fontshare via <link> — never system fonts. Add the
  \`/* === SECTION === */\` comment blocks the skill requires.
- Respect the chosen density mode throughout (slide count, type scale, words
  per slide).

## Brand identity (hard requirement)
A brand identity is provided (palette, fonts, voice, optional logo). Treat it as
the committed style for this deck: drive the CSS \`:root\` variables from the
brand palette, set the display/body font families from the brand fonts (loaded
from Google Fonts/Fontshare), write titles and captions in the brand voice, and
place the logo on the title and closing slides if one is provided. Do not
override the brand palette with an unrelated preset — use the presets/animation
references only as craft guidance for layout, motion, and structure.

## Images (hard requirement)
Do NOT invent file paths, external URLs, or base64 for images. Reference each
provided image ONLY by its exact placeholder token, e.g.
\`<img src="{{IMG_0}}" alt="...">\`. If a logo is provided, reference it as
\`<img src="{{LOGO}}" alt="...">\`. The app substitutes these tokens with real
embedded images after you respond, producing a single portable file. Use every
provided image at least once; never reference a token that was not provided.
Keep images inside the authored 1920×1080 slide bounds.

## Output format (hard requirement)
Return the raw HTML document ONLY. Start your response with \`<!DOCTYPE html>\`
and end with \`</html>\`. No prose before or after, no explanations, and NO
Markdown code fences. The response body must be a single valid HTML file that
runs by itself.
`.trim();

/**
 * Assemble the full system prompt: the skill's verbatim instructions and
 * resources, followed by the headless execution contract.
 */
export function buildSkillSystemPrompt(): string {
  return [
    'You are the `frontend-slides` skill — a specialist that creates stunning, ',
    'zero-dependency, animation-rich HTML presentations. The skill definition and ',
    'its mandatory resources follow verbatim. Apply them exactly.',
    '',
    '===== SKILL.md =====',
    skillMd,
    '',
    '===== viewport-base.css (MANDATORY — include in full in every deck) =====',
    viewportBaseCss,
    '',
    '===== html-template.md =====',
    htmlTemplate,
    '',
    '===== animation-patterns.md =====',
    animationPatterns,
    '',
    '===== STYLE_PRESETS.md =====',
    stylePresets,
    '',
    '===== ' + '='.repeat(60) + ' =====',
    BROWSER_EXECUTION_CONTRACT,
  ].join('\n');
}

// Re-export the raw viewport CSS in case a caller needs to validate output.
export { viewportBaseCss };
