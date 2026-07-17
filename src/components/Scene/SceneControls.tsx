import { CONTEXTS, LIGHTING, MATERIAL_PRESETS, MOODS, SEASONS } from '../../lib/scene';
import type { SceneOpt } from '../../lib/scene';
import type { SceneOptions } from '../../store/generation';
import { ChipGroup } from '../ui/ChipGroup';
import { Select } from '../ui/Select';

interface Show {
  materials?: boolean;
  lighting?: boolean;
  season?: boolean;
  mood?: boolean;
  context?: boolean;
  setting?: boolean;
  entourage?: boolean;
}

interface SceneControlsProps {
  value: SceneOptions;
  onChange: (patch: Partial<SceneOptions>) => void;
  show: Show;
}

function toOptions<T extends string>(map: Record<T, SceneOpt>): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((key) => ({ value: key, label: map[key].label }));
}

/**
 * One-click scene controls that auto-assemble the prompt (P1). Each feature
 * passes `show` flags for the rows that apply to it; the prompt textarea (Reset)
 * still reflects the assembled prompt and stays editable.
 */
export function SceneControls({ value, onChange, show }: SceneControlsProps) {
  return (
    <div className="flex flex-col gap-4 border border-hairline bg-paper p-4">
      <p className="mono-meta text-ochre">Scene · no prompt needed</p>

      {show.materials ? (
        <div className="flex flex-col gap-2">
          <Select
            label="Materials"
            value={value.materials}
            options={toOptions(MATERIAL_PRESETS)}
            onChange={(v) => onChange({ materials: v as SceneOptions['materials'] })}
          />
          {value.materials === 'custom' ? (
            <input
              value={value.customMaterials}
              onChange={(e) => onChange({ customMaterials: e.target.value })}
              placeholder="Describe the materials, e.g. corten steel, travertine, ash timber…"
              className="border border-hairline bg-paper px-3 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
            />
          ) : null}
        </div>
      ) : null}

      {show.lighting ? (
        <ChipGroup
          label="Lighting / time of day"
          value={value.lighting}
          options={toOptions(LIGHTING)}
          onChange={(v) => onChange({ lighting: v as SceneOptions['lighting'] })}
        />
      ) : null}

      {show.setting ? (
        <ChipGroup
          label="Setting"
          value={value.setting}
          options={[
            { value: 'exterior', label: 'Exterior' },
            { value: 'interior', label: 'Interior' },
          ]}
          onChange={(v) => onChange({ setting: v as SceneOptions['setting'] })}
        />
      ) : null}

      {show.context ? (
        <ChipGroup
          label="Context"
          value={value.context}
          options={toOptions(CONTEXTS)}
          onChange={(v) => onChange({ context: v as SceneOptions['context'] })}
        />
      ) : null}

      {show.season ? (
        <ChipGroup
          label="Season"
          value={value.season}
          options={toOptions(SEASONS)}
          onChange={(v) => onChange({ season: v as SceneOptions['season'] })}
        />
      ) : null}

      {show.mood ? (
        <ChipGroup
          label="Mood"
          value={value.mood}
          options={toOptions(MOODS)}
          onChange={(v) => onChange({ mood: v as SceneOptions['mood'] })}
        />
      ) : null}

      {show.entourage ? (
        <div className="flex items-center justify-between">
          <span className="mono-meta">People for scale</span>
          <button
            type="button"
            role="switch"
            aria-checked={value.entourage}
            aria-label="People for scale"
            onClick={() => onChange({ entourage: !value.entourage })}
            className={`relative h-6 w-11 border transition-colors focus-visible:outline-ochre ${
              value.entourage ? 'border-ochre bg-ochre' : 'border-hairline bg-drafting'
            }`}
          >
            <span
              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 bg-bone transition-all ${
                value.entourage ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      ) : null}
    </div>
  );
}
