import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SwitchRow } from '../../components/ui/SwitchRow';
import { DrawingAnnotation } from './DrawingControls';
import type { SectionAxis, SectionStyle } from '../../store/generation';

const AXIS_OPTIONS: { value: SectionAxis; label: string }[] = [
  { value: 'longitudinal', label: 'Along the long axis' },
  { value: 'cross', label: 'Across the short axis' },
];

const STYLE_OPTIONS: { value: SectionStyle; label: string }[] = [
  { value: 'line', label: 'Line drawing' },
  { value: 'shaded', label: 'Shaded' },
];

export function SectionFeature() {
  return (
    <GenerationScreen feature="section">
      {({ settings, patch }) => (
        <>
          <div className="p-5">
            <ChipGroup label="Cut direction" value={settings.axis} options={AXIS_OPTIONS} onChange={(v) => patch({ axis: v })} />
          </div>
          <div className="p-5">
            <ChipGroup label="Style" value={settings.style} options={STYLE_OPTIONS} onChange={(v) => patch({ style: v })} />
          </div>
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
          <div className="p-5">
    <SwitchRow
            checked={settings.entourage}
            onChange={(v) => patch({ entourage: v })}
            label="People and furniture"
            hint="Light outlines inside the rooms, so ceiling heights read at a glance."
          />

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
