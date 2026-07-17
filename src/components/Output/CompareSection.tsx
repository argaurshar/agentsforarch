import { MoveHorizontal } from 'lucide-react';
import { useState } from 'react';
import { ImageCompare } from './ImageCompare';

interface CompareSectionProps {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
  /** Whether the slider is shown on first render (the user can toggle it). */
  defaultOpen?: boolean;
}

/**
 * The before/after comparison slider with an explicit show/hide toggle, so the
 * user chooses when to view it. Shared across every generation tab. Drag the
 * divider to wipe between the input (before) and the generated output (after).
 */
export function CompareSection({ before, after, beforeLabel, afterLabel, defaultOpen = true }: CompareSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="mono-meta">Fidelity · Before / After</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-pressed={open}
          className="flex items-center gap-1.5 border border-hairline bg-paper px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-graphite transition-colors hover:bg-drafting focus-visible:outline-ochre"
        >
          <MoveHorizontal size={13} strokeWidth={1.75} />
          {open ? 'Hide comparison' : 'Compare before / after'}
        </button>
      </div>
      {open ? <ImageCompare before={before} after={after} beforeLabel={beforeLabel} afterLabel={afterLabel} /> : null}
    </div>
  );
}
