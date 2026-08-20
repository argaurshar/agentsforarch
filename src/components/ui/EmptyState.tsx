import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * A centered empty state with real guidance. Solid hairline, not dashed —
 * dashed borders are reserved for drop targets, so using one here read as an
 * unfinished upload zone on the two most visible empty screens.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-hairline bg-paper px-8 py-16 text-center shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-drafting">
        <Icon size={22} strokeWidth={1.75} className="text-mist" />
      </span>
      <h3 className="mt-5 font-display text-title text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-body text-graphite">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
