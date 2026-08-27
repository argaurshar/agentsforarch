// Prompt builders for the Concept & Form category.
//
// These run at the very start of a project, when there is often nothing to
// upload yet — a brief, a plot size, an orientation. That makes this the first
// category whose tools generate from prose rather than from an image, and the
// discipline changes with it: with no input image to hold the model to, every
// constraint that matters has to be stated, because anything left unsaid gets
// invented plausibly and confidently.

import { NO_TEXT } from './clauses';

export type MassingDensity = 'low' | 'medium' | 'high';

const DENSITY_CLAUSE: Record<MassingDensity, string> = {
  low: 'low-rise and spread out — one to three storeys, generous space between volumes',
  medium: 'mid-rise — three to eight storeys, volumes close but distinct',
  high: 'high-density — eight storeys and up, tightly packed with a clear tallest element',
};

/**
 * A brief → a massing model, with no input image at all.
 *
 * The classic first-morning study: how much building, arranged how, on this
 * plot. It is deliberately a WHITE MODEL — no materials, no glazing, no
 * entourage — because the whole value of a massing study is that it refuses to
 * answer questions it is too early to ask. A photoreal render at this stage
 * invites the client to argue about brick colour before the volume is agreed.
 */
export function buildMassingPrompt(a: {
  brief: string;
  siteSize: string;
  density: MassingDensity;
  storeys: string;
  context: string;
}): string {
  const brief = a.brief.trim() || 'a mixed-use building';
  const site = a.siteSize.trim();
  const storeys = a.storeys.trim();
  const context = a.context.trim();

  const parts: string[] = [
    `You are an architect producing an early MASSING STUDY — a physical white study model, photographed. ` +
      `The project is: ${brief}.`,
    site
      ? `The site measures ${site}. Read that as the plot boundary and keep the building within it, with the setbacks a real scheme would have.`
      : 'Choose a plausible rectangular plot and keep the building within it, with realistic setbacks.',
    `The massing is ${DENSITY_CLAUSE[a.density]}.` + (storeys ? ` Aim for roughly ${storeys}.` : ''),
    context
      ? `The immediate context is ${context}; show it as simple lower-contrast grey blocks around the site so the scale reads.`
      : 'Show two or three neighbouring plots as simple lower-contrast grey blocks so the scale reads.',
    // The hard part of a massing prompt is everything it must REFUSE to do.
    'CRITICAL — this is a MASSING model, not a render. Every volume is plain matte white, with no materials, no ' +
      'brick, no timber, no glazing, no window openings, no doors, no railings, no signage, no colour and no ' +
      'entourage. Form only: the volumes, how they step, and how they meet the ground. Do not decorate it, and do ' +
      'not resolve details the design has not reached yet.',
    'Show it as a three-quarter aerial view from about 30 degrees above the horizon, in soft even studio daylight ' +
      'with clean legible shadows that describe the steps and setbacks. Neutral pale grey ground plane, plain ' +
      'background, no sky drama.',
    'Photorealistic photograph of a crisp white architectural study model, shallow depth of field, ultra-detailed.',
    NO_TEXT,
  ];
  return parts.join(' ');
}
