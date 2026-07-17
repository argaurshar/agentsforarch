import { FilePlus, KeyRound, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useDialog } from '../../lib/useDialog';
import { useProjectStore } from '../../store/useProjectStore';
import { SettingsPanel } from '../Settings/SettingsPanel';
import { Button } from '../ui/Button';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const projectName = useProjectStore((s) => s.project.name);
  const renameProject = useProjectStore((s) => s.renameProject);
  const resetProject = useProjectStore((s) => s.resetProject);
  const providerName = useProjectStore((s) => s.providerName);
  const engineReady = useProjectStore((s) => s.engineReady);
  const claudeApiKey = useProjectStore((s) => s.claudeApiKey);

  // Any work worth warning about before the tab unloads (in-memory by design —
  // nothing is persisted, so a refresh would discard it, and each generated
  // image cost real API credits).
  const hasWork = useProjectStore(
    (s) =>
      s.project.assets.length > 0 ||
      s.project.slides.length > 0 ||
      s.project.uploads.length > 0 ||
      Boolean(s.deckHtml) ||
      s.deckStatus === 'loading' ||
      s.generation.render.status === 'loading' ||
      s.generation.elevation.status === 'loading' ||
      s.generation.axonometric.status === 'loading',
  );

  const [draft, setDraft] = useState(projectName);
  const [editing, setEditing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const drawerRef = useDialog<HTMLDivElement>({ open: drawerOpen, onClose: () => setDrawerOpen(false) });

  // First-run onboarding: if no keys are configured yet, open Settings once so
  // a first-time visitor (e.g. a client following the link) is guided to connect
  // their keys rather than hitting an error on the first Generate.
  useEffect(() => {
    if (!engineReady && !claudeApiKey) setSettingsOpen(true);
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before leaving when there is unsaved work (project data is in-memory).
  useEffect(() => {
    if (!hasWork) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasWork]);

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
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            tabIndex={-1}
            className="relative h-full w-64 max-w-[80%] focus:outline-none"
          >
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

          <div className="flex shrink-0 items-center gap-2">
            {/* New project — clears in-memory work (nothing is saved). */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setConfirmNew((v) => !v)}
                className="flex items-center gap-2 border border-hairline bg-paper px-3 py-1.5 text-graphite hover:bg-drafting focus-visible:outline-ochre"
                title="Start a new project"
              >
                <FilePlus size={15} strokeWidth={1.75} className="text-graphite" />
                <span className="mono-meta hidden text-graphite sm:inline">New</span>
              </button>
              {confirmNew ? (
                <div className="absolute right-0 top-full z-50 mt-1 w-64 border border-hairline bg-paper p-3 text-xs leading-relaxed text-graphite">
                  <p>Start a new project? This clears all generated work — nothing is saved.</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        resetProject();
                        setConfirmNew(false);
                      }}
                    >
                      New project
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setConfirmNew(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={`flex items-center gap-2 border bg-paper px-3 py-1.5 hover:bg-drafting focus-visible:outline-ochre ${
                engineReady ? 'border-hairline text-graphite' : 'border-ochre text-ochre'
              }`}
              title={engineReady ? 'API keys' : 'Connect your API key to generate'}
            >
              <KeyRound size={15} strokeWidth={1.75} className="text-ochre" />
              <span className={`mono-meta text-ochre ${engineReady ? 'hidden sm:inline' : 'inline'}`}>
                {engineReady ? providerName : 'Connect key'}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable work area. */}
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* Footer — active engine (spec §5). */}
        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-hairline bg-bone px-4 py-3 sm:px-6 lg:px-10">
          <span className="mono-meta hidden text-mist sm:inline">AND · Architecture &amp; Design Studio</span>
          <span className="mono-meta text-mist">
            Engine&nbsp;·&nbsp;<span className="text-ochre">{providerName}</span>
          </span>
        </footer>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
