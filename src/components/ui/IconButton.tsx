import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  /** Accessible name — rendered as both aria-label and tooltip. */
  label: string;
  tone?: 'neutral' | 'danger' | 'accent';
  size?: 'sm' | 'md';
}

const TONES = {
  neutral: 'text-mist hover:bg-drafting hover:text-graphite border-transparent',
  danger: 'text-mist hover:bg-danger-soft hover:text-danger border-transparent',
  accent: 'border-ochre bg-ochre text-white shadow-btn hover:bg-ochre-deep',
} as const;

/** A square-tap-target icon action. 32px min hit target (40px at md). */
export function IconButton({ icon, label, tone = 'neutral', size = 'sm', className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex shrink-0 items-center justify-center rounded-control border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
      } ${TONES[tone]} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
}
