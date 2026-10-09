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
                Name of the place · recommended
              </label>
              <input
                id="siteHistory-place"
                value={settings.place}
                onChange={(e) => patch({ place: e.target.value })}
                placeholder="Taj Mahal complex"
                aria-describedby="siteHistory-place-hint"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
              {/* Z11: Battersea Power Station's coordinates came back as
                  Buckingham Palace. A name keeps the search on the right site. */}
              <p id="siteHistory-place-hint" className="text-caption text-mist">
                Coordinates alone can be matched to a better-known place nearby — the name keeps the research on your
                site. The timeline names the place it found; check it.
              </p>
            </div>
          </div>
          <QuickControls feature={feature} settings={settings} patch={patch} />
        </>
      )}
    </GenerationScreen>
  );
}
