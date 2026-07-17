import Anthropic from '@anthropic-ai/sdk';
import { getClaudeApiKey } from '../providers/runtimeConfig';
import type { Brand, ComposedSlide, SlideLayout } from '../types';

// The presentation composer. Sends the deck's images (as metadata) plus the
// brand identity to Claude and gets back a beautifully arranged, brand-voiced
// slide plan. Runs in the browser directly against the Anthropic API with the
// user's own key (no backend), through the official SDK.

const CLAUDE_MODEL = 'claude-opus-4-8';
const LAYOUTS: SlideLayout[] = ['full', 'two-up', 'four-grid'];
const CAPACITY: Record<SlideLayout, number> = { full: 1, 'two-up': 2, 'four-grid': 4 };

export interface ComposerImage {
  id: string;
  group: string; // e.g. 'Renders'
  label: string; // e.g. 'Photoreal — variation 1'
}

const DECK_TOOL: Anthropic.Tool = {
  name: 'build_deck',
  description: 'Return the composed presentation as an ordered list of slides.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      slides: {
        type: 'array',
        description: 'Slides in presentation order.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            imageIndices: {
              type: 'array',
              items: { type: 'integer' },
              description: 'Indices (from the provided list) of the images on this slide.',
            },
            layout: { type: 'string', enum: ['full', 'two-up', 'four-grid'] },
            title: { type: 'string', description: 'Short slide title in the brand voice.' },
            caption: { type: 'string', description: 'One specific sentence.' },
          },
          required: ['imageIndices', 'layout', 'title', 'caption'],
        },
      },
    },
    required: ['slides'],
  },
};

interface DeckToolInput {
  slides?: Array<{ imageIndices?: number[]; layout?: string; title?: string; caption?: string }>;
}

function isSlideLayout(value: string): value is SlideLayout {
  return (LAYOUTS as string[]).includes(value);
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
  return err instanceof Error ? err : new Error('The composer failed. Please try again.');
}

export async function composeDeck(opts: {
  projectName: string;
  brand: Brand;
  images: ComposerImage[];
}): Promise<ComposedSlide[]> {
  const key = getClaudeApiKey();
  if (!key) throw new Error('Add your Claude API key in Settings to compose with Claude.');
  if (opts.images.length === 0) throw new Error('Generate or upload some images first.');

  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });

  const imageLines = opts.images
    .map((img, i) => `[${i}] ${img.group.toUpperCase()} — ${img.label}`)
    .join('\n');
  const brandLines = [
    opts.brand.name ? `Studio / client: ${opts.brand.name}` : null,
    opts.brand.voice
      ? `Brand voice: ${opts.brand.voice}`
      : 'Brand voice: confident, precise, understated — an architecture practice.',
  ]
    .filter(Boolean)
    .join('\n');

  const system =
    'You are a presentation designer at an architecture studio. You compose beautiful, ' +
    'client-ready concept presentations from a set of generated visuals: you arrange them into a ' +
    'clear, well-paced narrative and write titles and captions in the brand voice. Always answer ' +
    'by calling the build_deck tool.';

  const userText =
    `Project: ${opts.projectName || 'Untitled Project'}\n${brandLines}\n\n` +
    `Available images (reference them by their [index]):\n${imageLines}\n\n` +
    'Compose an ordered deck that tells a concise story (for example: establishing hero render → ' +
    'elevations → axonometric / section views → a closing summary). Group related images: use ' +
    '"full" for a single hero image, "two-up" for a pair, "four-grid" for three or four related ' +
    'images. Put every image on exactly one slide, and never reference an index not in the list. ' +
    'Titles: short (2–5 words) in the brand voice. Captions: one specific sentence.';

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      tools: [DECK_TOOL],
      tool_choice: { type: 'tool', name: 'build_deck' },
      system,
      messages: [{ role: 'user', content: userText }],
    });
  } catch (err) {
    throw friendlyError(err);
  }

  if (message.stop_reason === 'max_tokens') {
    throw new Error('The composed deck was cut short — try composing with fewer images.');
  }

  const toolUse = message.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return a deck. Try again.');
  }
  const input = toolUse.input as DeckToolInput;

  const count = opts.images.length;
  const used = new Set<number>();
  const slides: ComposedSlide[] = [];

  for (const slide of input.slides ?? []) {
    const layout = slide.layout && isSlideLayout(slide.layout) ? slide.layout : 'full';
    const ids: string[] = [];
    for (const idx of slide.imageIndices ?? []) {
      if (Number.isInteger(idx) && idx >= 0 && idx < count && !used.has(idx) && ids.length < CAPACITY[layout]) {
        used.add(idx);
        ids.push(opts.images[idx].id);
      }
    }
    if (ids.length === 0) continue;
    slides.push({
      imageIds: ids,
      layout,
      title: (slide.title ?? '').trim(),
      caption: (slide.caption ?? '').trim(),
    });
  }

  // Never drop an image Claude forgot — append it on its own slide.
  for (let i = 0; i < count; i += 1) {
    if (!used.has(i)) {
      slides.push({ imageIds: [opts.images[i].id], layout: 'full', title: opts.images[i].label, caption: '' });
    }
  }

  if (slides.length === 0) throw new Error('Claude returned an empty deck. Try again.');
  return slides;
}
