import { useState } from 'react';
import type { ReactNode } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const projectName = useProjectStore((s) => s.project.name);
  const renameProject = useProjectStore((s) => s.renameProject);
  const providerName = useProjectStore((s) => s.providerName);

  const [draft, setDraft] = useState(projectName);
  const [editing, setEditing] = useState(false);

  const commit = () => {
    renameProject(draft);
    setEditing(false);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-bone">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — single active project (spec §7). */}
        <div className="flex items-center justify-between border-b border-hairline bg-bone px-10 py-4">
          <div className="flex items-center gap-3">
            <span className="mono-meta text-mist">Project</span>
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
                className="border-b border-ochre bg-transparent font-serif text-lg text-ink focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(projectName);
                  setEditing(true);
                }}
                className="font-serif text-lg text-ink hover:text-ochre"
                title="Rename project"
              >
                {projectName}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable work area. */}
        <main className="min-h-0 flex-1 overflow-y-auto px-10 py-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        {/* Footer — active provider name (spec §5). */}
        <footer className="flex items-center justify-between border-t border-hairline bg-bone px-10 py-3">
          <span className="mono-meta text-mist">AND Studio · Concept Presentation</span>
          <span className="mono-meta text-mist">
            Provider&nbsp;·&nbsp;<span className="text-ochre">{providerName}</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
