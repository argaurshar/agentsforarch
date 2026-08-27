import { useState } from 'react';
import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import type { PlaceObjectKind } from '../../store/generation';

const KIND_OPTIONS: { value: PlaceObjectKind; label: string }[] = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'lighting', label: 'Light fitting' },
  { value: 'artwork', label: 'Artwork' },
];

// Each object type has a different physical consequence in the room, which is
// what the prompt varies on — so the hint says what will actually happen.
const KIND_HINT: Record<PlaceObjectKind, string> = {
  furniture: 'Grounded with a contact shadow and correct occlusion against what is already there.',
  lighting: 'Placed switched ON — its light falls on the surrounding ceiling, walls and furniture.',
  artwork: 'Mounted flat to the wall plane in correct perspective, wall finish untouched.',
};

const PLACEMENT_OPTIONS = [
  { value: 'replace', label: 'Replace something' },
  { value: 'add', label: 'Add to the room' },
] as const;

export function PlaceObjectFeature() {
  // The product shot is a second INPUT, not a style reference, so it is local to
  // the screen and passed through as a reference image on the request.
  const [product, setProduct] = useState<string | null>(null);

  return (
    <GenerationScreen
      feature="placeObject"
      secondInput={{
        label: 'Input · the object',
        hint: 'A product shot of the exact item — plain background works best',
        value: product,
        onChange: setProduct,
      }}
      run={{ referenceImages: product ? [product] : undefined }}
    >
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <ChipGroup label="Object type" value={settings.kind} options={KIND_OPTIONS} onChange={(v) => patch({ kind: v })} />
            <p className="text-label text-graphite">{KIND_HINT[settings.kind]}</p>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <ChipGroup
              label="Placement"
              value={settings.placement}
              options={PLACEMENT_OPTIONS}
              onChange={(v) => patch({ placement: v })}
            />
            <div className="flex flex-col gap-2">
              <label htmlFor="place-target" className="mono-meta">
                {settings.placement === 'replace' ? 'What to replace' : 'Where to put it'}
              </label>
              <input
                id="place-target"
                value={settings.target}
                onChange={(e) => patch({ target: e.target.value })}
                placeholder={
                  settings.placement === 'replace' ? 'the grey sofa under the window' : 'centred above the fireplace'
                }
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
