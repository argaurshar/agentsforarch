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
const FORCE_MOCK_STORAGE = 'and-studio.force-mock';

let apiKey: string | undefined;
let model: string = DEFAULT_MODEL;
let forceMock = false;

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

/** Load any remembered key/model/preference on startup. Returns the config. */
export function initRuntimeConfig(): {
  apiKey: string | undefined;
  model: string;
  remembered: boolean;
  forceMock: boolean;
} {
  const savedKey = safeGet(KEY_STORAGE);
  if (savedKey) apiKey = savedKey;
  const savedModel = safeGet(MODEL_STORAGE);
  if (savedModel) model = savedModel;
  forceMock = safeGet(FORCE_MOCK_STORAGE) === '1';
  return { apiKey, model, remembered: Boolean(savedKey), forceMock };
}

export function getGeminiApiKey(): string | undefined {
  return apiKey;
}

export function getGeminiModel(): string {
  return model || DEFAULT_MODEL;
}

/** When true, the app uses the mock engine even if a key is configured. */
export function isMockForced(): boolean {
  return forceMock;
}

export function setGeminiConfig(cfg: {
  key: string | undefined;
  model?: string;
  remember: boolean;
  forceMock?: boolean;
}): void {
  apiKey = cfg.key?.trim() || undefined;
  model = cfg.model?.trim() || DEFAULT_MODEL;
  forceMock = Boolean(cfg.forceMock);
  if (cfg.remember) {
    safeSet(KEY_STORAGE, apiKey ?? null);
    safeSet(MODEL_STORAGE, model);
    safeSet(FORCE_MOCK_STORAGE, forceMock ? '1' : null);
  } else {
    safeSet(KEY_STORAGE, null);
    safeSet(MODEL_STORAGE, null);
    safeSet(FORCE_MOCK_STORAGE, null);
  }
}
