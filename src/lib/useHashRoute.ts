import { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import type { TabKey } from '../types';

// Two-way sync between the active tab and the URL hash, so tabs are deep-linkable
// (#/interior) and the browser back/forward buttons move between them. Keeps the
// in-memory model as the source of truth; the hash is just a mirror.

const TAB_SLUGS: TabKey[] = ['home', 'render', 'elevation', 'axonometric', 'interior', 'presentation', 'gallery'];

function hashToTab(hash: string): TabKey | null {
  const slug = hash.replace(/^#\/?/, '');
  if (slug === '') return 'home';
  return (TAB_SLUGS as string[]).includes(slug) ? (slug as TabKey) : null;
}

export function useHashRoute(): void {
  const tab = useProjectStore((s) => s.tab);
  const setTab = useProjectStore((s) => s.setTab);

  // Hash → tab (initial load + browser back/forward).
  useEffect(() => {
    const apply = () => {
      const next = hashToTab(window.location.hash);
      if (next && next !== useProjectStore.getState().tab) setTab(next);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [setTab]);

  // Tab → hash. A user tab switch pushes a history entry so Back returns to the
  // previous tab; a hash-driven change is already in sync (no-op).
  useEffect(() => {
    const want = `#/${tab}`;
    if (window.location.hash !== want) window.location.hash = want;
  }, [tab]);
}
