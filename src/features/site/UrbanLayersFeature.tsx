import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

/** Two steps in one tool: the result card's "Stack these layers" sends the
 *  sheet back here with Step set to stack (a send preset on the registry). */
export function UrbanLayersFeature() {
  return (
    <GenerationScreen feature="urbanLayers">
      {({ feature, settings, patch }) => <QuickControls feature={feature} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
