import { REFINE_CHIPS } from '../../lib/refine';
import type { RefineChip } from '../../lib/refine';
import type { RefineState } from '../../store/generation';

interface RefineChipsProps {
  value: RefineState;
  onChange: (patch: Partial<RefineState>) => void;
  /** Chip vocabulary to show — defaults to the architectural set. */
  chips?: RefineChip[];
}

/** Multi-select quick-action chips + free text for refining an output (P2). */
export function RefineChips({ value, onChange, chips = REFINE_CHIPS }: RefineChipsProps) {
  const toggle = (key: string) => {
    const chips = value.chips.includes(key) ? value.chips.filter((c) => c !== key) : [...value.chips, key];
    onChange({ chips });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => {
          const active = value.chips.includes(chip.key);
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(chip.key)}
              className={`border px-3 py-1.5 text-xs transition-colors focus-visible:outline-ochre ${
                active ? 'border-ochre bg-ochre text-bone' : 'border-hairline bg-paper text-graphite hover:bg-drafting'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
      <input
        value={value.freeText}
        onChange={(e) => onChange({ freeText: e.target.value })}
        placeholder="…or describe a change in your own words"
        className="border border-hairline bg-paper px-3 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
      />
    </div>
  );
}
