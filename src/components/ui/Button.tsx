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
  'inline-flex items-center justify-center gap-2 font-medium select-none rounded-full ' +
  'border transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed ' +
  'disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-ochre';

const variants: Record<Variant, string> = {
  // The single accent — a soft accent glow instead of the old flat block.
  primary: 'bg-ochre text-white border-ochre shadow-btn hover:bg-ochre-deep hover:border-ochre-deep',
  secondary: 'bg-paper text-ink border-hairline shadow-card hover:bg-drafting hover:border-mist/40',
  ghost: 'bg-transparent text-graphite border-transparent hover:bg-drafting',
  danger: 'bg-transparent text-ochre border-ochre/30 hover:bg-ochre/8 hover:border-ochre/50',
};

const sizes: Record<Size, string> = {
  sm: 'text-[0.8125rem] px-3.5 py-1.5',
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
