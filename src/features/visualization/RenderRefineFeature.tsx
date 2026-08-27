import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SwitchRow } from '../../components/ui/SwitchRow';
import type { RefineLevel } from '../../store/generation';

const LEVEL_OPTIONS: { value: RefineLevel; label: string }[] = [
  { value: 'polish', label: 'Polish' },
  { value: 'finish', label: 'Finish' },
];

const LEVEL_HINT: Record<RefineLevel, string> = {
  polish: 'Clean up what is soft or noisy. The lightest touch — closest to the original.',
  finish: 'Bring it to portfolio standard: real material detail, contact shadows, believable glass.',
};

export function RenderRefineFeature() {
  return (
    <GenerationScreen feature="renderRefine">
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <ChipGroup label="How far" value={settings.level} options={LEVEL_OPTIONS} onChange={(v) => patch({ level: v })} />
            <p className="text-label text-graphite">{LEVEL_HINT[settings.level]}</p>
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.fixMaterials}
              onChange={(v) => patch({ fixMaterials: v })}
              label="Fix materials"
              hint="Kill repeating textures, stretched mapping and brick courses at the wrong scale."
            />
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.fixPeople}
              onChange={(v) => patch({ fixPeople: v })}
              label="Fix people"
              hint="Correct anatomy, hands and feet, and shadows that actually touch the ground."
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
