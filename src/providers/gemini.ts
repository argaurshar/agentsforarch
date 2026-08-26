import { newId } from '../lib/images';
import { getEngine, getGeminiApiKey, getGeminiModel } from './runtimeConfig';
import { geminiAspect } from './options';
import type { AspectRatio } from './options';
import { abortableDelay, FALLBACK_PROMPT, jobsFor, toInline } from './shared';
import type { Inline } from './shared';
import type { GenerateFailure, GeneratedImage, GenerateRequest, GenerateResult, ImageProvider } from './types';

// Nano Banana Pro (Google Gemini 3 Pro Image) provider. The user's browser
// calls the Generative Language API directly with their own key (this is a
// static, backend-less app), so the key stays on the user's device. All
// generation still flows through the ImageProvider adapter.

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

function friendlyError(status: number, body: string, key: string): string {
  // Never echo the API key back into the UI, even if the upstream error did.
  const safe = key ? body.split(key).join('***') : body;
  if (status === 400 && /API key not valid/i.test(safe)) return 'That Gemini API key is not valid — check it in Settings.';
  if (status === 401 || status === 403) return 'Gemini rejected the request (invalid key or no access). Check your key in Settings.';
  if (status === 404) return 'The configured Gemini model was not found — check the model name in Settings.';
  if (status === 429) return 'Gemini rate limit reached. Wait a moment and try again.';
  return `Gemini request failed (HTTP ${status}). ${safe.slice(0, 160)}`.trim();
}

async function generateOne(
  key: string,
  model: string,
  prompt: string,
  images: Inline[],
  label: string,
  signal?: AbortSignal,
  aspectRatio?: AspectRatio,
): Promise<GeneratedImage> {
  // Key travels in a header, not the URL query string (URLs leak into devtools,
  // logs, and referrers).
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  // Inputs first, then references, so a prompt can address them positionally.
  // `images` may be EMPTY — a text-only tool sends the prompt alone.
  const parts: ({ text: string } | { inlineData: Inline })[] = [
    { text: prompt },
    ...images.map((inlineData) => ({ inlineData })),
  ];
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    // Image-only output — verified with gemini-3-pro-image-preview in production;
    // adding 'TEXT' risks the model returning prose instead of an image. The
    // optional aspect override (also live-verified) shapes e.g. the 4:5 board.
    generationConfig: {
      responseModalities: ['IMAGE'],
      // Normalised: Gemini rejects 'auto' and anything outside its fixed set.
      // Omitting imageConfig makes an edit follow the input's own ratio.
      ...(geminiAspect(aspectRatio) ? { imageConfig: { aspectRatio: geminiAspect(aspectRatio) } } : {}),
    },
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
    // Active only when the user's chosen engine is Gemini (and a key is set) —
    // the engine picker in Settings decides which provider serves generations.
    return getEngine() === 'gemini' && Boolean(getGeminiApiKey());
  }

  async generate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult> {
    const key = getGeminiApiKey();
    if (!key) {
      throw new Error('Add your Google Gemini API key in Settings to generate images.');
    }
    const model = getGeminiModel();
    const start = performance.now();
    // Inputs then references, resolved once for the whole batch. `toInline`
    // (not `inlineFromDataUrl`) so a remote kie result URL used as a style
    // reference resolves instead of throwing and killing every job.
    const inlines = await Promise.all(
      [...req.inputImages, ...(req.options.referenceImages ?? [])].map((u) => toInline(u, signal)),
    );
    const base = req.prompt?.trim() ? req.prompt.trim() : FALLBACK_PROMPT;

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
        images.push(await generateOne(key, model, job.prompt, inlines, job.label, signal, req.options.aspectRatio));
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
