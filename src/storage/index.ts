import { MemoryStorageAdapter } from './memory';
import type { StorageAdapter } from './types';

export type { StorageAdapter } from './types';

// The single storage instance the app uses. Swap this line to change backends.
export const storage: StorageAdapter = new MemoryStorageAdapter();
