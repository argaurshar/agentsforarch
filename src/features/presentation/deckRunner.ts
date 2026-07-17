import type { GenerateDeckInput } from '../../lib/slidesDeck';
import { generateSlideDeck } from '../../lib/slidesDeck';
import { useProjectStore } from '../../store/useProjectStore';

// Deck generation lifecycle, owned outside the component so the Opus stream
// survives a tab switch or an AI↔Manual toggle (the state lives in the store),
// and a single-flight guard makes a second concurrent (double-billed) stream
// impossible. This module — not the store — imports slidesDeck.ts, keeping the
// Anthropic SDK + vendored skill markdown out of the app's main chunk.

let controller: AbortController | null = null;

/** Start a deck generation. No-ops if one is already running (single-flight). */
export async function runDeck(input: Omit<GenerateDeckInput, 'signal' | 'onProgress'>): Promise<void> {
  const store = useProjectStore.getState();
  if (store.deckStatus === 'loading') return; // a stream is already in flight

  controller = new AbortController();
  const { signal } = controller;
  const patch = () => useProjectStore.getState().patchDeck;

  patch()({ deckStatus: 'loading', deckProgress: 0, deckError: null, deckWarnings: [] });
  try {
    const { html, warnings } = await generateSlideDeck({
      ...input,
      signal,
      onProgress: (chars) => patch()({ deckProgress: chars }),
    });
    if (signal.aborted) {
      patch()({ deckStatus: 'idle' });
      return;
    }
    patch()({ deckHtml: html, deckWarnings: warnings, deckStatus: 'done' });
  } catch (e) {
    if (signal.aborted) {
      patch()({ deckStatus: 'idle' });
      return;
    }
    patch()({ deckStatus: 'error', deckError: e instanceof Error ? e.message : 'The deck generator failed. Please try again.' });
  } finally {
    if (controller?.signal === signal) controller = null;
  }
}

/** Cancel the in-flight deck stream, if any. */
export function cancelDeck(): void {
  controller?.abort();
}
