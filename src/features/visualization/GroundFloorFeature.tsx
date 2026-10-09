import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function GroundFloorFeature() {
  return (
    <GenerationScreen feature="groundFloor">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          {settings.program === 'custom' ? (
            <div className="flex flex-col gap-2 p-5">
              <label htmlFor="groundFloor-program" className="mono-meta">
                What is the new use
              </label>
              <input
                id="groundFloor-program"
                value={settings.customProgram}
                onChange={(e) => patch({ customProgram: e.target.value })}
                placeholder="a bike repair workshop"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
          ) : null}
        </>
      )}
    </GenerationScreen>
  );
}
