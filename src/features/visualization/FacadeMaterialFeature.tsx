import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { MATERIAL_PRESETS } from '../../lib/scene';
import type { MaterialScope, MaterialsKey } from '../../store/generation';

const MATERIAL_OPTIONS = (Object.keys(MATERIAL_PRESETS) as MaterialsKey[]).map((value) => ({
  value,
  label: MATERIAL_PRESETS[value].label,
}));

const SCOPE_OPTIONS: { value: MaterialScope; label: string }[] = [
  { value: 'whole', label: 'The whole facade' },
  { value: 'named', label: 'One named element' },
];

export function FacadeMaterialFeature() {
  return (
    <GenerationScreen feature="facadeMaterial">
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-4 p-5">
            <ChipGroup
              label="Material"
              value={settings.materials}
              options={MATERIAL_OPTIONS}
              onChange={(v) => patch({ materials: v })}
            />
            {settings.materials === 'custom' ? (
              <div className="flex flex-col gap-2">
                <label htmlFor="facade-custom" className="mono-meta">
                  Describe the material
                </label>
                <input
                  id="facade-custom"
                  value={settings.customMaterials}
                  onChange={(e) => patch({ customMaterials: e.target.value })}
                  placeholder="Charred larch cladding with black steel reveals"
                  className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 p-5">
            <ChipGroup label="Apply to" value={settings.scope} options={SCOPE_OPTIONS} onChange={(v) => patch({ scope: v })} />
            {settings.scope === 'named' ? (
              <div className="flex flex-col gap-2">
                <label htmlFor="facade-target" className="mono-meta">
                  Which element
                </label>
                <input
                  id="facade-target"
                  value={settings.target}
                  onChange={(e) => patch({ target: e.target.value })}
                  placeholder="the ground-floor plinth"
                  className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
                />
              </div>
            ) : null}
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
