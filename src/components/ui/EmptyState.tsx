import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

/** A quiet, centered empty state with real guidance (spec §10 — polish). */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-hairline bg-paper px-8 py-16 text-center">
      <Icon size={32} strokeWidth={1} className="text-mist" />
      <h3 className="mt-5 font-serif text-xl text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-graphite">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
