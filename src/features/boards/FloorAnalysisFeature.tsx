import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

/**
 * Which layer to draw, and whether to label it. One layer at a time on purpose:
 * four layers on one plan is a colourful mess, four runs is a series.
 */
export function FloorAnalysisFeature() {
  return (
    <GenerationScreen feature="floorAnalysis">
      {({ feature: f, settings, patch }) => <QuickControls feature={f} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
