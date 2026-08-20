import type { ReactNode } from 'react';

interface SectionHeaderProps {
  /** Two-digit section number, e.g. "01". */
  index: string;
  /** Uppercase eyebrow label, e.g. "SKETCH TO RENDER". */
  eyebrow: string;
  /** Serif heading. */
  title: string;
  description?: string;
  /** Optional right-aligned controls (e.g. actions). */
  actions?: ReactNode;
}

/**
 * The studio's signature section opener (spec §4): a mono Ochre eyebrow
 * formatted `01  /  SKETCH TO RENDER`, a large serif heading, then a hairline
 * rule. Used consistently at the top of every section.
 */
export function SectionHeader({ index, eyebrow, title, description, actions }: SectionHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div>
          <p className="reveal reveal-1 flex items-center gap-2.5">
            <span className="rounded-full bg-ochre/10 px-2.5 py-1 font-mono text-[0.6875rem] font-medium text-ochre">
              {index}
            </span>
            <span className="eyebrow">{eyebrow}</span>
          </p>
          <h1 className="reveal reveal-2 mt-3.5 font-display text-[2rem] font-semibold tracking-tight text-ink sm:text-[2.375rem]">
            {title}
          </h1>
          {description ? (
            <p className="reveal reveal-3 mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-graphite">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
