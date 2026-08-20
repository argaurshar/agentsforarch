import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

export type NoticeTone = 'error' | 'warning' | 'success' | 'info';

interface NoticeProps {
  tone?: NoticeTone;
  message: string;
  action?: ReactNode;
  onDismiss?: () => void;
}

// Semantic tones — the brand accent means "primary action", never "something
// went wrong", so errors are red, blocked states amber, completions green.
const TONES: Record<NoticeTone, { wrap: string; icon: string; Icon: typeof AlertTriangle }> = {
  error: { wrap: 'border-danger/25 bg-danger-soft', icon: 'text-danger', Icon: AlertTriangle },
  warning: { wrap: 'border-warning/25 bg-warning-soft', icon: 'text-warning', Icon: AlertTriangle },
  success: { wrap: 'border-success/25 bg-success-soft', icon: 'text-success', Icon: CheckCircle2 },
  info: { wrap: 'border-hairline bg-drafting', icon: 'text-mist', Icon: Info },
};

/** Inline, human status message — never a raw stack trace (spec §8). */
export function Notice({ tone = 'info', message, action, onDismiss }: NoticeProps) {
  const t = TONES[tone];
  return (
    <div className={`flex items-start justify-between gap-3 rounded-field border px-4 py-3.5 ${t.wrap}`}>
      <div className="flex items-start gap-3">
        <t.Icon size={18} strokeWidth={1.75} className={`mt-px shrink-0 ${t.icon}`} />
        <p className="text-body text-graphite">{message}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {action}
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="flex h-8 w-8 items-center justify-center rounded-control text-mist transition-colors hover:bg-black/5 hover:text-graphite"
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
