import { newId } from '../lib/images';
import { outputLabels } from './labels';
import { getGeminiApiKey, getGeminiModel } from './runtimeConfig';
import type { GeneratedImage, GenerateRequest, GenerateResult, ImageProvider } from './types';

// Nano Banana Pro (Google Gemini 3 Pro Image) provider. The user's browser
// calls the Generative Language API directly with their own key (this is a
// static, backend-less app), so the key stays on the user's device. All
// generation still flows through the ImageProvider adapter.

const VIEWPOINT_FULL: Record<string, string> = {
  NE: 'north-east',
  NW: 'north-west',
  SE: 'south-east',
  SW: 'south-west',
};

interface InlineData {
  mimeType?: string;
  data?: string;
}
interface ResponsePart {
  text?: string;
  inlineData?: InlineData;
}
interface ResponseCandidate {
  content?: { parts?: ResponsePart[] };
  finishReason?: string;
}
interface GenerateContentResponse {
  candidates?: ResponseCandidate[];
  promptFeedback?: { blockReason?: string };
}

function inlineFromDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error('The input image could not be read (expected a base64 data URL).');
  return { mimeType: match[1], data: match[2] };
}

/** Expand a request into one prompt+label per output image. */
function jobsFor(req: GenerateRequest, base: string): { label: string; prompt: string }[] {
  const labels = outputLabels(req);
  if (req.feature === 'axonometric') {
    const viewpoints = req.options.viewpoints?.length ? req.options.viewpoints : ['NE'];
    return viewpoints.map((vp, i) => ({
      label: labels[i],
      prompt: `${base}\n\nViewpoint: ${VIEWPOINT_FULL[vp] ?? vp} axonometric.`,
    }));
  }
  if (req.feature === 'render') {
    const variations = Math.max(1, req.options.variations ?? 1);
    return Array.from({ length: variations }, (_, i) => ({
      label: labels[i],
      prompt: variations > 1 ? `${base}\n\nAlternative composition ${i + 1}.` : base,
    }));
  }
  return [{ label: labels[0], prompt: base }];
}

function friendlyError(status: number, body: string): string {
  if (status === 400 && /API key not valid/i.test(body)) return 'That Gemini API key is not valid — check it in Settings.';
  if (status === 401 || status === 403) return 'Gemini rejected the request (invalid key or no access). Check your key in Settings.';
  if (status === 404) return 'The configured Gemini model was not found — check the model name in Settings.';
  if (status === 429) return 'Gemini rate limit reached. Wait a moment and try again.';
  return `Gemini request failed (HTTP ${status}). ${body.slice(0, 160)}`.trim();
}

async function generateOne(
  key: string,
  model: string,
  prompt: string,
  inline: { mimeType: string; data: string },
  label: string,
): Promise<GeneratedImage> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: inline }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });
  } catch {
    throw new Error(
      'Could not reach the Gemini API from the browser (network or CORS block). This app calls Gemini directly with no backend.',
    );
  }

  if (!res.ok) {
    throw new Error(friendlyError(res.status, await res.text().catch(() => '')));
  }

  const json = (await res.json()) as GenerateContentResponse;
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const reason = json.promptFeedback?.blockReason;
    throw new Error(
      reason
        ? `Gemini blocked this request (${reason}). Try a different image or prompt.`
        : 'Gemini did not return an image. Try a different image or prompt.',
    );
  }
  const mime = imagePart.inlineData.mimeType || 'image/png';
  return {
    id: newId('img'),
    url: `data:${mime};base64,${imagePart.inlineData.data}`,
    label,
    createdAt: Date.now(),
  };
}

export class GeminiProvider implements ImageProvider {
  name = 'Nano Banana Pro';

  isConfigured(): boolean {
    return Boolean(getGeminiApiKey());
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const key = getGeminiApiKey();
    if (!key) {
      throw new Error('Add your Google Gemini API key in Settings to generate images.');
    }
    const model = getGeminiModel();
    const start = performance.now();
    const inline = inlineFromDataUrl(req.inputImage);
    const base = req.prompt?.trim()
      ? req.prompt.trim()
      : 'Reimagine this architectural input as a polished presentation image while preserving its geometry and proportions.';

    const images: GeneratedImage[] = [];
    // Sequential to stay within rate limits and surface the first error clearly.
    for (const job of jobsFor(req, base)) {
      images.push(await generateOne(key, model, job.prompt, inline, job.label));
    }

    return {
      images,
      providerName: this.name,
      elapsedMs: Math.round(performance.now() - start),
    };
  }
}
