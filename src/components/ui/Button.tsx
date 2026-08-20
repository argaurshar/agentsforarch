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
  'border transition-all active:scale-[0.98] disabled:cursor-not-allowed ' +
  'disabled:opacity-50 disabled:shadow-none disabled:active:scale-100';

const variants: Record<Variant, string> = {
  // The single accent — a soft accent glow instead of the old flat block.
  primary: 'bg-ochre text-white border-ochre shadow-btn hover:bg-ochre-deep hover:border-ochre-deep',
  secondary: 'bg-paper text-ink border-hairline shadow-card hover:bg-drafting hover:border-mist/40',
  ghost: 'bg-transparent text-graphite border-transparent hover:bg-drafting',
  danger: 'bg-transparent text-danger border-danger/30 hover:bg-danger-soft hover:border-danger/50',
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
      {/* Reserve the glyph slot so a button does not jump width when it starts loading. */}
      {icon || loading ? (
        <span className="inline-flex w-4 shrink-0 justify-center">
          {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}
