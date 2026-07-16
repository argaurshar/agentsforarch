import { FluxProvider } from './flux';
import { GeminiProvider } from './gemini';
import { MagnificProvider } from './magnific';
import { MockProvider } from './mock';
import { isMockForced } from './runtimeConfig';
import type { ImageProvider } from './types';

export type {
  FeatureKind,
  GeneratedImage,
  GenerateRequest,
  GenerateResult,
  ImageProvider,
} from './types';

// The mock is always available so the app runs end-to-end with zero keys.
const mockProvider = new MockProvider();

// Real providers, in priority order. Nano Banana Pro activates once the user
// adds their key in Settings; Magnific/Flux remain env-keyed stubs.
const realProviders: ImageProvider[] = [new GeminiProvider(), new MagnificProvider(), new FluxProvider()];

/**
 * Returns the first configured real provider, else the mock (spec §5). This is
 * the ONLY way components obtain a provider — no component imports a provider
 * class directly.
 */
export function getActiveProvider(): ImageProvider {
  if (isMockForced()) return mockProvider;
  const configured = realProviders.find((p) => p.isConfigured());
  return configured ?? mockProvider;
}

/** All known providers, for diagnostics / a future settings surface. */
export function listProviders(): ImageProvider[] {
  return [...realProviders, mockProvider];
}
