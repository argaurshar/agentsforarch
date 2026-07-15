import { FluxProvider } from './flux';
import { MagnificProvider } from './magnific';
import { MockProvider } from './mock';
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

// Real providers, in priority order. Stubs in this build.
const realProviders: ImageProvider[] = [new MagnificProvider(), new FluxProvider()];

/**
 * Returns the first configured real provider, else the mock (spec §5). This is
 * the ONLY way components obtain a provider — no component imports a provider
 * class directly.
 */
export function getActiveProvider(): ImageProvider {
  const configured = realProviders.find((p) => p.isConfigured());
  return configured ?? mockProvider;
}

/** All known providers, for diagnostics / a future settings surface. */
export function listProviders(): ImageProvider[] {
  return [...realProviders, mockProvider];
}
