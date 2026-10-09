import { CoordinateField } from '../../components/Generation/CoordinateField';
import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function SitePhotoFeature() {
  return (
    <GenerationScreen feature="sitePhoto">
      {({ feature, settings, patch }) => (
        <>
          <div className="p-5">
            <CoordinateField
              id="sitePhoto-coords"
              label="Coordinates"
              value={settings.coords}
              onChange={(coords) => patch({ coords })}
              hint="Paste them from Google Maps — right-click a spot to copy them."
            />
          </div>
          <QuickControls feature={feature} settings={settings} patch={patch} />
        </>
      )}
    </GenerationScreen>
  );
}
