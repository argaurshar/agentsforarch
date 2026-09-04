import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';
import { DrawingAnnotation } from './DrawingControls';

export function SectionFeature() {
  return (
    <GenerationScreen feature="section">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="section-levels" className="mono-meta">
              Storeys and levels
            </label>
            <input
              id="section-levels"
              value={settings.levels}
              onChange={(e) => patch({ levels: e.target.value })}
              placeholder="Ground + 2, 3m floor-to-floor, pitched roof over"
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
            <p className="text-caption text-mist">
              Optional, but a plan or a single view often cannot show how tall the building is — this is where you say.
            </p>
          </div>
          <DrawingAnnotation
            annotation={settings.annotation}
            units={settings.units}
            onAnnotation={(v) => patch({ annotation: v })}
            onUnits={(v) => patch({ units: v })}
            subject="floor level and room"
          />
        </>
      )}
    </GenerationScreen>
  );
}
