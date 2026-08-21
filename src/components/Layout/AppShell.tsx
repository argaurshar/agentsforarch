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
      s.generation.axonometric.status === 'loading' ||
      s.generation.interior.status === 'loading',
  );

  const [draft, setDraft] = useState(projectName);
  const [editing, setEditing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const drawerRef = useDialog<HTMLDivElement>({ open: drawerOpen, onClose: () => setDrawerOpen(false) });
  // "New project" discards every in-memory asset, so it gets a real dismissible
  // dialog (Escape / scrim / focus trap), not a bare toggled popover.
  const confirmRef = useDialog<HTMLDivElement>({ open: confirmNew, onClose: () => setConfirmNew(false) });

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
            // Width matches the desktop rail; max-w keeps it off the screen edge
            // on narrow phones. Entrance uses the shared house reveal — keyframes
            // live in index.css, which this pass does not own.
            className="view-enter relative h-full w-64 max-w-[85vw] overflow-hidden"
          >
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-control text-bone/70 transition-colors hover:bg-white/10 hover:text-bone"
              aria-label="Close menu"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — h-16 to share a baseline with the sidebar brand lockup.
            Opaque: <main> is the scroll container, so nothing passes under it. */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-paper px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="-ml-1 flex h-8 w-8 items-center justify-center rounded-control text-graphite transition-colors hover:bg-drafting md:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} strokeWidth={1.75} />
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
                // Resting border is the neutral hairline so the global ochre
                // focus ring is what signals focus.
                className="min-w-0 rounded-field border border-hairline bg-paper px-2 py-1 font-display text-title text-ink"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(projectName);
                  setEditing(true);
                }}
                // Transparent border matches the input's 1px so toggling edit
                // mode does not shift the row.
                className="max-w-[45vw] truncate rounded-field border border-transparent px-2 py-1 font-display text-title text-ink transition-colors hover:bg-drafting sm:max-w-none"
                title="Rename project"
              >
                {projectName}
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* New project — clears in-memory work (nothing is saved). */}
            <Button
              size="sm"
              variant="secondary"
              icon={<FilePlus size={14} strokeWidth={1.75} />}
              onClick={() => setConfirmNew((v) => !v)}
              title="Start a new project"
              aria-haspopup="dialog"
              aria-expanded={confirmNew}
            >
              <span className="hidden sm:inline">New</span>
            </Button>

            {/* Key status. Colour is driven by state: quiet when a key is live,
                warning tone when generation is blocked — the accent is reserved
                for primary actions, not for a healthy status read-out. */}
            <Button
              size="sm"
              variant="secondary"
              icon={<KeyRound size={14} strokeWidth={1.75} className={engineReady ? 'text-mist' : 'text-warning'} />}
              onClick={() => setSettingsOpen(true)}
              className={engineReady ? '' : 'border-warning/50'}
              title={engineReady ? 'API keys' : 'Connect your API key to generate'}
            >
              {engineReady ? (
                <span className="hidden items-center gap-2 text-graphite sm:inline-flex">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                  {providerName}
                </span>
              ) : (
                <span className="text-warning">Connect key</span>
              )}
            </Button>
          </div>
        </div>

        {/* Scrollable work area. */}
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {confirmNew ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirmNew(false)} aria-hidden="true" />
          <div
            ref={confirmRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-new-title"
            tabIndex={-1}
            className="card relative w-80 max-w-full p-5 shadow-card-lg"
          >
            <h3 id="confirm-new-title" className="font-display text-title text-ink">
              Start a new project?
            </h3>
            <p className="mt-2 text-body text-graphite">This clears all generated work — nothing is saved.</p>
            <div className="mt-4 flex justify-end gap-3">
              <Button size="sm" variant="ghost" onClick={() => setConfirmNew(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  resetProject();
                  setConfirmNew(false);
                }}
              >
                New project
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
