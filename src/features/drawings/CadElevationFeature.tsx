import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';
import { DrawingAnnotation } from './DrawingControls';

/**
 * Which face and whether to hatch it are declared axes — and the per-option
 * hint on "Rear" is the one that matters, because that face is not in the input
 * at all. The annotation block stays here: it is two coupled fields, not a
 * one-tap choice.
 */
export function CadElevationFeature() {
  return (
    <GenerationScreen feature="cadElevation">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          <DrawingAnnotation
            annotation={settings.annotation}
            units={settings.units}
            onAnnotation={(v) => patch({ annotation: v })}
            onUnits={(v) => patch({ units: v })}
            subject="floor level"
          />
        </>
      )}
    </GenerationScreen>
  );
}
