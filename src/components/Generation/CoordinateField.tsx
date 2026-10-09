import { formatCoordinates, parseCoordinates } from '../../lib/coords';

interface CoordinateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown under the field while it is empty. */
  hint: string;
}

/**
 * A coordinates box that says what it read. A model handed an unreadable
 * location "interprets" it, so the field shows its reading back — or says it
 * cannot read one — before anything is sent.
 */
export function CoordinateField({ id, label, value, onChange, hint }: CoordinateFieldProps) {
  const parsed = parseCoordinates(value);
  const empty = !value.trim();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="mono-meta">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="27.1751, 78.0421 — or paste a Google Maps link"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
      />
      <p
        className={`text-caption ${!empty && !parsed ? 'text-danger' : 'text-mist'}`}
        data-coords-read={parsed ? formatCoordinates(parsed) : empty ? '' : 'invalid'}
      >
        {empty
          ? hint
          : parsed
            ? `Reads as ${formatCoordinates(parsed)}`
            : 'Can’t read that as coordinates — try 27.1751, 78.0421 or 27°10′30″N 78°2′31″E.'}
      </p>
    </div>
  );
}
