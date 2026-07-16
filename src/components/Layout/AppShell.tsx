import { KeyRound, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { SettingsPanel } from '../Settings/SettingsPanel';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const projectName = useProjectStore((s) => s.project.name);
  const renameProject = useProjectStore((s) => s.renameProject);
  const providerName = useProjectStore((s) => s.providerName);
  const engineReady = useProjectStore((s) => s.engineReady);
  const claudeApiKey = useProjectStore((s) => s.claudeApiKey);

  const [draft, setDraft] = useState(projectName);
  const [editing, setEditing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // First-run onboarding: if no keys are configured yet, open Settings once so
  // a first-time visitor (e.g. a client following the link) is guided to connect
  // their keys rather than hitting an error on the first Generate.
  useEffect(() => {
    if (!engineReady && !claudeApiKey) setSettingsOpen(true);
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = () => {
    renameProject(draft);
    setEditing(false);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-bone">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile nav drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="relative h-full w-64 max-w-[80%]">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-2 top-4 p-1 text-bone/70 hover:text-bone focus-visible:outline-ochre"
              aria-label="Close menu"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-hairline bg-bone px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="-ml-1 p-1 text-graphite hover:text-ochre focus-visible:outline-ochre md:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={1.75} />
            </button>
            <span className="mono-meta hidden text-mist sm:inline">Project</span>
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit();
                  if (e.key === 'Escape') {
                    setDraft(projectName);
                    setEditing(false);
                  }
                }}
                className="min-w-0 border-b border-ochre bg-transparent font-serif text-base text-ink focus:outline-none sm:text-lg"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(projectName);
                  setEditing(true);
                }}
                className="max-w-[45vw] truncate font-serif text-base text-ink hover:text-ochre sm:max-w-none sm:text-lg"
                title="Rename project"
              >
                {projectName}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={`flex shrink-0 items-center gap-2 border bg-paper px-3 py-1.5 hover:bg-drafting focus-visible:outline-ochre ${
              engineReady ? 'border-hairline text-graphite' : 'border-ochre text-ochre'
            }`}
            title={engineReady ? 'Image generation settings' : 'Connect your API key to generate'}
          >
            <KeyRound size={15} strokeWidth={1.75} className="text-ochre" />
            <span className={`mono-meta text-ochre ${engineReady ? 'hidden sm:inline' : 'inline'}`}>
              {engineReady ? providerName : 'Connect key'}
            </span>
          </button>
        </div>

        {/* Scrollable work area. */}
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* Footer — active engine (spec §5). */}
        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-hairline bg-bone px-4 py-3 sm:px-6 lg:px-10">
          <span className="mono-meta hidden text-mist sm:inline">AND Studio · Concept Presentation</span>
          <span className="mono-meta text-mist">
            Engine&nbsp;·&nbsp;<span className="text-ochre">{providerName}</span>
          </span>
        </footer>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
