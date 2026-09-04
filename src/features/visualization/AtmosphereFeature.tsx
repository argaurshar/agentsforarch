import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

/**
 * Light, season and mood — the three axes this tool exists to change on an
 * existing render — plus whether the people in it survive.
 */
export function AtmosphereFeature() {
  return (
    <GenerationScreen feature="atmosphere">
      {({ feature: f, settings, patch }) => <QuickControls feature={f} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
