import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { DrawingAnnotation, DrawingToggle } from './DrawingControls';

export function SketchPlanFeature() {
  return (
    <GenerationScreen feature="sketchPlan">
      {({ settings, patch }) => (
        <>
          <DrawingToggle
            checked={settings.furnished}
            onChange={(v) => patch({ furnished: v })}
            label="Include fixtures"
            hint="Sanitary ware, kitchen counters, beds and the stair, as plan symbols."
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
