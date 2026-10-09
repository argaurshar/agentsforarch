import { CoordinateField } from '../../components/Generation/CoordinateField';
import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function SiteHistoryFeature() {
  return (
    <GenerationScreen feature="siteHistory">
      {({ feature, settings, patch }) => (
        <>
          <div className="flex flex-col gap-4 p-5">
            <CoordinateField
              id="siteHistory-coords"
              label="Coordinates"
              value={settings.coords}
              onChange={(coords) => patch({ coords })}
              hint="Paste them from Google Maps — right-click a spot to copy them."
            />
            <div className="flex flex-col gap-2">
              <label htmlFor="siteHistory-place" className="mono-meta">
                Name of the place · optional
              </label>
              <input
                id="siteHistory-place"
                value={settings.place}
                onChange={(e) => patch({ place: e.target.value })}
                placeholder="Taj Mahal complex"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
          </div>
          <QuickControls feature={feature} settings={settings} patch={patch} />
        </>
      )}
    </GenerationScreen>
  );
}
