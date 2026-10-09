import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function SystemsCutawayFeature() {
  return (
    <GenerationScreen feature="systemsCutaway">
      {({ feature, settings, patch }) => <QuickControls feature={feature} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
