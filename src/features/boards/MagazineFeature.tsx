import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function MagazineFeature() {
  return (
    <GenerationScreen feature="magazine">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="magazine-headline" className="mono-meta">
              Headline · optional
            </label>
            <input
              id="magazine-headline"
              value={settings.headline}
              onChange={(e) => patch({ headline: e.target.value })}
              placeholder="Leave empty to let the page write one"
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
