import { useState } from 'react';
import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { SceneControls } from '../../components/Scene/SceneControls';
import { StyleRefPicker } from '../../components/Scene/StyleRefPicker';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { QuickControls } from '../../components/Generation/QuickControls';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { INTERIOR_REFINE_CHIPS } from '../../lib/refine';
import { INTERIOR_THEMES } from '../../lib/scene';
import { useProjectStore } from '../../store/useProjectStore';
import type { InteriorThemeKey, RoomTypeKey } from '../../store/generation';
import { useStyleRef } from '../hooks';



const ROOM_OPTIONS: { value: RoomTypeKey; label: string }[] = [
  { value: 'living', label: 'Living room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'dining', label: 'Dining room' },
  { value: 'office', label: 'Home office' },
];

const SOURCE_OPTIONS = [
  { value: 'theme', label: 'Design theme' },
  { value: 'moodboard', label: 'Mood board' },
] as const;

const THEME_OPTIONS = (Object.keys(INTERIOR_THEMES) as InteriorThemeKey[]).map((k) => ({
  value: k,
  label: INTERIOR_THEMES[k].label,
}));

// Compare-styles vocabulary — the concrete themes (no 'none').
const COMPARE_KEYS = (Object.keys(INTERIOR_THEMES) as InteriorThemeKey[]).filter((k) => k !== 'none');
const MAX_COMPARE = 4;

export function InteriorFeature() {
  const settings = useProjectStore((s) => s.generation.interior.settings);
  const { styleSource, moodboard } = settings;

  const [compare, setCompare] = useState(false);
  const [compareSel, setCompareSel] = useState<InteriorThemeKey[]>([]);

  const useMoodboard = styleSource === 'moodboard' && Boolean(moodboard);
  const { url: styleRefUrl } = useStyleRef('interior');
  const useStyleRefStyle = !useMoodboard && styleSource === 'theme' && !compare && Boolean(styleRefUrl);
  const reference = useMoodboard ? moodboard : useStyleRefStyle ? styleRefUrl : null;

  const compareActive = styleSource === 'theme' && compare && compareSel.length >= 2;

  const toggleCompareKey = (key: InteriorThemeKey) =>
    setCompareSel((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : cur.length >= MAX_COMPARE ? cur : [...cur, key],
    );

  return (
    <GenerationScreen
      feature="interior"
      refineChips={INTERIOR_REFINE_CHIPS}
      run={{
        referenceImages: reference ? [reference] : undefined,
        useMoodboard,
        useStyleRef: useStyleRefStyle,
        styleVariants: compareActive
          ? compareSel.map((k) => ({ label: INTERIOR_THEMES[k].label, clause: INTERIOR_THEMES[k].clause }))
          : undefined,
      }}
    >
      {({ feature, settings: s, patch }) => (
        <>
          {/* Mode is a declared axis, so the chips and the per-mode explanation
              come from the registry — the same list the Tweak sheet reads. */}
          <QuickControls feature={feature} settings={s} patch={patch} />

          <div className="p-5">
            <Select label="Room type" value={s.roomType} options={ROOM_OPTIONS} onChange={(v) => patch({ roomType: v })} />
          </div>

          <div className="flex flex-col gap-4 p-5">
            <p className="section-heading">Interior design · theme or mood board</p>
            <ChipGroup
              label="Style source"
              value={s.styleSource}
              options={SOURCE_OPTIONS}
              onChange={(v) => patch({ styleSource: v })}
            />
            {s.styleSource === 'theme' ? (
              <>
                <Switch checked={compare} onChange={setCompare} label="Compare styles">
                  <span className="text-label text-graphite">Compare styles · one image per theme</span>
                </Switch>
                {compare ? (
                  <>
                    {/* Multi-select siblings of <ChipGroup>. White-on-accent at this
                        size needs the deeper ochre to clear AA. */}
                    <div className="flex flex-wrap gap-2">
                      {COMPARE_KEYS.map((key) => {
                        const active = compareSel.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggleCompareKey(key)}
                            className={`pill border px-3.5 py-1.5 text-label transition-colors active:scale-[0.98] ${
                              active
                                ? 'border-ochre-deep bg-ochre-deep text-white'
                                : 'border-hairline bg-paper text-graphite hover:border-mist/50 hover:bg-drafting'
                            }`}
                          >
                            {INTERIOR_THEMES[key].label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-label text-graphite">
                      {compareSel.length < 2
                        ? 'Pick at least 2 themes.'
                        : `${compareSel.length} themes → ${compareSel.length} images in one run (max ${MAX_COMPARE}).`}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <ChipGroup label="Design theme" value={s.theme} options={THEME_OPTIONS} onChange={(v) => patch({ theme: v })} />
                    <StyleRefPicker feature="interior" note="Overrides the design theme above." />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="mono-meta">Mood board</span>
                <ImageDropzone
                  value={s.moodboard}
                  onImage={(url) => patch({ moodboard: url })}
                  onClear={() => patch({ moodboard: null })}
                  hint="Upload a reference mood board — the room will follow its style, furniture character, colours and mood."
                />
                {!s.moodboard ? (
                  <p className="text-label text-graphite">Upload a mood board, or switch to “Design theme”.</p>
                ) : null}
              </div>
            )}
          </div>

          <div className="p-5">
            <SceneControls value={s.scene} onChange={(p) => patch({ scene: p })} show={{ mood: true }} />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
