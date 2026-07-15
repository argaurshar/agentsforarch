import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Paper (default) sits on Bone; drafting is the dimmer sub-surface. */
  surface?: 'paper' | 'drafting' | 'bone';
  padded?: boolean;
}

const surfaces = {
  paper: 'bg-paper',
  drafting: 'bg-drafting',
  bone: 'bg-bone',
} as const;

/** A flat surface with a 1px hairline border. No radius, no shadow (spec §4). */
export function Card({ children, surface = 'paper', padded = true, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`border border-hairline ${surfaces[surface]} ${padded ? 'p-6' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
