import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';
import { ChipGroup } from '../../components/ui/ChipGroup';

/** What an attached image is. Shown only once there is one — before that the
 *  choice means nothing, and a control that does nothing is a lie. */
const IMAGE_ROLES = [
  {
    value: 'sketch',
    label: 'A sketch to follow',
    hint: 'Its volumes are the design: built as drawn, straightened, nothing added or merged.',
  },
  {
    value: 'reference',
    label: 'A reference to learn from',
    hint: 'Its massing idea is applied to your brief — a different building on the same logic, never a copy.',
  },
] as const;

/**
 * A form first, with an optional image.
 *
 * It began as the one tool with no image input, so everything a drawing would
 * have said had to be typed — which is why the fields are the ones that actually
 * change the massing rather than one free-text box. An image is now optional: a
 * sketch to follow (and then the brief can be empty), or a precedent whose idea
 * to borrow. With nothing attached it behaves exactly as before.
 */
export function MassingFeature() {
  return (
    <GenerationScreen feature="massing">
      {({ feature, settings, patch, hasImage }) => (
        <>
          {hasImage ? (
            <div className="flex flex-col gap-2 p-5" data-massing-image-role>
              <ChipGroup
                label="The image is"
                value={settings.imageRole}
                options={IMAGE_ROLES}
                onChange={(v) => patch({ imageRole: v })}
              />
              {/* The selected option's own explanation, unmuted — the same
                  weight QuickControls gives a per-option hint. */}
              <p className="text-label text-graphite">
                {IMAGE_ROLES.find((r) => r.value === settings.imageRole)?.hint}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="massing-brief" className="mono-meta">
              {hasImage && settings.imageRole === 'sketch' ? 'The project · optional with a sketch' : 'The project'}
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

          <QuickControls feature={feature} settings={settings} patch={patch} />

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
