import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function UrbanContextFeature() {
  return (
    <GenerationScreen feature="urbanContext">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
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
        </>
      )}
    </GenerationScreen>
  );
}
