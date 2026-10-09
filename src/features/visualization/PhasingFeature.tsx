import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function PhasingFeature() {
  return (
    <GenerationScreen feature="phasing">
      {({ feature, settings, patch }) => <QuickControls feature={feature} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
