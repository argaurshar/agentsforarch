import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SwitchRow } from '../../components/ui/SwitchRow';
import type { WatercolourPalette } from '../../store/generation';

const PALETTE_OPTIONS: { value: WatercolourPalette; label: string }[] = [
  { value: 'warm', label: 'Warm' },
  { value: 'cool', label: 'Cool' },
  { value: 'muted', label: 'Muted' },
  { value: 'monochrome', label: 'Monochrome' },
];

export function WatercolourFeature() {
  return (
    <GenerationScreen feature="watercolour">
      {({ settings, patch }) => (
        <>
          <div className="p-5">
            <ChipGroup
              label="Palette"
              value={settings.palette}
              options={PALETTE_OPTIONS}
              onChange={(v) => patch({ palette: v })}
            />
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.loose}
              onChange={(v) => patch({ loose: v })}
              label="Loose washes"
              hint="Bleeding edges and pooling pigment. The paint gets to be loose; the building does not."
            />
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.keepLines}
              onChange={(v) => patch({ keepLines: v })}
              label="Ink line over the paint"
              hint="Off leaves the form described by the washes alone — softer, and harder to read at small sizes."
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
