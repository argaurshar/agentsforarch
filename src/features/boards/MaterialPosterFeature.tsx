import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function MaterialPosterFeature() {
  return (
    <GenerationScreen feature="materialPoster">
      {({ feature, settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="materialPoster-topic" className="mono-meta">
              Material or system
            </label>
            <input
              id="materialPoster-topic"
              value={settings.topic}
              onChange={(e) => patch({ topic: e.target.value })}
              placeholder="Terracotta jali blocks"
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
          </div>
          <QuickControls feature={feature} settings={settings} patch={patch} />
        </>
      )}
    </GenerationScreen>
  );
}
