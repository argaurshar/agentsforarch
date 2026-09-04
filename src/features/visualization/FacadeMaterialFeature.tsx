import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';
import { ChipGroup } from '../../components/ui/ChipGroup';
import type { MaterialScope } from '../../store/generation';

// Not a quick axis: "One named element" changes nothing until an element is
// named, and that text field cannot live in a one-tap sheet. So the pair stays
// here, together, where the second half exists.
const SCOPE_OPTIONS: { value: MaterialScope; label: string }[] = [
  { value: 'whole', label: 'The whole facade' },
  { value: 'named', label: 'One named element' },
];

/**
 * Material is the declared axis. Scope is not — it is half of a pair whose
 * other half is a text field, and a chip that does nothing on its own is worse
 * in a sheet than absent from one.
 */
export function FacadeMaterialFeature() {
  return (
    <GenerationScreen feature="facadeMaterial">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />

          {settings.materials === 'custom' ? (
            <div className="flex flex-col gap-2 p-5">
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
