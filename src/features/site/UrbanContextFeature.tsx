import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SwitchRow } from '../../components/ui/SwitchRow';
import type { UrbanDensity } from '../../store/generation';

const DENSITY_OPTIONS: { value: UrbanDensity; label: string }[] = [
  { value: 'low', label: 'Low-rise' },
  { value: 'mid', label: 'Mid-rise' },
  { value: 'dense', label: 'Dense city' },
];

export function UrbanContextFeature() {
  return (
    <GenerationScreen feature="urbanContext">
      {({ settings, patch }) => (
        <>
          <div className="p-5">
            <ChipGroup
              label="Neighbours"
              value={settings.density}
              options={DENSITY_OPTIONS}
              onChange={(v) => patch({ density: v })}
            />
          </div>

          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="context-city" className="mono-meta">
              City
            </label>
            <input
              id="context-city"
              value={settings.city}
              onChange={(e) => patch({ city: e.target.value })}
              placeholder="Ahmedabad"
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
            <p className="text-caption text-mist">
              Sets what the neighbours are made of and how they meet the street. Left blank you get a generic anywhere.
            </p>
          </div>

          <div className="p-5">
            <SwitchRow
              checked={settings.entourage}
              onChange={(v) => patch({ entourage: v })}
              label="People on the street"
              hint="At correct scale against the building — the cheapest way to make the height read."
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
