import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { SceneControls } from '../../components/Scene/SceneControls';
import { StyleRefPicker } from '../../components/Scene/StyleRefPicker';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { Select } from '../../components/ui/Select';
import { ELEVATION_THEMES } from '../../lib/scene';
import { useProjectStore } from '../../store/useProjectStore';
import type { ElevationThemeKey } from '../../store/generation';
import { useStyleRef } from '../hooks';

const TYPE_OPTIONS = [
  { value: 'Front', label: 'Front' },
  { value: 'Side', label: 'Side' },
  { value: 'Rear', label: 'Rear' },
  // Kept short so the native select never truncates it on a 320px viewport —
  // the face enumeration lives in the helper line under the field instead.
  { value: 'All', label: 'All faces' },
] as const;

const STYLE_OPTIONS = [
  { value: 'line', label: 'Line' },
  { value: 'rendered', label: 'Rendered' },
  { value: 'shaded', label: 'Shaded' },
] as const;

const SOURCE_OPTIONS = [
  { value: 'theme', label: 'Design theme' },
  { value: 'moodboard', label: 'Mood board' },
] as const;

const THEME_OPTIONS = (Object.keys(ELEVATION_THEMES) as ElevationThemeKey[]).map((k) => ({
  value: k,
  label: ELEVATION_THEMES[k].label,
}));

export function ElevationFeature() {
  const settings = useProjectStore((s) => s.generation.elevation.settings);
  const { style, styleSource, moodboard } = settings;
  // A rendered elevation is driven by a design theme OR a mood board, never both.
  const useMoodboard = style === 'rendered' && styleSource === 'moodboard' && Boolean(moodboard);
  // Reference-chaining — match a pooled image (theme mode only; a mood board wins).
  const { url: styleRefUrl } = useStyleRef('elevation');
  const useStyleRefStyle = !useMoodboard && style === 'rendered' && styleSource === 'theme' && Boolean(styleRefUrl);
  const reference = useMoodboard ? moodboard : useStyleRefStyle ? styleRefUrl : null;

  return (
    <GenerationScreen
      feature="elevation"
      run={{
        referenceImages: reference ? [reference] : undefined,
        useMoodboard,
        useStyleRef: useStyleRefStyle,
      }}
    >
      {({ settings: s, patch }) => (
        <>
          {/* Single column below `sm` — two native selects side by side truncate
              their option text at 320px. */}
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Select label="Elevation type" value={s.face} options={TYPE_OPTIONS} onChange={(v) => patch({ face: v })} />
              {s.face === 'All' ? <p className="text-label text-graphite">Front · Side · Rear, generated in one run.</p> : null}
            </div>
            <Select label="Style" value={s.style} options={STYLE_OPTIONS} onChange={(v) => patch({ style: v })} />
          </div>

          {/* Rendered elevations can be driven by a design theme OR a mood board. */}
          {s.style === 'rendered' ? (
            <div className="flex flex-col gap-4 p-5">
              <p className="section-heading">Elevation design · theme or mood board</p>
              <ChipGroup
                label="Style source"
                value={s.styleSource}
                options={SOURCE_OPTIONS}
                onChange={(v) => patch({ styleSource: v })}
              />
              {s.styleSource === 'theme' ? (
                <div className="flex flex-col gap-4">
                  <ChipGroup label="Design theme" value={s.theme} options={THEME_OPTIONS} onChange={(v) => patch({ theme: v })} />
                  <StyleRefPicker feature="elevation" note="Overrides the design theme above." />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="mono-meta">Mood board</span>
                  <ImageDropzone
                    value={s.moodboard}
                    onImage={(url) => patch({ moodboard: url })}
                    onClear={() => patch({ moodboard: null })}
                    hint="Upload a reference mood board — the render will follow its style, materials, colours and mood."
                  />
                  {!s.moodboard ? (
                    <p className="text-label text-graphite">Upload a mood board, or switch to “Design theme”.</p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          <div className="p-5">
            <SceneControls
              value={s.scene}
              onChange={(p) => patch({ scene: p })}
              show={{ lighting: s.style === 'rendered', mood: true }}
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
