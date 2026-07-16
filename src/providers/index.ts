import { FluxProvider } from './flux';
import { GeminiProvider } from './gemini';
import { MagnificProvider } from './magnific';
import type { ImageProvider } from './types';

export type {
  FeatureKind,
  GeneratedImage,
  GenerateRequest,
  GenerateResult,
  ImageProvider,
} from './types';

// Real image providers, in priority order. Nano Banana Pro activates once the
// user adds their Gemini key in Settings; Magnific/Flux remain env-keyed seams.
// There is no demo/placeholder engine — the app generates real images only, so
// a provider is available only when a key is configured.
const realProviders: ImageProvider[] = [new GeminiProvider(), new MagnificProvider(), new FluxProvider()];

/**
 * The first configured real provider, or `null` when no key is set. This is the
 * ONLY way components obtain a provider — no component imports a provider class
 * directly. Callers must handle `null` by prompting the user to add a key.
 */
export function getActiveProvider(): ImageProvider | null {
  return realProviders.find((p) => p.isConfigured()) ?? null;
}

/** Whether a real image engine is configured and ready to generate. */
export function isImageEngineReady(): boolean {
  return realProviders.some((p) => p.isConfigured());
}

/** Display name of the active engine, or a "not connected" label. */
export function activeProviderName(): string {
  return getActiveProvider()?.name ?? 'Not connected';
}

/** All known real providers, for diagnostics / a future settings surface. */
export function listProviders(): ImageProvider[] {
  return [...realProviders];
}
