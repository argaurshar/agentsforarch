import { newId } from '../lib/images';
import { outputLabels } from './labels';
import { getGeminiApiKey, getGeminiModel } from './runtimeConfig';
import type { GenerateFailure, GeneratedImage, GenerateRequest, GenerateResult, ImageProvider } from './types';

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
  // A refine is always a single edit of one existing output.
  if (req.options.refine) {
    return [{ label: labels[0] ?? 'Refined', prompt: base }];
  }
  if (req.feature === 'axonometric') {
    const viewpoints = req.options.viewpoints?.length ? req.options.viewpoints : ['NE'];
    return viewpoints.map((vp, i) => ({
      label: labels[i],
      prompt: `${base}\n\nViewpoint: ${VIEWPOINT_FULL[vp] ?? vp} axonometric.`,
    }));
  }
  if (req.feature === 'elevation') {
    // The "all faces" batch expands to one job per requested face.
    const faces = req.options.viewpoints?.length ? req.options.viewpoints : null;
    if (faces && faces.length > 1) {
      return faces.map((face, i) => ({
        label: labels[i],
        prompt: `${base}\n\nFace: the ${face.toLowerCase()} elevation, viewed straight-on with no perspective.`,
      }));
    }
    return [{ label: labels[0], prompt: base }];
  }
  // render
  const variations = Math.max(1, req.options.variations ?? 1);
  return Array.from({ length: variations }, (_, i) => ({
    label: labels[i],
    prompt: variations > 1 ? `${base}\n\nAlternative composition ${i + 1}.` : base,
  }));
}

function friendlyError(status: number, body: string, key: string): string {
  // Never echo the API key back into the UI, even if the upstream error did.
  const safe = key ? body.split(key).join('***') : body;
  if (status === 400 && /API key not valid/i.test(safe)) return 'That Gemini API key is not valid — check it in Settings.';
  if (status === 401 || status === 403) return 'Gemini rejected the request (invalid key or no access). Check your key in Settings.';
  if (status === 404) return 'The configured Gemini model was not found — check the model name in Settings.';
  if (status === 429) return 'Gemini rate limit reached. Wait a moment and try again.';
  return `Gemini request failed (HTTP ${status}). ${safe.slice(0, 160)}`.trim();
}

/** Sleep that resolves early (does not reject) when the signal aborts. */
function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (!ms || signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done);
  });
}

async function generateOne(
  key: string,
  model: string,
  prompt: string,
  inline: { mimeType: string; data: string },
  label: string,
  signal?: AbortSignal,
  reference?: { mimeType: string; data: string } | null,
): Promise<GeneratedImage> {
  // Key travels in a header, not the URL query string (URLs leak into devtools,
  // logs, and referrers).
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  // The primary input goes first; an optional style reference (mood board)
  // follows so the prompt can point at "the attached reference image".
  const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [
    { text: prompt },
    { inlineData: inline },
  ];
  if (reference) parts.push({ inlineData: reference });
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    // Image-only output — verified with gemini-3-pro-image-preview in production;
    // adding 'TEXT' risks the model returning prose instead of an image.
    generationConfig: { responseModalities: ['IMAGE'] },
  });

  // One retry on a transient 429/503 (rate limit / overload) with jitter.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body,
        signal,
      });
    } catch (err) {
      if (signal?.aborted) throw err; // cancellation — let the caller stop the batch
      throw new Error(
        'Could not reach the Gemini API from the browser (network or CORS block). This app calls Gemini directly with no backend.',
      );
    }

    if (res.ok) {
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
      return { id: newId('img'), url: `data:${mime};base64,${imagePart.inlineData.data}`, label, createdAt: Date.now() };
    }

    const retriable = res.status === 429 || res.status === 503;
    if (retriable && attempt === 0 && !signal?.aborted) {
      await abortableDelay(1200 + Math.random() * 600, signal);
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      continue;
    }
    throw new Error(friendlyError(res.status, await res.text().catch(() => ''), key));
  }
  throw new Error('Gemini request failed. Please try again.'); // unreachable
}

export class GeminiProvider implements ImageProvider {
  name = 'Nano Banana Pro';

  isConfigured(): boolean {
    return Boolean(getGeminiApiKey());
  }

  async generate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult> {
    const key = getGeminiApiKey();
    if (!key) {
      throw new Error('Add your Google Gemini API key in Settings to generate images.');
    }
    const model = getGeminiModel();
    const start = performance.now();
    const inline = inlineFromDataUrl(req.inputImage);
    const reference = req.options.referenceImage ? inlineFromDataUrl(req.options.referenceImage) : null;
    const base = req.prompt?.trim()
      ? req.prompt.trim()
      : 'Reimagine this architectural input as a polished presentation image while preserving its geometry and proportions.';

    const jobs = jobsFor(req, base);
    const images: GeneratedImage[] = [];
    const failures: GenerateFailure[] = [];

    // Sequential to stay within rate limits. A single job's failure NEVER
    // discards the images already generated (and paid for) — it's recorded as a
    // partial failure instead. Abort stops the batch and keeps what succeeded.
    for (let i = 0; i < jobs.length; i += 1) {
      if (signal?.aborted) break;
      if (i > 0) {
        await abortableDelay(700, signal); // gentle pacing between calls
        if (signal?.aborted) break;
      }
      const job = jobs[i];
      try {
        images.push(await generateOne(key, model, job.prompt, inline, job.label, signal, reference));
      } catch (err) {
        if (signal?.aborted) break; // cancellation — keep successes, stop
        failures.push({ label: job.label, error: err instanceof Error ? err.message : 'Generation failed.' });
      }
    }

    return {
      images,
      failures: failures.length ? failures : undefined,
      providerName: this.name,
      elapsedMs: Math.round(performance.now() - start),
    };
  }
}
