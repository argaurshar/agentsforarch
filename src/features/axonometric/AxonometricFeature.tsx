import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

// Everything this screen used to hand-roll — header, examples, dropzone, refine
// panel, prompt box, action row, output column, compare slider — now comes from
// <GenerationScreen> and this tool's registry entry.

const VIEWPOINTS = ['NE', 'NW', 'SE', 'SW'] as const;

// Source, style and the section switch are declared on the registry entry, so
// they render here and in the front door's Tweak sheet from one list. What is
// left below is the corner multi-select, which is neither a choice nor a toggle.
export function AxonometricFeature() {
  return (
    <GenerationScreen feature="axonometric">
      {({ feature, settings, patch }) => {
        // Preserve NE,NW,SE,SW ordering regardless of click order.
        const ordered = VIEWPOINTS.filter((vp) => settings.viewpoints.includes(vp));
        const toggle = (vp: string) =>
          patch({
            viewpoints: settings.viewpoints.includes(vp)
              ? settings.viewpoints.filter((v) => v !== vp)
              : [...settings.viewpoints, vp],
          });

        return (
          <>
            <QuickControls feature={feature} settings={settings} patch={patch} />

            {/* Viewpoints — multi-select (spec §8.03), rendered as a segmented
                control so the four options read as one field. */}
            <div className="flex flex-col gap-2 p-5">
              <div>
                <p className="section-heading">Viewpoints</p>
                <p className="mt-1 text-caption text-mist">One view per selected corner</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 rounded-field border border-hairline bg-drafting/60 p-1">
                {VIEWPOINTS.map((vp) => {
                  const active = settings.viewpoints.includes(vp);
                  return (
                    <button
                      key={vp}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(vp)}
                      className={`rounded-control py-2 text-label transition-colors active:scale-[0.98] ${
                        active ? 'bg-ochre-deep text-white' : 'text-graphite hover:bg-paper'
                      }`}
                    >
                      {vp}
                    </button>
                  );
                })}
              </div>
              <p className="text-body text-mist">
                {ordered.length || 'No'} viewpoint{ordered.length === 1 ? '' : 's'} selected.
              </p>
            </div>
          </>
        );
      }}
    </GenerationScreen>
  );
}
