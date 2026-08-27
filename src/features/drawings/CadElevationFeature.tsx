import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { DrawingAnnotation, DrawingToggle } from './DrawingControls';
import type { ElevationFace } from '../../store/generation';

const FACE_OPTIONS: { value: ElevationFace; label: string }[] = [
  { value: 'front', label: 'Facing camera' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'rear', label: 'Rear' },
];

// The rear face is not in the input at all — it has to be reconstructed from the
// volume, and saying so is more honest than letting it look like the other three.
const FACE_HINT: Record<ElevationFace, string> = {
  front: 'Drawn from what the input shows, flattened.',
  left: 'The flank on the left of the view, turned square-on.',
  right: 'The flank on the right of the view, turned square-on.',
  rear: 'Not visible in the input — inferred from the volume, roof form and materials that are. Check it carefully.',
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
          <DrawingToggle
            checked={settings.hatch}
            onChange={(v) => patch({ hatch: v })}
            label="Material hatching"
            hint="Conventional flat hatching for brick, render, stone and glazing."
          />
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
