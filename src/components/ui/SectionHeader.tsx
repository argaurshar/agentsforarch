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
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow">
            {index}
            <span className="px-2 text-ochre/60">/</span>
            {eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-4xl font-light text-ink">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-graphite">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <hr className="mt-6 border-0 border-t border-hairline" />
    </header>
  );
}
