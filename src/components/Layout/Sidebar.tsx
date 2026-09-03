import { BRAND } from '../../lib/brand';
import { Images, LayoutDashboard, Sparkles } from 'lucide-react';
import { CATEGORIES, featureDef } from '../../features/registry';
import type { LucideIcon } from 'lucide-react';
import { categoryFromTab, isFeatureKind } from '../../features/registry/keys';
import { useProjectStore } from '../../store/useProjectStore';
import type { TabKey } from '../../types';

interface NavItem {
  key: TabKey;
  name: string;
  /** Surfaced as the row's tooltip only — the nav itself stays single-line. */
  sub: string;
  icon: LucideIcon;
  /** Tools in this destination, shown as a count. Absent for Home / Gallery. */
  count?: number;
}

// One row per CATEGORY, not per tool.
//
// A row per tool was right at five and wrong at eleven: a flat list stops being
// scannable somewhere around a dozen rows, and this app is heading for ~54
// tools. Categories give the nav a fixed height — six rows at most, forever.
//
// Still derived, and now doubly so: a category is in this list because a tool
// declared it, and it disappears when it holds nothing. So a category arrives
// the day its first tool does, rather than sitting here as an empty promise, and
// a tool is still reachable by existing rather than by being remembered.
const NAV_ITEMS: NavItem[] = [
  { key: 'studio', name: 'Start', sub: 'Drop an image, pick what it becomes', icon: Sparkles },
  { key: 'home', name: 'All tools', sub: 'Every tool, with full controls', icon: LayoutDashboard },
  ...CATEGORIES.map((c) => ({ key: c.tab, name: c.label, sub: c.blurb, icon: c.icon, count: c.features.length })),
  { key: 'gallery', name: 'Gallery', sub: 'All Outputs · Save / Load', icon: Images },
];

interface SidebarProps {
  /** Called after a nav item is chosen — used to close the mobile drawer. */
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const tab = useProjectStore((s) => s.tab);
  const setTab = useProjectStore((s) => s.setTab);
  const activeCategory = useProjectStore((s) => (isFeatureKind(s.tab) ? featureDef(s.tab).category : categoryFromTab(s.tab)));

  return (
    <nav
      aria-label="Features"
      className="flex w-64 shrink-0 flex-col bg-gradient-to-b from-ink-raised to-ink text-bone"
    >
      {/* Brand lockup — echoes andstudio.in. To use the exact logo, replace the
          "AND" wordmark block below with:  <img src="/logo.svg" alt={BRAND.name}
          className="h-8 w-auto" />  (drop the SVG/PNG into /public).
          h-16 so the lockup shares a baseline with the top bar. */}
      <div className="flex h-16 shrink-0 items-center px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-control bg-ochre font-display text-label font-bold text-white">
            A
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-title text-bone">{BRAND.name}</span>
            {/* On ink, alpha below ~60% drops under AA. */}
            <span className="text-caption text-bone/65">{BRAND.promise}</span>
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1 px-3 pb-3 pt-2">
        {NAV_ITEMS.map((item) => {
          // A tool screen keeps its own category row lit — otherwise opening a
          // tool from the rail unlights the whole nav and you are nowhere.
          const active = tab === item.key || (categoryFromTab(item.key) !== null && categoryFromTab(item.key) === activeCategory);
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                // A stable handle for tests. The QA suite used to select nav rows
                // POSITIONALLY (nav.nth(1), nth(2), nth(4)); now that this list is
                // derived from the registry, inserting a tool would silently
                // re-point every one of those assertions at the wrong screen.
                data-nav={item.key}
                title={item.sub}
                onClick={() => {
                  setTab(item.key);
                  onNavigate?.();
                }}
                // The active row is a raised tint plus an ochre rail, not an ochre
                // fill: the accent glow is authored for light surfaces and muddies
                // on near-black, and a solid fill on eight rows overspends the
                // one-accent-per-panel budget.
                className={`group relative flex w-full items-center gap-3 rounded-field px-3 py-2 text-left transition-all ${
                  active
                    ? 'bg-white/10 text-bone before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-ochre'
                    : 'text-bone/70 hover:bg-white/[0.06] hover:text-bone'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={1.75}
                  className={active ? 'text-ochre' : 'text-bone/60 transition-colors group-hover:text-bone'}
                />
                <span className="truncate text-label font-medium">{item.name}</span>
                {item.count ? (
                  <span className="ml-auto shrink-0 font-mono text-caption text-bone/60">{item.count}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto px-5 pb-5 pt-4">
        {/* This used to read "Internal tool · single studio". It stopped being
            true the moment a result became shareable: the footer of a page a
            stranger can land on should tell them where their image goes, not
            who the app was originally for. */}
        <p className="text-caption text-bone/60">Runs in your browser · your key, your images</p>
      </div>
    </nav>
  );
}
