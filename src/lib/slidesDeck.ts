import Anthropic from '@anthropic-ai/sdk';
import { getClaudeApiKey } from '../providers/runtimeConfig';
import type { Brand } from '../types';
import { IMAGE_TOKEN, LOGO_TOKEN, buildSkillSystemPrompt } from './skill/frontendSlides';

// Presentation generator (spec §8 Concept Presentation, extended).
//
// Runs the vendored `frontend-slides` skill headless: it sends the skill's own
// instructions (system prompt) plus the project's brand + content + image
// manifest to Claude, and gets back a single self-contained HTML presentation.
// Runs in the browser against the Anthropic API with the user's own key.
//
// This path is used ONLY by the Concept Presentation tab.

const CLAUDE_MODEL = 'claude-opus-4-8';
const MAX_TOKENS = 32000;

export type DeckPurpose = 'Pitch deck' | 'Teaching / tutorial' | 'Conference talk' | 'Internal presentation';
export type DeckLength = 'Short (5–10 slides)' | 'Medium (10–20 slides)' | 'Long (20+ slides)';
export type DeckDensity = 'Low density / speaker-led' | 'High density / reading-first';

export interface DeckOptions {
  purpose: DeckPurpose;
  length: DeckLength;
  density: DeckDensity;
  notes?: string;
}

/** An image made available to the deck. `url` is a dataURL embedded after generation. */
export interface DeckImage {
  id: string;
  group: string; // e.g. 'Renders'
  label: string; // e.g. 'Photoreal — variation 1'
  url: string; // dataURL
}

export interface GenerateDeckInput {
  projectName: string;
  brand: Brand;
  images: DeckImage[];
  options: DeckOptions;
  /** Called with the running character count as the HTML streams in. */
  onProgress?: (chars: number) => void;
  signal?: AbortSignal;
}

function friendlyError(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) {
    return new Error('Claude rejected the key (invalid or unauthorized). Check it in Settings.');
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new Error('Claude rate limit reached. Wait a moment and try again.');
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new Error('Could not reach the Claude API from the browser (network or CORS block).');
  }
  if (err instanceof Anthropic.APIError) {
    return new Error(`Claude request failed (HTTP ${err.status ?? '?'}). ${err.message}`);
  }
  return err instanceof Error ? err : new Error('The deck generator failed. Please try again.');
}

/** Pull a clean HTML document out of the model's text (strip fences/preamble). */
export function extractHtml(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:html)?\s*\n?([\s\S]*?)\n?```$/i.exec(s);
  if (fence) s = fence[1].trim();
  const doctype = s.search(/<!doctype html/i);
  if (doctype > 0) {
    // Trim any preamble before the doctype (doctype at 0 is already clean).
    s = s.slice(doctype);
  } else if (doctype === -1) {
    // No doctype at all — fall back to the opening <html> tag.
    const htmlOpen = s.search(/<html[\s>]/i);
    if (htmlOpen > 0) s = s.slice(htmlOpen);
  }
  return s.trim();
}

/** Swap the model's placeholder tokens for the real embedded image dataURLs. */
export function substituteImages(html: string, images: DeckImage[], logo?: string): string {
  let out = html;
  images.forEach((img, i) => {
    out = out.split(IMAGE_TOKEN(i)).join(img.url);
  });
  if (logo) out = out.split(LOGO_TOKEN).join(logo);
  return out;
}

function buildUserMessage(input: GenerateDeckInput): string {
  const { projectName, brand, images, options } = input;

  const brandLines = [
    `Studio / client name: ${brand.name || 'AND Studio'}`,
    `Voice / tone: ${brand.voice || 'confident, precise, understated — an architecture practice'}`,
    `Palette — primary/headings: ${brand.primary}; accent: ${brand.accent}; background: ${brand.background}; body text: ${brand.text}`,
    `Heading font: ${brand.headingFont}`,
    `Body font: ${brand.bodyFont}`,
    `Logo: ${brand.logo ? `provided — reference it as ${LOGO_TOKEN}` : 'none provided'}`,
  ].join('\n');

  const imageManifest =
    images.length > 0
      ? images.map((img, i) => `${IMAGE_TOKEN(i)}  —  ${img.group.toUpperCase()}: ${img.label}`).join('\n')
      : '(no images — use CSS-generated visuals: gradients, geometric shapes, patterns)';

  const notes = options.notes?.trim()
    ? `\nTalking points / content notes:\n${options.notes.trim()}\n`
    : '';

  return [
    `Project: ${projectName || 'Untitled Project'}`,
    '',
    'Brand identity (use as the committed style — drive :root variables, fonts, and voice from this):',
    brandLines,
    '',
    `Purpose: ${options.purpose}`,
    `Target length: ${options.length}`,
    `Density: ${options.density}`,
    notes,
    'Images available (reference each ONLY by its exact token):',
    imageManifest,
    '',
    'This is an architecture studio conveying a building concept. Weave these',
    'visuals into a clear, well-paced narrative: an establishing hero, then the',
    "studies (renders, elevations, axonometric / section views), then a closing.",
    'Write titles and captions in the brand voice. Produce the finished',
    'self-contained HTML deck now, following the skill and the execution contract.',
  ].join('\n');
}

/**
 * Generate a self-contained HTML presentation with the frontend-slides skill.
 * Returns the final HTML (image tokens already replaced with embedded images).
 */
export async function generateSlideDeck(input: GenerateDeckInput): Promise<string> {
  const key = getClaudeApiKey();
  if (!key) throw new Error('Add your Claude API key in Settings to generate a presentation.');

  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  const system = buildSkillSystemPrompt();
  const userText = buildUserMessage(input);

  let message: Anthropic.Message;
  try {
    const stream = client.messages.stream(
      {
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'adaptive' },
        system,
        messages: [{ role: 'user', content: userText }],
      },
      input.signal ? { signal: input.signal } : undefined,
    );
    if (input.onProgress) {
      stream.on('text', (_delta, snapshot) => input.onProgress?.(snapshot.length));
    }
    message = await stream.finalMessage();
  } catch (err) {
    throw friendlyError(err);
  }

  const raw = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const html = extractHtml(raw);
  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) {
    if (message.stop_reason === 'max_tokens') {
      throw new Error('The deck was too long to finish. Try a shorter length or fewer images.');
    }
    throw new Error('Claude did not return a complete presentation. Try again.');
  }

  return substituteImages(html, input.images, input.brand.logo);
}
