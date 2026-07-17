import { Box, Building2, LayoutTemplate, PencilRuler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import type { TabKey } from '../../types';

interface NavItem {
  key: TabKey;
  index: string;
  name: string;
  sub: string;
  icon: LucideIcon;
}

// All four features are always present and always clickable (spec §1). None is
// ever locked, greyed out, or gated behind another feature.
const NAV_ITEMS: NavItem[] = [
  { key: 'render', index: '01', name: 'Isometric', sub: 'Floor Plan to 3D', icon: PencilRuler },
  { key: 'elevation', index: '02', name: 'Elevation', sub: 'Sketch to Elevation', icon: Building2 },
  { key: 'axonometric', index: '03', name: 'Axonometric', sub: 'Elevation to Axonometric', icon: Box },
  { key: 'presentation', index: '04', name: 'Presentation', sub: 'Concept Presentation', icon: LayoutTemplate },
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
      className="flex w-64 shrink-0 flex-col bg-ink text-bone"
    >
      {/* Brand lockup — echoes andstudio.in. To use the exact logo, replace the
          "AND" wordmark block below with:  <img src="/logo.svg" alt="AND Studio"
          className="h-9 w-auto" />  (drop the SVG/PNG into /public). */}
      <div className="border-b border-white/10 px-6 py-7">
        <div className="flex items-baseline gap-1">
          <span className="font-serif text-[2rem] font-medium leading-none tracking-[0.03em] text-bone">
            AND
          </span>
          <span className="font-serif text-xs text-bone/50">®</span>
        </div>
        <p className="mt-2 font-mono text-[0.5rem] uppercase tracking-[0.28em] text-bone/45">
          Architecture &amp; Design Studio
        </p>
        <p className="mt-4 font-serif text-base font-light leading-tight text-bone/75">
          Visualization Platform
        </p>
      </div>

      <ul className="flex flex-col gap-px p-3">
        {NAV_ITEMS.map((item) => {
          const active = tab === item.key;
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setTab(item.key);
                  onNavigate?.();
                }}
                className={`group flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
                  active
                    ? 'border-ochre bg-white/[0.06]'
                    : 'border-transparent hover:bg-white/[0.04]'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={1.5}
                  className={`transition-transform group-hover:translate-x-0.5 ${
                    active ? 'text-ochre' : 'text-bone/60 group-hover:text-bone'
                  }`}
                />
                <span className="flex flex-col">
                  <span className="flex items-baseline gap-2">
                    <span className={`font-mono text-[0.65rem] ${active ? 'text-ochre' : 'text-bone/40'}`}>
                      {item.index}
                    </span>
                    <span className={`text-sm font-medium ${active ? 'text-bone' : 'text-bone/80'}`}>
                      {item.name}
                    </span>
                  </span>
                  <span className="text-[0.7rem] text-bone/40">{item.sub}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto border-t border-white/10 px-6 py-5">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-bone/40">
          Internal Tool · Single Studio
        </p>
      </div>
    </nav>
  );
}
