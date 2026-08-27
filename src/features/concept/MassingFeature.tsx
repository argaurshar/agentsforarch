import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import type { MassingDensity } from '../../store/generation';

const DENSITY_OPTIONS: { value: MassingDensity; label: string }[] = [
  { value: 'low', label: 'Low-rise' },
  { value: 'medium', label: 'Mid-rise' },
  { value: 'high', label: 'High-density' },
];

/**
 * The first tool with no image input.
 *
 * Everything an uploaded drawing would have told the model has to be typed
 * instead — which is why this is a form, and why the fields are the ones that
 * actually change the massing rather than a single free-text box. With no input
 * image holding the model to anything, whatever you leave unsaid gets invented
 * plausibly and confidently.
 */
export function MassingFeature() {
  return (
    <GenerationScreen feature="massing">
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="massing-brief" className="mono-meta">
              The project
            </label>
            <textarea
              id="massing-brief"
              value={settings.brief}
              onChange={(e) => patch({ brief: e.target.value })}
              placeholder="A 40-unit residential block with ground-floor retail and a courtyard"
              className="min-h-[5rem] resize-y rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="massing-site" className="mono-meta">
                Site size
              </label>
              <input
                id="massing-site"
                value={settings.siteSize}
                onChange={(e) => patch({ siteSize: e.target.value })}
                placeholder="45m × 60m corner plot"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="massing-storeys" className="mono-meta">
                Height
              </label>
              <input
                id="massing-storeys"
                value={settings.storeys}
                onChange={(e) => patch({ storeys: e.target.value })}
                placeholder="6 storeys, stepping to 4 at the street"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
          </div>

          <div className="p-5">
            <ChipGroup
              label="Density"
              value={settings.density}
              options={DENSITY_OPTIONS}
              onChange={(v) => patch({ density: v })}
            />
          </div>

          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="massing-context" className="mono-meta">
              What is around it
            </label>
            <input
              id="massing-context"
              value={settings.context}
              onChange={(e) => patch({ context: e.target.value })}
              placeholder="Four-storey terraces on two sides, a park to the south"
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
            <p className="text-caption text-mist">
              Neighbouring blocks are what make the scale readable — without them a massing model could be any size.
            </p>
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
