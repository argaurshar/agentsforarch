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

/** A labelled row of single-select pill chips. */
export function ChipGroup<T extends string>({ label, value, options, onChange }: ChipGroupProps<T>) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="mono-meta">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={`pill border px-3.5 py-1.5 text-[0.8125rem] font-medium focus-visible:outline-ochre ${
                active
                  ? 'border-ochre bg-ochre text-white shadow-btn'
                  : 'border-hairline bg-paper text-graphite hover:border-mist/50 hover:bg-drafting'
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
