import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';
import type { SheetLayout, SheetView } from '../../store/generation';

const PANELS: Record<SheetLayout, number> = { '1x3': 3, '2x2': 4, '2x3': 6 };

const VIEW_LABEL: Record<SheetView, string> = {
  front: 'Front elevation',
  threequarter: 'Three-quarter',
  side: 'Flank',
  aerial: 'Aerial',
  detail: 'Entrance detail',
  entrance: 'Approach, eye level',
};
const ALL_VIEWS = Object.keys(VIEW_LABEL) as SheetView[];

export function MultiViewFeature() {
  return (
    <GenerationScreen feature="multiView">
      {({ feature, settings, patch }) => {
        const panels = PANELS[settings.layout];
        const atCap = settings.views.length >= panels;
        const toggle = (v: SheetView) =>
          patch({
            views: settings.views.includes(v)
              ? settings.views.filter((k) => k !== v)
              : atCap
                ? settings.views
                : [...settings.views, v],
          });
        return (
          <>
            <QuickControls feature={feature} settings={settings} patch={patch} />
            {/* Ordered multi-select, capped by the layout — not a quick axis:
                the cap depends on another axis and the ORDER is the panel
                order, neither of which a one-tap chip row can express. */}
            <div className="flex flex-col gap-3 p-5">
              <div>
                <p className="section-heading">Views</p>
                <p className="mt-1 text-caption text-mist">
                  Picked in order — the first one you tick is panel 1. {settings.views.length} of {panels} chosen.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_VIEWS.map((v) => {
                  const active = settings.views.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={active}
                      // At the cap the toggle silently no-ops, so the unselected
                      // chips have to stop looking live.
                      disabled={atCap && !active}
                      onClick={() => toggle(v)}
                      className={`pill border px-3.5 py-1.5 text-label transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                        active
                          ? 'border-ochre-deep bg-ochre-deep text-white'
                          : 'border-hairline bg-paper text-graphite hover:border-mist/40 hover:bg-drafting'
                      }`}
                    >
                      {VIEW_LABEL[v]}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        );
      }}
    </GenerationScreen>
  );
}
