import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SwitchRow } from '../../components/ui/SwitchRow';
import { LIGHTING, MOODS, SEASONS } from '../../lib/scene';
import type { LightingKey, MoodKey, SeasonKey } from '../../store/generation';

// Derived from the scene vocabulary rather than re-listed, so this tool and the
// scene controls can never offer different lighting options.
const opts = <K extends string>(o: Record<K, { label: string }>) =>
  (Object.keys(o) as K[]).map((value) => ({ value, label: o[value].label }));

export function AtmosphereFeature() {
  return (
    <GenerationScreen feature="atmosphere">
      {({ settings, patch }) => (
        <>
          <div className="p-5">
            <ChipGroup
              label="Light"
              value={settings.lighting}
              options={opts<LightingKey>(LIGHTING)}
              onChange={(v) => patch({ lighting: v })}
            />
          </div>
          <div className="p-5">
            <ChipGroup
              label="Season"
              value={settings.season}
              options={opts<SeasonKey>(SEASONS)}
              onChange={(v) => patch({ season: v })}
            />
          </div>
          <div className="p-5">
            <ChipGroup
              label="Mood"
              value={settings.mood}
              options={opts<MoodKey>(MOODS)}
              onChange={(v) => patch({ mood: v })}
            />
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.keepPeople}
              onChange={(v) => patch({ keepPeople: v })}
              label="Keep the people"
              hint="Off clears the render of people and vehicles, leaving the architecture."
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
