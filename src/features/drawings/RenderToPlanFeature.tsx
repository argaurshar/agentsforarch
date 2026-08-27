import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { DrawingAnnotation, DrawingToggle } from './DrawingControls';

export function RenderToPlanFeature() {
  return (
    <GenerationScreen feature="renderToPlan">
      {({ settings, patch }) => (
        <>
          <DrawingToggle
            checked={settings.furnished}
            onChange={(v) => patch({ furnished: v })}
            label="Include furniture"
            hint="Plan symbols for what the view shows in each room."
          />
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
