import { MoveHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/Button';
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
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="section-heading">Fidelity · Before / After</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-pressed={open}
          icon={<MoveHorizontal size={14} strokeWidth={1.75} />}
        >
          {open ? 'Hide comparison' : 'Compare before / after'}
        </Button>
      </div>
      {open ? <ImageCompare before={before} after={after} beforeLabel={beforeLabel} afterLabel={afterLabel} /> : null}
    </div>
  );
}
