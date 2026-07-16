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
const CLAUDE_KEY_STORAGE = 'and-studio.claude-key';

let apiKey: string | undefined;
let model: string = DEFAULT_MODEL;
let claudeApiKey: string | undefined;

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

/** Load any remembered key/model on startup. Returns the config. */
export function initRuntimeConfig(): {
  apiKey: string | undefined;
  model: string;
  remembered: boolean;
  claudeApiKey: string | undefined;
} {
  const savedKey = safeGet(KEY_STORAGE);
  if (savedKey) apiKey = savedKey;
  const savedModel = safeGet(MODEL_STORAGE);
  if (savedModel) model = savedModel;
  const savedClaude = safeGet(CLAUDE_KEY_STORAGE);
  if (savedClaude) claudeApiKey = savedClaude;
  return { apiKey, model, remembered: Boolean(savedKey), claudeApiKey };
}

export function getGeminiApiKey(): string | undefined {
  return apiKey;
}

export function getGeminiModel(): string {
  return model || DEFAULT_MODEL;
}

/** The Claude (Anthropic) key used by the presentation composer. */
export function getClaudeApiKey(): string | undefined {
  return claudeApiKey;
}

export function setGeminiConfig(cfg: {
  key: string | undefined;
  model?: string;
  remember: boolean;
  claudeKey?: string | undefined;
}): void {
  apiKey = cfg.key?.trim() || undefined;
  model = cfg.model?.trim() || DEFAULT_MODEL;
  claudeApiKey = cfg.claudeKey?.trim() || undefined;
  if (cfg.remember) {
    safeSet(KEY_STORAGE, apiKey ?? null);
    safeSet(MODEL_STORAGE, model);
    safeSet(CLAUDE_KEY_STORAGE, claudeApiKey ?? null);
  } else {
    safeSet(KEY_STORAGE, null);
    safeSet(MODEL_STORAGE, null);
    safeSet(CLAUDE_KEY_STORAGE, null);
  }
}
