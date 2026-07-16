import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium tracking-wide select-none ' +
  'border transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-ochre';

const variants: Record<Variant, string> = {
  // The single accent — Ochre — square corners, no shadow.
  primary: 'bg-ochre text-bone border-ochre hover:bg-ochre-deep hover:border-ochre-deep',
  secondary: 'bg-paper text-ink border-hairline hover:bg-drafting',
  ghost: 'bg-transparent text-graphite border-transparent hover:bg-drafting',
  danger: 'bg-transparent text-ochre border-hairline hover:bg-drafting',
};

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-5 py-2.5',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : icon}
      {children}
    </button>
  );
}
