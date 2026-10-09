import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function BlueprintEvolutionFeature() {
  return (
    <GenerationScreen feature="blueprintEvolution">
      {({ feature, settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="blueprintEvolution-typology" className="mono-meta">
              Typology
            </label>
            <input
              id="blueprintEvolution-typology"
              value={settings.typology}
              onChange={(e) => patch({ typology: e.target.value })}
              placeholder="Gothic to contemporary church design"
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
          </div>
          <QuickControls feature={feature} settings={settings} patch={patch} />
        </>
      )}
    </GenerationScreen>
  );
}
