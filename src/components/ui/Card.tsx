import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Paper (default) is the elevated card on Bone; drafting is the flat sub-surface. */
  surface?: 'paper' | 'drafting' | 'bone';
  padded?: boolean;
}

// The layering rule: bone page → paper card (elevated) → drafting sub-panel (flat).
const surfaces = {
  paper: 'rounded-card border border-hairline bg-paper shadow-card',
  drafting: 'rounded-field border border-hairline bg-drafting',
  bone: 'rounded-card border border-hairline bg-bone',
} as const;

/** The single card surface definition for the app chrome. */
export function Card({ children, surface = 'paper', padded = true, className = '', ...rest }: CardProps) {
  return (
    <div className={`${surfaces[surface]} ${padded ? 'p-5' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}
