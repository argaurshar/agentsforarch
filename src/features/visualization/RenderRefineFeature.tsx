import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

/**
 * How far to take it, and which two failure modes to fix.
 */
export function RenderRefineFeature() {
  return (
    <GenerationScreen feature="renderRefine">
      {({ feature: f, settings, patch }) => <QuickControls feature={f} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
