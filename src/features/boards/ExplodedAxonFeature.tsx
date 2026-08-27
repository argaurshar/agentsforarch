import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SwitchRow } from '../../components/ui/SwitchRow';
import type { ExplodeAxis } from '../../store/generation';

const AXIS_OPTIONS: { value: ExplodeAxis; label: string }[] = [
  { value: 'vertical', label: 'Upward' },
  { value: 'layered', label: 'Outward' },
];

export function ExplodedAxonFeature() {
  return (
    <GenerationScreen feature="explodedAxon">
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <ChipGroup label="Explode" value={settings.axis} options={AXIS_OPTIONS} onChange={(v) => patch({ axis: v })} />
            <p className="text-caption text-mist">
              Upward reads as an assembly sequence. Outward peels the envelope off the structure — better for showing a
              facade build-up.
            </p>
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.labels}
              onChange={(v) => patch({ labels: v })}
              label="Label each layer"
              hint="Roof structure, floor plates, frame, facade, ground — on leader lines."
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
