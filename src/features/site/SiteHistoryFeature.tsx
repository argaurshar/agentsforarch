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
                Name of the place
              </label>
              <input
                id="siteHistory-place"
                value={settings.place}
                onChange={(e) => patch({ place: e.target.value })}
                placeholder="Taj Mahal complex"
                aria-describedby="siteHistory-place-hint"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
              {/* Z11, Z11b: coordinates alone came back as two different
                  wrong sites, so the name is required. */}
              <p id="siteHistory-place-hint" className="text-caption text-mist">
                Search cannot reliably tell what stands at bare coordinates, so the name says what to research; the
                coordinates fix the frame. The timeline prints the place it drew — check it.
              </p>
            </div>
          </div>
          <QuickControls feature={feature} settings={settings} patch={patch} />
        </>
      )}
    </GenerationScreen>
  );
}
