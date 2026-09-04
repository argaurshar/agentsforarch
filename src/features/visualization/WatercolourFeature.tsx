import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

/**
 * Palette, wash looseness and whether an ink line survives on top.
 */
export function WatercolourFeature() {
  return (
    <GenerationScreen feature="watercolour">
      {({ feature: f, settings, patch }) => <QuickControls feature={f} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
