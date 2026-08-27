import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { SwitchRow } from '../../components/ui/SwitchRow';
import { DrawingAnnotation } from './DrawingControls';

export function SketchPlanFeature() {
  return (
    <GenerationScreen feature="sketchPlan">
      {({ settings, patch }) => (
        <>
          <div className="p-5">
            <SwitchRow
              checked={settings.furnished}
              onChange={(v) => patch({ furnished: v })}
              label="Include fixtures"
              hint="Sanitary ware, kitchen counters, beds and the stair, as plan symbols."
            />
          </div>
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
