import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function BirdsEyeFeature() {
  return (
    <GenerationScreen feature="birdsEye">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
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
