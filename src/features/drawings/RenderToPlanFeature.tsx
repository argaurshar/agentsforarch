import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';
import { DrawingAnnotation } from './DrawingControls';

export function RenderToPlanFeature() {
  return (
    <GenerationScreen feature="renderToPlan">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          <DrawingAnnotation
            annotation={settings.annotation}
            units={settings.units}
            onAnnotation={(v) => patch({ annotation: v })}
            onUnits={(v) => patch({ units: v })}
            subject="room"
          />
        </>
      )}
    </GenerationScreen>
  );
}
