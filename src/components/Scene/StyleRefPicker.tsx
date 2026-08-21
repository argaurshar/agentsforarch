import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { poolFromProject, useProjectStore } from '../../store/useProjectStore';
import type { FeatureKind } from '../../types';
import { Switch } from '../ui/Switch';

interface StyleRefPickerProps {
  feature: FeatureKind;
  /** Extra context line under the thumbnails. */
  note?: string;
}

/**
 * Reference-chaining picker: choose any previously generated / uploaded image as a
 * style reference for this feature's next run. The reference rides alongside the
 * input as a second image, so a whole set (render → elevation → interior) can
 * share one material / colour / mood language. Single-select; click again to clear.
 */
export function StyleRefPicker({ feature, note }: StyleRefPickerProps) {
  const project = useProjectStore((s) => s.project);
  const styleRef = useProjectStore((s) => s.generation[feature].styleRef);
  const patchFeatureRun = useProjectStore((s) => s.patchFeatureRun);
  const pool = useMemo(() => poolFromProject(project), [project]);
  const [open, setOpen] = useState<boolean>(Boolean(styleRef));

  const set = (id: string | null) => patchFeatureRun(feature, { styleRef: id });

  const toggleOpen = () => {
    setOpen((v) => {
      const next = !v;
      if (!next) set(null); // turning it off clears the reference
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-field border border-hairline bg-paper p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="section-heading">Match a reference style</span>
          <span className="text-caption text-mist">Optional</span>
        </div>
        <Switch checked={open} onChange={toggleOpen} label="Match a reference style">
          <span className="sr-only">Match a reference style</span>
        </Switch>
      </div>

      {open ? (
        pool.length === 0 ? (
          <p className="text-body text-graphite">
            Generate or upload some images first — then reuse one here to carry its palette, materials and mood into this
            output.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {pool.map((ref) => {
                const active = ref.image.id === styleRef;
                return (
                  <button
                    key={ref.image.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set(active ? null : ref.image.id)}
                    title={ref.image.label}
                    // Selection is a ring, not a 1px border swap — a hairline
                    // colour change is invisible over a busy photo. Unselected
                    // tiles stay at full opacity so the row does not read as
                    // half-loaded.
                    className={`relative h-14 w-20 overflow-hidden rounded-control border border-hairline transition-all ${
                      active ? 'ring-2 ring-ochre ring-offset-2 ring-offset-paper' : 'hover:border-mist/40'
                    }`}
                  >
                    <img src={ref.image.url} alt={ref.image.label} className="h-full w-full object-cover" />
                    {active ? (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ochre-deep text-white shadow-card">
                        <Check size={12} strokeWidth={2} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="text-body text-graphite">
              {styleRef
                ? 'This output will follow the selected image’s palette, materials and mood.'
                : 'Pick one image to match its style.'}
              {note ? ` ${note}` : ''}
            </p>
          </>
        )
      ) : null}
    </div>
  );
}
