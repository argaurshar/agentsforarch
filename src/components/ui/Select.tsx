import { ChevronDown } from 'lucide-react';
import { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

/** A styled native <select> — accessible, square-cornered, hairline border. */
export function Select({ label, value, options, onChange, disabled, id }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={selectId} className="mono-meta">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none border border-hairline bg-paper px-3 py-2.5 pr-9 text-sm text-graphite focus-visible:outline-ochre disabled:opacity-45"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mist"
        />
      </div>
    </div>
  );
}
