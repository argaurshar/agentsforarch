import { newId } from '../lib/images';
import { getEngine, getKieApiKey, KIE_MODEL } from './runtimeConfig';
import { abortableDelay, FALLBACK_PROMPT, jobsFor } from './shared';
import type { GenerateFailure, GeneratedImage, GenerateRequest, GenerateResult, ImageProvider } from './types';

// kie.ai (Nano Banana 2) provider. kie.ai wraps Google's Nano Banana 2 image
// model behind an async task API: upload the input image(s), create a task,
// poll until it succeeds, then fetch the result URL. The user's browser calls
// kie.ai directly with their own key (this is a static, backend-less app).
//
// API contract (docs.kie.ai):
//   POST https://api.kie.ai/api/v1/jobs/createTask
//        { model: 'nano-banana-2', input: { prompt, image_input?: string[],
//          aspect_ratio, resolution, output_format } }        → { code, data: { taskId } }
//   GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=…   → { data: { state, resultJson, failMsg } }
//        state: waiting | queuing | generating | success | fail; resultJson is a
//        JSON *string* containing { resultUrls: string[] }.
//   POST https://kieai.redpandaai.co/api/file-stream-upload   (multipart)
//        fields file / uploadPath / fileName                  → { data: { downloadUrl } }
// Every response uses the { code, msg, data } envelope; HTTP 200 with a
// non-200 `code` is still an error.

const API_BASE = 'https://api.kie.ai/api/v1';
const UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';
const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 4 * 60 * 1000; // per image

interface KieEnvelope<T> {
  code?: number;
  msg?: string;
  data?: T;
}

interface KieRecord {
  state?: string;
  resultJson?: string;
  failMsg?: string;
  failCode?: string | number;
}

function friendlyKieError(status: number, msg: string, key: string): string {
  const safe = key ? msg.split(key).join('***') : msg;
  if (status === 401) return 'That kie.ai API key is not valid — check it in Settings.';
  if (status === 402) return 'Your kie.ai account is out of credits — top up at kie.ai to keep generating.';
  if (status === 429) return 'kie.ai rate limit reached. Wait a moment and try again.';
  if (status === 422) return `kie.ai rejected the request. ${safe.slice(0, 160)}`.trim();
  return `kie.ai request failed (HTTP ${status}). ${safe.slice(0, 160)}`.trim();
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error('The input image could not be read (expected a base64 data URL).');
  const bytes = atob(match[2]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: match[1] });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the generated image.'));
    reader.readAsDataURL(blob);
  });
}

async function kieFetch<T>(key: string, url: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${key}`, ...(init.headers ?? {}) }, signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error(
      'Could not reach kie.ai from the browser (network or CORS block). This app calls kie.ai directly with no backend.',
    );
  }
  const body = (await res.json().catch(() => ({}))) as KieEnvelope<T>;
  if (!res.ok) throw new Error(friendlyKieError(res.status, body.msg ?? '', key));
  if (typeof body.code === 'number' && body.code !== 200) {
    throw new Error(friendlyKieError(body.code, body.msg ?? '', key));
  }
  return body.data as T;
}

/** Upload one dataURL input; returns a kie.ai-hosted URL usable in image_input. */
async function uploadImage(key: string, dataUrl: string, signal?: AbortSignal): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
  const form = new FormData();
  form.append('file', blob, `input.${ext}`);
  form.append('uploadPath', 'and-studio/inputs');
  form.append('fileName', `input-${Date.now()}.${ext}`);
  const data = await kieFetch<{ downloadUrl?: string; fileUrl?: string }>(
    key,
    UPLOAD_URL,
    { method: 'POST', body: form },
    signal,
  );
  const url = data?.downloadUrl || data?.fileUrl;
  if (!url) throw new Error('kie.ai did not return a URL for the uploaded input image.');
  return url;
}

async function generateOne(
  key: string,
  prompt: string,
  imageUrls: string[],
  label: string,
  signal?: AbortSignal,
  aspectRatio?: string,
): Promise<GeneratedImage> {
  const created = await kieFetch<{ taskId?: string }>(
    key,
    `${API_BASE}/jobs/createTask`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: KIE_MODEL,
        input: {
          prompt,
          image_input: imageUrls,
          aspect_ratio: aspectRatio ?? 'auto', // default: follow the input image's shape
          resolution: '1K',
          output_format: 'png',
        },
      }),
    },
    signal,
  );
  const taskId = created?.taskId;
  if (!taskId) throw new Error('kie.ai did not return a task id.');

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    await abortableDelay(POLL_MS, signal);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (Date.now() > deadline) throw new Error('kie.ai generation timed out. Please try again.');
    const record = await kieFetch<KieRecord>(
      key,
      `${API_BASE}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { method: 'GET' },
      signal,
    );
    const state = record?.state;
    if (state === 'fail') {
      throw new Error(record?.failMsg ? `kie.ai could not generate this image: ${record.failMsg}` : 'kie.ai generation failed.');
    }
    if (state !== 'success') continue; // waiting | queuing | generating

    let resultUrl: string | undefined;
    try {
      resultUrl = (JSON.parse(record?.resultJson ?? '{}') as { resultUrls?: string[] }).resultUrls?.[0];
    } catch {
      /* fall through to the missing-URL error */
    }
    if (!resultUrl) throw new Error('kie.ai reported success but returned no image URL.');
    // Persist the image as a dataURL — kie.ai result URLs expire after ~20
    // minutes, far shorter than a working session. If the CDN blocks a browser
    // fetch, fall back to the remote URL so the result is not lost.
    try {
      const res = await fetch(resultUrl, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const url = await blobToDataUrl(await res.blob());
      return { id: newId('img'), url, label, createdAt: Date.now() };
    } catch (err) {
      if (signal?.aborted) throw err;
      return { id: newId('img'), url: resultUrl, label, createdAt: Date.now() };
    }
  }
}

export class KieProvider implements ImageProvider {
  name = 'Nano Banana 2 · kie.ai';

  isConfigured(): boolean {
    return getEngine() === 'kie' && Boolean(getKieApiKey());
  }

  async generate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult> {
    const key = getKieApiKey();
    if (!key) {
      throw new Error('Add your kie.ai API key in Settings to generate images.');
    }
    const start = performance.now();
    const base = req.prompt?.trim() ? req.prompt.trim() : FALLBACK_PROMPT;
    const jobs = jobsFor(req, base);
    const images: GeneratedImage[] = [];
    const failures: GenerateFailure[] = [];

    // Upload the input (and optional style reference) once for the whole batch.
    let imageUrls: string[];
    try {
      imageUrls = [await uploadImage(key, req.inputImage, signal)];
      if (req.options.referenceImage) imageUrls.push(await uploadImage(key, req.options.referenceImage, signal));
    } catch (err) {
      if (signal?.aborted) return { images, providerName: this.name, elapsedMs: Math.round(performance.now() - start) };
      throw err instanceof Error ? err : new Error('Could not upload the input image to kie.ai.');
    }

    // Sequential like the Gemini provider: one job's failure never discards the
    // images already generated (and paid for); abort keeps what succeeded.
    for (let i = 0; i < jobs.length; i += 1) {
      if (signal?.aborted) break;
      if (i > 0) {
        await abortableDelay(700, signal);
        if (signal?.aborted) break;
      }
      const job = jobs[i];
      try {
        images.push(await generateOne(key, job.prompt, imageUrls, job.label, signal, req.options.aspectRatio));
      } catch (err) {
        if (signal?.aborted) break;
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
