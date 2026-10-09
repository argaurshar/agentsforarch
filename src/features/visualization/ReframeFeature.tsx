import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function ReframeFeature() {
  return (
    <GenerationScreen feature="reframe">
      {({ feature, settings, patch }) => <QuickControls feature={feature} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
