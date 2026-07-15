// Runtime provider configuration — the user's Gemini (Nano Banana Pro) API key
// and model, supplied from the frontend Settings panel rather than an env var.
//
// Persistence is OPT-IN ("remember on this device") and covers ONLY this
// credential + model string — never project data. When "remember" is off the
// key lives in memory for the session. This is the single, deliberate use of
// localStorage in the app.

export const DEFAULT_MODEL = 'gemini-3-pro-image-preview'; // Nano Banana Pro

const KEY_STORAGE = 'and-studio.gemini-key';
const MODEL_STORAGE = 'and-studio.gemini-model';

let apiKey: string | undefined;
let model: string = DEFAULT_MODEL;

function safeGet(name: string): string | undefined {
  try {
    return localStorage.getItem(name) ?? undefined;
  } catch {
    return undefined;
  }
}

function safeSet(name: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(name);
    else localStorage.setItem(name, value);
  } catch {
    /* storage unavailable (private mode / disabled) — stay in-memory */
  }
}

/** Load any remembered key/model on startup. Returns the current config. */
export function initRuntimeConfig(): { apiKey: string | undefined; model: string; remembered: boolean } {
  const savedKey = safeGet(KEY_STORAGE);
  if (savedKey) apiKey = savedKey;
  const savedModel = safeGet(MODEL_STORAGE);
  if (savedModel) model = savedModel;
  return { apiKey, model, remembered: Boolean(savedKey) };
}

export function getGeminiApiKey(): string | undefined {
  return apiKey;
}

export function getGeminiModel(): string {
  return model || DEFAULT_MODEL;
}

export function setGeminiConfig(cfg: { key: string | undefined; model?: string; remember: boolean }): void {
  apiKey = cfg.key?.trim() || undefined;
  model = cfg.model?.trim() || DEFAULT_MODEL;
  if (cfg.remember && apiKey) {
    safeSet(KEY_STORAGE, apiKey);
    safeSet(MODEL_STORAGE, model);
  } else {
    safeSet(KEY_STORAGE, null);
    safeSet(MODEL_STORAGE, null);
  }
}
