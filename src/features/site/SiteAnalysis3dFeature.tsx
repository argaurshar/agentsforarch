import { CoordinateField } from '../../components/Generation/CoordinateField';
import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function SiteAnalysis3dFeature() {
  return (
    <GenerationScreen feature="siteAnalysis3d">
      {({ feature, settings, patch }) => (
        <>
          <div className="p-5">
            <CoordinateField
              id="siteAnalysis3d-coords"
              label="Coordinates · optional"
              value={settings.coords}
              onChange={(coords) => patch({ coords })}
              hint="Sets the sun path for the real latitude. Empty: the hemisphere below decides."
            />
          </div>
          <QuickControls feature={feature} settings={settings} patch={patch} />
        </>
      )}
    </GenerationScreen>
  );
}
