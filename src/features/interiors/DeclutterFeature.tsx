import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

/**
 * One switch: whether fitted joinery survives the strip-out.
 */
export function DeclutterFeature() {
  return (
    <GenerationScreen feature="declutter">
      {({ feature: f, settings, patch }) => <QuickControls feature={f} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
