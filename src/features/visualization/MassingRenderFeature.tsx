import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

/**
 * Massing model + reference image → render. The reference is declared on the
 * registry entry as an extra input slot, so the shell renders its dropzone and
 * the store keeps it across tab changes; this screen only adds the controls.
 */
export function MassingRenderFeature() {
  return (
    <GenerationScreen feature="massingRender">
      {({ feature, settings, patch }) => <QuickControls feature={feature} settings={settings} patch={patch} />}
    </GenerationScreen>
  );
}
