import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function AnnotationFeature() {
  return (
    <GenerationScreen feature="annotation">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />

          {settings.subject === 'custom' ? (
            <div className="flex flex-col gap-2 p-5">
              <label htmlFor="annotation-custom" className="mono-meta">
                What should it explain
              </label>
              <input
                id="annotation-custom"
                value={settings.custom}
                onChange={(e) => patch({ custom: e.target.value })}
                placeholder="how rainwater is collected and reused"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
          ) : null}
        </>
      )}
    </GenerationScreen>
  );
}
