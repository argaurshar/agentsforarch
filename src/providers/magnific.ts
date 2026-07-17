import type { GenerateRequest, GenerateResult, ImageProvider } from './types';

// Stub only in this build (spec §5). Reads its key from the environment and
// reports `isConfigured() === false` when absent. Wiring a real Magnific call
// is deliberately out of scope here.
export class MagnificProvider implements ImageProvider {
  name = 'Magnific';

  private get key(): string | undefined {
    return import.meta.env.VITE_MAGNIFIC_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.key);
  }

  async generate(_req: GenerateRequest, _signal?: AbortSignal): Promise<GenerateResult> {
    if (!this.isConfigured()) {
      throw new Error('Provider not configured');
    }
    throw new Error('Magnific provider is not implemented in this build.');
  }
}
