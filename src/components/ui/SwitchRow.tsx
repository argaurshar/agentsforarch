import { Switch } from './Switch';

/**
 * A labelled switch with a caption, in a padded row.
 *
 * Five screens had hand-rolled the identical `<Switch>` + `section-heading` +
 * `text-caption` block. Nothing about it was ever specific to one feature, so it
 * lives here rather than under one category's folder — the same reason the
 * generation shell exists.
 */
export function SwitchRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  // No padding of its own. Two of the five callers have the switch as one child
  // among several inside an already-padded container, and a component that
  // brought its own p-5 could only be used by the other three.
  return (
    <Switch checked={checked} onChange={onChange} label={label}>
      <span className="flex flex-col text-left">
        <span className="section-heading">{label}</span>
        <span className="mt-1 text-caption text-mist">{hint}</span>
      </span>
    </Switch>
  );
}
