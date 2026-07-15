import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

/** Minimal loading spinner. Colour inherits from `currentColor`. */
export function Spinner({ size = 16, className = '', label = 'Loading' }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      className={`animate-spin ${className}`}
      strokeWidth={1.75}
      role="status"
      aria-label={label}
    />
  );
}
