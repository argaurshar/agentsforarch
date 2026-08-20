interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name — also rendered as the visible label when `children` is omitted. */
  label: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

/**
 * The canonical on/off control. Every tab previously hand-rolled its own square
 * track with a square sliding knob — the loudest "this app is old" signal in the
 * product. One rounded switch now serves them all.
 */
export function Switch({ checked, onChange, label, children, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={children ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-3 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children ?? <span className="text-label text-graphite">{label}</span>}
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
          checked ? 'border-ochre bg-ochre' : 'border-hairline bg-drafting group-hover:border-mist/40'
        }`}
      >
        <span
          className={`absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all ${
            checked ? 'left-[1.4rem]' : 'left-[0.2rem]'
          }`}
          style={{ height: '1.125rem', width: '1.125rem' }}
        />
      </span>
    </button>
  );
}
