import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { SwitchRow } from '../../components/ui/SwitchRow';
import { DrawingAnnotation } from './DrawingControls';

export function RenderToPlanFeature() {
  return (
    <GenerationScreen feature="renderToPlan">
      {({ settings, patch }) => (
        <>
          <div className="p-5">
            <SwitchRow
              checked={settings.furnished}
              onChange={(v) => patch({ furnished: v })}
              label="Include furniture"
              hint="Plan symbols for what the view shows in each room."
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
