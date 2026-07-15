import type { GenerateRequest, GenerateResult, ImageProvider } from './types';

// Stub only in this build (spec §5). Reads its key from the environment and
// reports `isConfigured() === false` when absent.
export class FluxProvider implements ImageProvider {
  name = 'Flux';

  private get key(): string | undefined {
    return import.meta.env.VITE_FLUX_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.key);
  }

  async generate(_req: GenerateRequest): Promise<GenerateResult> {
    if (!this.isConfigured()) {
      throw new Error('Provider not configured');
    }
    throw new Error('Flux provider is not implemented in this build.');
  }
}
