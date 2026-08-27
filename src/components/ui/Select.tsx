import { ChevronDown } from 'lucide-react';
import { useId } from 'react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  /** `readonly` so a caller can pass an `as const` list and keep its literal union. */
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * A styled native <select> — accessible, rounded, flat hairline field.
 *
 * Generic over its option values, matching ChipGroup. A plain `string` here
 * meant a settings union widened the moment it passed through the control, so
 * `onChange` handed back an unchecked string and a typo reached the model.
 */
export function Select<T extends string>({ label, value, options, onChange, disabled, id }: SelectProps<T>) {
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
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none rounded-field border border-hairline bg-paper px-3.5 py-2.5 pr-9 text-body text-graphite transition-colors hover:border-mist/40 disabled:cursor-not-allowed disabled:opacity-50"
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
