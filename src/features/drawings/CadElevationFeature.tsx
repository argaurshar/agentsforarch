import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SwitchRow } from '../../components/ui/SwitchRow';
import { DrawingAnnotation } from './DrawingControls';
import type { ElevationFace } from '../../store/generation';

const FACE_OPTIONS: { value: ElevationFace; label: string }[] = [
  { value: 'front', label: 'Facing camera' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'rear', label: 'Rear' },
];

// What picking each face actually costs you. The rear one is not a style choice
// — that face is not in the input at all — so it also raises the tool's accuracy
// warning on the output, which is where it matters.
const FACE_HINT: Record<ElevationFace, string> = {
  front: 'Drawn from what the input shows, flattened.',
  left: 'The flank on the left of the view, turned square-on.',
  right: 'The flank on the right of the view, turned square-on.',
  rear: 'Not visible in the input — reconstructed from the volume, roof form and materials that are.',
};

export function CadElevationFeature() {
  return (
    <GenerationScreen feature="cadElevation">
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <ChipGroup label="Which face" value={settings.face} options={FACE_OPTIONS} onChange={(v) => patch({ face: v })} />
            <p className="text-label text-graphite">{FACE_HINT[settings.face]}</p>
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.hatch}
              onChange={(v) => patch({ hatch: v })}
              label="Material hatching"
              hint="Conventional flat hatching for brick, render, stone and glazing."
            />
          </div>
          <DrawingAnnotation
            annotation={settings.annotation}
            units={settings.units}
            onAnnotation={(v) => patch({ annotation: v })}
            onUnits={(v) => patch({ units: v })}
            subject="floor level"
          />
        </>
      )}
    </GenerationScreen>
  );
}
