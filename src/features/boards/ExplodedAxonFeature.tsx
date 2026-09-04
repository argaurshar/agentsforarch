import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

/**
 * Explode direction and layer labels — both declared on the registry entry, so
 * this screen and the front door's Tweak sheet render the same two controls.
 */
export function ExplodedAxonFeature() {
  return (
    <GenerationScreen feature="explodedAxon">
      {({ feature: f, settings, patch }) => <QuickControls feature={f} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
