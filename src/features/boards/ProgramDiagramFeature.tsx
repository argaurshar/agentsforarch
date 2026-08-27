import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import type { ProgramOrientation } from '../../store/generation';

const ORIENTATION_OPTIONS: { value: ProgramOrientation; label: string }[] = [
  { value: 'vertical', label: 'Stacked' },
  { value: 'isometric', label: 'Exploded isometric' },
];

export function ProgramDiagramFeature() {
  return (
    <GenerationScreen feature="programDiagram">
      {({ settings, patch }) => (
        <>
          <div className="p-5">
            <ChipGroup
              label="Arrangement"
              value={settings.orientation}
              options={ORIENTATION_OPTIONS}
              onChange={(v) => patch({ orientation: v })}
            />
          </div>

          {/* A facade cannot say what happens behind it, so the program is the
              one thing the input genuinely cannot supply. */}
          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="program-levels" className="mono-meta">
              Floors, bottom to top
            </label>
            <textarea
              id="program-levels"
              value={settings.levels}
              onChange={(e) => patch({ levels: e.target.value })}
              rows={4}
              placeholder={'Parking\nRetail\nOffices\nApartments\nRoof terrace'}
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
            <p className="text-caption text-mist">
              One per line. Leave it blank and the program is inferred from the building type — plausible, but guessed.
            </p>
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
