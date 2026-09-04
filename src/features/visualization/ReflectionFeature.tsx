import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function ReflectionFeature() {
  return (
    <GenerationScreen feature="reflection">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          {settings.mode !== 'transparent' ? (
            <div className="flex flex-col gap-2 p-5">
              <label htmlFor="reflect-what" className="mono-meta">
                What it reflects
              </label>
              <input
                id="reflect-what"
                value={settings.reflect}
                onChange={(e) => patch({ reflect: e.target.value })}
                placeholder="the plane trees opposite and a soft evening sky"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
              <p className="text-caption text-mist">Optional — leave it blank and the existing surroundings are used.</p>
            </div>
          ) : null}
        </>
      )}
    </GenerationScreen>
  );
}
