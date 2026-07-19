import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { poolFromProject, useProjectStore } from '../../store/useProjectStore';
import type { FeatureKind } from '../../types';

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
    <div className="flex flex-col gap-3 border border-hairline bg-paper p-4">
      <div className="flex items-center justify-between">
        <span className="mono-meta text-ochre">Match a reference style · optional</span>
        <button
          type="button"
          role="switch"
          aria-checked={open}
          aria-label="Match a reference style"
          onClick={toggleOpen}
          className={`relative h-6 w-11 border transition-colors focus-visible:outline-ochre ${
            open ? 'border-ochre bg-ochre' : 'border-hairline bg-drafting'
          }`}
        >
          <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 bg-bone transition-all ${open ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {open ? (
        pool.length === 0 ? (
          <p className="text-xs text-mist">
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
                    className={`relative h-14 w-20 overflow-hidden border transition-all focus-visible:outline-ochre ${
                      active ? 'border-ochre' : 'border-hairline opacity-60 hover:opacity-90'
                    }`}
                  >
                    <img src={ref.image.url} alt={ref.image.label} className="h-full w-full object-cover" />
                    {active ? (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center border border-ochre bg-ochre text-bone">
                        <Check size={11} strokeWidth={2.5} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-mist">
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
