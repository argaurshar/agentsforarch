import { Images, LayoutDashboard } from 'lucide-react';
import { ALL_FEATURES } from '../../features/registry';
import type { LucideIcon } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import type { TabKey } from '../../types';

interface NavItem {
  key: TabKey;
  name: string;
  /** Surfaced as the row's tooltip only — the nav itself stays single-line. */
  sub: string;
  icon: LucideIcon;
}

// All features are always present and always clickable (spec §1). None is
// ever locked, greyed out, or gated behind another feature.
const NAV_ITEMS: NavItem[] = [
  { key: 'home', name: 'Home', sub: 'Project Dashboard', icon: LayoutDashboard },
  // Generation tools are derived — a new one appears here by existing, not by
  // being remembered. This row used to be hand-maintained, which is how a
  // feature could ship and be unreachable.
  ...ALL_FEATURES.map((f) => ({ key: f.key, name: f.name, sub: f.blurb, icon: f.icon })),
  { key: 'gallery', name: 'Gallery', sub: 'All Outputs · Save / Load', icon: Images },
];

interface SidebarProps {
  /** Called after a nav item is chosen — used to close the mobile drawer. */
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const tab = useProjectStore((s) => s.tab);
  const setTab = useProjectStore((s) => s.setTab);

  return (
    <nav
      aria-label="Features"
      className="flex w-64 shrink-0 flex-col bg-gradient-to-b from-ink-raised to-ink text-bone"
    >
      {/* Brand lockup — echoes andstudio.in. To use the exact logo, replace the
          "AND" wordmark block below with:  <img src="/logo.svg" alt="AND Studio"
          className="h-8 w-auto" />  (drop the SVG/PNG into /public).
          h-16 so the lockup shares a baseline with the top bar. */}
      <div className="flex h-16 shrink-0 items-center px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-control bg-ochre font-display text-label font-bold text-white">
            A
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-title text-bone">AND Studio</span>
            {/* On ink, alpha below ~60% drops under AA. */}
            <span className="text-caption text-bone/65">Visualization Platform</span>
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1 px-3 pb-3 pt-2">
        {NAV_ITEMS.map((item) => {
          const active = tab === item.key;
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
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto px-5 pb-5 pt-4">
        <p className="text-caption text-bone/60">Internal tool · single studio</p>
      </div>
    </nav>
  );
}
