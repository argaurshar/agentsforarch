import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

/**
 * How many figures, what they are doing, and whether vehicles and planting come
 * with them.
 */
export function HumanScaleFeature() {
  return (
    <GenerationScreen feature="humanScale">
      {({ feature: f, settings, patch }) => <QuickControls feature={f} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
