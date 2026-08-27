import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import type { AerialLight } from '../../store/generation';

const LIGHT_OPTIONS: { value: AerialLight; label: string }[] = [
  { value: 'golden', label: 'Golden hour' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'midday', label: 'Midday' },
];

export function BirdsEyeFeature() {
  return (
    <GenerationScreen feature="birdsEye">
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <ChipGroup
              label="Light"
              value={settings.light}
              options={LIGHT_OPTIONS}
              onChange={(v) => patch({ light: v })}
            />
            <p className="text-caption text-mist">
              Golden hour throws long shadows, which is what makes a flat satellite image read as three-dimensional.
            </p>
          </div>

          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="aerial-context" className="mono-meta">
              Where is this
            </label>
            <input
              id="aerial-context"
              value={settings.context}
              onChange={(e) => patch({ context: e.target.value })}
              placeholder="coastal Goa, monsoon season"
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
            <p className="text-caption text-mist">
              A screenshot cannot say what the roofs are made of or what grows there. Name the place and it will.
            </p>
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
