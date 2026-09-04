import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function ProgramDiagramFeature() {
  return (
    <GenerationScreen feature="programDiagram">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />

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
