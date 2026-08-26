// Runtime provider configuration — the user's image-engine choice and API keys,
// supplied from the frontend Settings panel rather than an env var. Two image
// engines are supported: Google Gemini (Nano Banana Pro, called directly) and
// kie.ai (Nano Banana 2, called via kie.ai's task API).
//
// Persistence is OPT-IN ("remember on this device") and covers ONLY these
// credentials + engine/model strings — never project data. When "remember" is
// off the keys live in memory for the session. This is the single, deliberate
// use of localStorage in the app.

export type EngineKey = 'gemini' | 'kie';

export const DEFAULT_MODEL = 'gemini-3-pro-image-preview'; // Nano Banana Pro
export const KIE_MODEL = 'nano-banana-2'; // kie.ai's Nano Banana 2 model id

const ENGINE_STORAGE = 'and-studio.engine';
const KEY_STORAGE = 'and-studio.gemini-key';
const MODEL_STORAGE = 'and-studio.gemini-model';
const KIE_KEY_STORAGE = 'and-studio.kie-key';
// Retired with the Concept Presentation tab. Kept only so startup can delete a
// key an earlier version remembered — an orphaned credential should not sit in
// a user's localStorage forever with nothing left to use it.
const RETIRED_CLAUDE_KEY_STORAGE = 'and-studio.claude-key';

let engine: EngineKey = 'gemini';
let apiKey: string | undefined;
let model: string = DEFAULT_MODEL;
let kieApiKey: string | undefined;

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

/** Load any remembered engine/keys on startup. Returns the config. */
export function initRuntimeConfig(): {
  engine: EngineKey;
  apiKey: string | undefined;
  model: string;
  kieApiKey: string | undefined;
  remembered: boolean;
} {
  safeSet(RETIRED_CLAUDE_KEY_STORAGE, null);
  const savedKey = safeGet(KEY_STORAGE);
  if (savedKey) apiKey = savedKey;
  const savedModel = safeGet(MODEL_STORAGE);
  if (savedModel) model = savedModel;
  const savedKie = safeGet(KIE_KEY_STORAGE);
  if (savedKie) kieApiKey = savedKie;
  const savedEngine = safeGet(ENGINE_STORAGE);
  if (savedEngine === 'gemini' || savedEngine === 'kie') engine = savedEngine;
  return {
    engine,
    apiKey,
    model,
    kieApiKey,
    remembered: Boolean(savedKey || savedKie),
  };
}

export function getEngine(): EngineKey {
  return engine;
}

export function getGeminiApiKey(): string | undefined {
  return apiKey;
}

export function getGeminiModel(): string {
  return model || DEFAULT_MODEL;
}

export function getKieApiKey(): string | undefined {
  return kieApiKey;
}

export function setGeminiConfig(cfg: {
  engine?: EngineKey;
  key: string | undefined;
  model?: string;
  kieKey?: string | undefined;
  remember: boolean;
}): void {
  if (cfg.engine) engine = cfg.engine;
  apiKey = cfg.key?.trim() || undefined;
  model = cfg.model?.trim() || DEFAULT_MODEL;
  kieApiKey = cfg.kieKey?.trim() || undefined;
  if (cfg.remember) {
    safeSet(ENGINE_STORAGE, engine);
    safeSet(KEY_STORAGE, apiKey ?? null);
    safeSet(MODEL_STORAGE, model);
    safeSet(KIE_KEY_STORAGE, kieApiKey ?? null);
  } else {
    safeSet(ENGINE_STORAGE, null);
    safeSet(KEY_STORAGE, null);
    safeSet(MODEL_STORAGE, null);
    safeSet(KIE_KEY_STORAGE, null);
  }
}
