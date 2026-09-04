import { ChipGroup } from '../ui/ChipGroup';
import { SwitchRow } from '../ui/SwitchRow';
import { featureDef } from '../../features/registry';
import type { FeatureKind, SettingsFor } from '../../features/registry';
import type { SettingsPatch } from '../../store/generation';

interface QuickControlsProps<K extends FeatureKind> {
  feature: K;
  settings: SettingsFor<K>;
  patch: (p: SettingsPatch<SettingsFor<K>>) => void;
  /** Tighter spacing and no dividers, for the Tweak sheet. The tool screen
   *  wants each axis in its own hairline-divided row; the sheet is a stack. */
  dense?: boolean;
}

/**
 * A tool's shortlist of axes, rendered from its registry declaration.
 *
 * The point is that there is only ONE of these. The same component draws the
 * axes on the tool screen and in the front door's Tweak sheet, so an option
 * cannot exist in one place and not the other — which is exactly what a second
 * hand-written copy would eventually produce.
 *
 * A tool with no `quick` renders nothing at all rather than an empty panel; the
 * caller decides what to say instead.
 */
export function QuickControls<K extends FeatureKind>({ feature, settings, patch, dense }: QuickControlsProps<K>) {
  const axes = featureDef(feature).quick ?? [];
  if (axes.length === 0) return null;

  // The declaration proves `key` is a key of this tool's settings — `QuickAxis`
  // is typed `Extract<keyof S, string>`. What TypeScript cannot do is relate a
  // key read at RUNTIME back to the patch's mapped type, so the assembly of the
  // one-key patch object is asserted here, once, rather than at 27 call sites.
  const set = (key: string, value: unknown) => patch({ [key]: value } as SettingsPatch<SettingsFor<K>>);
  // Same reason, read side: the settings unions have no index signature, so a
  // runtime key cannot be used to index them without going through `unknown`.
  const read = (key: string): unknown => (settings as unknown as Record<string, unknown>)[key];

  return (
    <>
      {axes.map((axis) =>
        axis.kind === 'choice' ? (
          <div
            key={axis.key}
            className={dense ? 'flex flex-col gap-2' : 'flex flex-col gap-2 p-5'}
          >
            <ChipGroup
              label={axis.label}
              value={String(read(axis.key) ?? '')}
              options={axis.options}
              onChange={(v) => set(axis.key, v)}
            />
            {/* Two hints, two weights, and the difference is deliberate.
                A PER-OPTION hint explains what the selected choice does — "the
                rear face is not in the input at all" — and it is the only
                explanation that choice gets, so it is never muted. An AXIS hint
                is context about the row as a whole, and it is. Both screens
                already worked this way before the declaration existed; keeping
                it is what stopped the migration quietly greying out five
                explanations. */}
            {(() => {
              const option = axis.options.find((o) => o.value === read(axis.key))?.hint;
              if (option) return <p className="text-label text-graphite">{option}</p>;
              return axis.hint ? <p className="text-caption text-mist">{axis.hint}</p> : null;
            })()}
          </div>
        ) : (
          <div key={axis.key} className={dense ? '' : 'p-5'}>
            <SwitchRow
              checked={Boolean(read(axis.key))}
              onChange={(v) => set(axis.key, v)}
              label={axis.label}
              hint={axis.hint}
            />
          </div>
        ),
      )}
    </>
  );
}
