import { FileImage } from 'lucide-react';
import { useState } from 'react';
import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { SceneControls } from '../../components/Scene/SceneControls';
import { StyleRefPicker } from '../../components/Scene/StyleRefPicker';
import { Button } from '../../components/ui/Button';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { Switch } from '../../components/ui/Switch';
import { PlanTips } from '../../components/Upload/PlanTips';
import { loadDemoPlan } from '../../lib/demoPlan';
import { ARCH_STYLES } from '../../lib/scene';
import { useProjectStore } from '../../store/useProjectStore';
import type { ArchStyleKey } from '../../store/generation';
import { useStyleRef } from '../hooks';

const VIEW_OPTIONS = [
  { value: 'isometric', label: '3D isometric' },
  { value: 'plan2d', label: '2D furnished plan' },
] as const;

const VIEW_LABEL: Record<string, string> = { isometric: 'Isometric', plan2d: 'Furnished plan' };

// Compare-styles vocabulary — the concrete design languages (no none/custom).
const COMPARE_KEYS = (Object.keys(ARCH_STYLES) as ArchStyleKey[]).filter((k) => k !== 'none' && k !== 'custom');
const MAX_COMPARE = 4;

/** "Try with a sample plan" — first-success-in-30-seconds path (no assets needed). */
function SamplePlanButton() {
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="self-start"
      icon={<FileImage size={14} strokeWidth={1.75} />}
      // `loading` also disables the button, so a slow fetch cannot fire
      // loadDemoPlan() several times over on the first-run happy path.
      loading={loading}
      onClick={() => {
        setLoading(true);
        void loadDemoPlan()
          .then((url) => setFeatureInput('render', url))
          .finally(() => setLoading(false));
      }}
    >
      {loading ? 'Loading sample…' : 'No plan handy? Try with a sample plan'}
    </Button>
  );
}

export function RenderFeature() {
  const settings = useProjectStore((s) => s.generation.render.settings);
  const input = useProjectStore((s) => s.generation.render.input);
  const mode = useProjectStore((s) => s.generation.render.mode);

  // Compare-styles batch: one input rendered in several design languages at once
  // so the client picks a direction from a single grid.
  const [compare, setCompare] = useState(false);
  const [compareSel, setCompareSel] = useState<ArchStyleKey[]>(['contemporary', 'bauhaus', 'indian']);
  const compareActive = mode !== 'refine' && compare && compareSel.length >= 2;
  const atCompareCap = compareSel.length >= MAX_COMPARE;

  const toggleCompareKey = (key: ArchStyleKey) =>
    setCompareSel((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length >= MAX_COMPARE ? prev : [...prev, key],
    );

  // Reference-chaining — match a pooled image's style. Mutually exclusive with
  // compare-styles (which varies the style, so a fixed reference makes no sense).
  const { url: styleRefUrl } = useStyleRef('render');
  const useRef = mode !== 'refine' && !compareActive && Boolean(styleRefUrl);

  return (
    <GenerationScreen
      feature="render"
      belowInput={
        <>
          {!input ? <SamplePlanButton /> : null}
          {/* The failure mode here is input-dependent and otherwise invisible,
              so the guidance sits next to the dropzone. */}
          <PlanTips />
        </>
      }
      labels={{
        emptyTitle: settings.style === 'plan2d' ? 'No furnished plan yet' : 'No isometric view yet',
        compareAfter: VIEW_LABEL[settings.style] ?? 'Isometric',
      }}
      run={{
        referenceImages: useRef && styleRefUrl ? [styleRefUrl] : undefined,
        useStyleRef: useRef,
        // In compare mode the base prompt carries NO style — one is appended per
        // variant by the provider, so a style here would fight it.
        promptSettings: compareActive ? { ...settings, scene: { ...settings.scene, archStyle: 'none' as const } } : undefined,
        styleVariants: compareActive
          ? compareSel.map((k) => ({ label: `${ARCH_STYLES[k].label} — ${VIEW_LABEL[settings.style]}`, clause: ARCH_STYLES[k].clause }))
          : undefined,
      }}
    >
      {({ settings: s, patch }) => (
        <>
          <div className="p-5">
            <ChipGroup label="Output view" value={s.style} options={VIEW_OPTIONS} onChange={(v) => patch({ style: v })} />
          </div>

          {/* Compare styles — one plan × several design languages in one batch. */}
          <div className="flex flex-col gap-4 p-5">
            <Switch checked={compare} onChange={setCompare} label="Compare styles">
              <span className="flex flex-col text-left">
                <span className="section-heading">Compare styles</span>
                <span className="mt-1 text-caption text-mist">One image per style</span>
              </span>
            </Switch>
            {compare ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {COMPARE_KEYS.map((key) => {
                    const active = compareSel.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        // At the cap the toggle silently no-ops, so the
                        // unselected chips have to stop looking live.
                        disabled={atCompareCap && !active}
                        onClick={() => toggleCompareKey(key)}
                        className={`pill border px-3.5 py-1.5 text-label transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                          active
                            ? 'border-ochre-deep bg-ochre-deep text-white'
                            : 'border-hairline bg-paper text-graphite hover:border-mist/40 hover:bg-drafting'
                        }`}
                      >
                        {ARCH_STYLES[key].label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-body text-mist">
                  {compareSel.length < 2
                    ? 'Pick at least 2 styles.'
                    : `${compareSel.length} styles → ${compareSel.length} images in one run (max ${MAX_COMPARE}).`}
                </p>
              </>
            ) : null}
          </div>

          {!compareActive ? (
            <>
              <div className="p-5">
                <StyleRefPicker feature="render" />
              </div>
              <div className="p-5">
                <SceneControls value={s.scene} onChange={(p) => patch({ scene: p })} show={{ archStyle: true }} />
              </div>
            </>
          ) : null}
        </>
      )}
    </GenerationScreen>
  );
}
