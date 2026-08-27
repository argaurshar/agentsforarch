import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SwitchRow } from '../../components/ui/SwitchRow';
import type { AnalysisLayer } from '../../store/generation';

const LAYER_OPTIONS: { value: AnalysisLayer; label: string }[] = [
  { value: 'circulation', label: 'Circulation' },
  { value: 'zoning', label: 'Zoning' },
  { value: 'daylight', label: 'Daylight' },
  { value: 'structure', label: 'Structure' },
];

export function FloorAnalysisFeature() {
  return (
    <GenerationScreen feature="floorAnalysis">
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <ChipGroup
              label="Layer"
              value={settings.layer}
              options={LAYER_OPTIONS}
              onChange={(v) => patch({ layer: v })}
            />
            <p className="text-caption text-mist">
              One at a time on purpose. Four layers on one plan is a colourful mess; four runs is a series.
            </p>
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.labels}
              onChange={(v) => patch({ labels: v })}
              label="Room names and a title"
              hint="On by default here — an analysis diagram nobody can read explains nothing."
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
