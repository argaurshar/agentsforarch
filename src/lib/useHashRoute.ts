import { useEffect } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { CATEGORY_KEYS, CATEGORY_ROUTE_PREFIX, FEATURE_KEYS, categoryFromTab, categoryTab } from '../features/registry/keys';
import { REMIX_ROUTE_PREFIX, parseRemix } from '../features/studio/remix';
import type { TabKey } from '../types';

// Two-way sync between the active tab and the URL hash, so destinations are
// deep-linkable and the browser back/forward buttons move between them. Keeps
// the in-memory model as the source of truth; the hash is just a mirror.
//
// The bare hash is the front door (`studio`), not the dashboard: the app's job
// is to take an image and change it, and that is the screen that does it. Every
// older route still resolves — `#/home` is the full tool list, `#/render` is a
// tool — so links people already have keep working.
//
// Two shapes: `#/<tool>` for a tool and `#/c/<category>` for a category. The
// prefix is what keeps them from ever colliding — "interiors" the category and
// "interior" the tool are one letter apart today, and at 54 tools a bare
// namespace would eventually collide for real.

const TOOL_SLUGS: string[] = ['studio', 'home', ...FEATURE_KEYS, 'gallery'];

function hashToTab(hash: string): TabKey | null {
  const slug = hash.replace(/^#\/?/, '').split('?')[0];
  if (slug === '') return 'studio';
  const [head, tail] = slug.split('/');
  // A remix link always lands on the front door — including a malformed one.
  // The URL nobody can edit by hand is the one somebody else sent you, so a
  // stale tool name resolves to the drop zone rather than to nothing at all.
  if (head === REMIX_ROUTE_PREFIX) return 'studio';
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
      // The remix is read BEFORE the tab moves, because moving the tab is what
      // rewrites the hash to `#/studio` — which is how a `#/do/…` link consumes
      // itself exactly once instead of re-firing on every later hash change.
      // Only a successful parse writes: a null here would wipe the intent we
      // just recorded on the rewrite's own hashchange.
      const remix = parseRemix(window.location.hash);
      if (remix) useProjectStore.getState().setStudioPending(remix);
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
