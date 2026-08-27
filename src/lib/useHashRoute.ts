import { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { CATEGORY_KEYS, CATEGORY_ROUTE_PREFIX, FEATURE_KEYS, categoryFromTab, categoryTab } from '../features/registry/keys';
import type { TabKey } from '../types';

// Two-way sync between the active tab and the URL hash, so destinations are
// deep-linkable and the browser back/forward buttons move between them. Keeps
// the in-memory model as the source of truth; the hash is just a mirror.
//
// Two shapes: `#/<tool>` for a tool and `#/c/<category>` for a category. The
// prefix is what keeps them from ever colliding — "interiors" the category and
// "interior" the tool are one letter apart today, and at 54 tools a bare
// namespace would eventually collide for real.

const TOOL_SLUGS: string[] = ['home', ...FEATURE_KEYS, 'gallery'];

function hashToTab(hash: string): TabKey | null {
  const slug = hash.replace(/^#\/?/, '');
  if (slug === '') return 'home';
  const [head, tail] = slug.split('/');
  if (head === CATEGORY_ROUTE_PREFIX) {
    return (CATEGORY_KEYS as readonly string[]).includes(tail) ? categoryTab(tail as never) : null;
  }
  return TOOL_SLUGS.includes(slug) ? (slug as TabKey) : null;
}

function tabToHash(tab: TabKey): string {
  const category = categoryFromTab(tab);
  return category ? `#/${CATEGORY_ROUTE_PREFIX}/${category}` : `#/${tab}`;
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
    const want = tabToHash(tab);
    if (window.location.hash !== want) window.location.hash = want;
  }, [tab]);
}
