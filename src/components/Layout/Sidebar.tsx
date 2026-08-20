import { Box, Building2, Images, LayoutDashboard, LayoutTemplate, Palette, PencilRuler, Sofa } from 'lucide-react';
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

// All features are always present and always clickable (spec §1). None is
// ever locked, greyed out, or gated behind another feature.
const NAV_ITEMS: NavItem[] = [
  { key: 'home', index: '00', name: 'Home', sub: 'Project Dashboard', icon: LayoutDashboard },
  { key: 'render', index: '01', name: 'Isometric', sub: 'Floor Plan to 3D', icon: PencilRuler },
  { key: 'elevation', index: '02', name: 'Elevation', sub: 'Sketch to Elevation', icon: Building2 },
  { key: 'axonometric', index: '03', name: 'Axonometric', sub: 'Elevation to Axonometric', icon: Box },
  { key: 'interior', index: '04', name: 'Interior', sub: 'Room Photo to Design', icon: Sofa },
  { key: 'moodboard', index: '05', name: 'Mood Board', sub: 'Image → Material Board', icon: Palette },
  { key: 'presentation', index: '06', name: 'Presentation', sub: 'Concept Presentation', icon: LayoutTemplate },
  { key: 'gallery', index: '07', name: 'Gallery', sub: 'All Outputs · Save / Load', icon: Images },
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
      style={{ backgroundImage: 'linear-gradient(180deg, #1d1f24 0%, #17181c 60%)' }}
    >
      {/* Brand lockup — echoes andstudio.in. To use the exact logo, replace the
          "AND" wordmark block below with:  <img src="/logo.svg" alt="AND Studio"
          className="h-9 w-auto" />  (drop the SVG/PNG into /public). */}
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre font-display text-sm font-bold text-white">
            A
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[1.0625rem] font-semibold tracking-tight text-bone">AND Studio</span>
            <span className="text-[0.75rem] text-bone/45">Visualization Platform</span>
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-1 px-3 pb-3">
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
                className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-200 ${
                  active ? 'bg-ochre text-white shadow-btn' : 'text-bone/70 hover:bg-white/[0.07] hover:text-bone'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={1.75}
                  className={active ? 'text-white' : 'text-bone/50 transition-colors group-hover:text-bone'}
                />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className={`text-[0.875rem] font-medium ${active ? 'text-white' : ''}`}>{item.name}</span>
                  <span className={`truncate text-[0.75rem] ${active ? 'text-white/70' : 'text-bone/35'}`}>
                    {item.sub}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto px-5 pb-5 pt-4">
        <p className="text-[0.75rem] text-bone/35">Internal tool · single studio</p>
      </div>
    </nav>
  );
}
