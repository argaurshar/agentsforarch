import { RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { Notice } from './Notice';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Error surface for a failed generation — a semantic Notice with a retry. */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <Notice
      tone="error"
      message={message}
      action={
        onRetry ? (
          <Button variant="secondary" size="sm" icon={<RotateCcw size={14} strokeWidth={1.75} />} onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    />
  );
}
