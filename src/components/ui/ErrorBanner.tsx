import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Inline, human error message with a retry — never a raw stack trace (spec §8). */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 border border-ochre bg-drafting px-4 py-3">
      <div className="flex items-center gap-3">
        <AlertTriangle size={18} strokeWidth={1.75} className="shrink-0 text-ochre" />
        <p className="text-sm text-graphite">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon={<RotateCcw size={14} strokeWidth={1.75} />} onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
