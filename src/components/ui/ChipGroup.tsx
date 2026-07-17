export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  label: string;
  value: T;
  options: readonly ChipOption<T>[];
  onChange: (v: T) => void;
}

/** A labelled row of single-select chips (the studio's square, single-accent style). */
export function ChipGroup<T extends string>({ label, value, options, onChange }: ChipGroupProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="mono-meta">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={`border px-3 py-1.5 text-xs transition-colors focus-visible:outline-ochre ${
                active ? 'border-ochre bg-ochre text-bone' : 'border-hairline bg-paper text-graphite hover:bg-drafting'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
