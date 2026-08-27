import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SwitchRow } from '../../components/ui/SwitchRow';
import type { EntourageDensity, EntourageSetting } from '../../store/generation';

const DENSITY_OPTIONS: { value: EntourageDensity; label: string }[] = [
  { value: 'few', label: 'A few' },
  { value: 'some', label: 'Some' },
  { value: 'busy', label: 'Busy' },
];

const SETTING_OPTIONS: { value: EntourageSetting; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'civic', label: 'Civic / public' },
];

export function HumanScaleFeature() {
  return (
    <GenerationScreen feature="humanScale">
      {({ settings, patch }) => (
        <>
          <div className="p-5">
            <ChipGroup label="How many" value={settings.density} options={DENSITY_OPTIONS} onChange={(v) => patch({ density: v })} />
          </div>
          <div className="flex flex-col gap-2 p-5">
            <ChipGroup label="Who" value={settings.setting} options={SETTING_OPTIONS} onChange={(v) => patch({ setting: v })} />
            <p className="text-caption text-mist">Sets what the figures are doing, which is what stops them reading as stock cut-outs.</p>
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.vehicles}
              onChange={(v) => patch({ vehicles: v })}
              label="Vehicles"
              hint="One or two, where a vehicle would actually be — never blocking the facade."
            />
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.planting}
              onChange={(v) => patch({ planting: v })}
              label="Planting"
              hint="Street trees, hedging or beds at believable mature sizes."
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
