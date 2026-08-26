import { ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';

/**
 * What the model can and cannot do with a floor plan, and how to prepare one.
 *
 * This exists because the failure mode is input-dependent and invisible: the
 * engine redraws the building from an *understanding* of the plan rather than
 * tracing it, so wherever the drawing is ambiguous it falls back on the most
 * common thing it has seen — a plain rectangular apartment. Irregular
 * footprints and hairline CAD linework are exactly where that bites, and a user
 * has no way to know that from the dropzone alone.
 */
export function PlanTips() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-field border border-hairline bg-drafting/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-drafting"
      >
        <Info size={15} strokeWidth={1.75} className="shrink-0 text-mist" />
        <span className="flex-1 text-label text-graphite">Getting the best result from your plan</span>
        <ChevronDown
          size={15}
          strokeWidth={1.75}
          className={`shrink-0 text-mist transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-hairline px-4 py-4">
          <p className="text-body leading-relaxed text-graphite">
            This is an <strong>ideation render, not a measured drawing</strong>. It follows your plan’s layout and
            character, but it is not dimensionally accurate — don’t issue it as documentation or let a client measure
            off it.
          </p>

          <div className="flex flex-col gap-1.5">
            <span className="section-heading">Prepare the plan</span>
            <ul className="flex list-disc flex-col gap-1 pl-4 text-body leading-relaxed text-graphite marker:text-mist">
              <li>
                Export at <strong>2000–3000&nbsp;px wide as PNG</strong> on a <strong>white</strong> background — not
                JPEG, not transparent.
              </li>
              <li>
                <strong>Label every room in text</strong> (KITCHEN, BEDROOM&nbsp;1…). This is the single highest-leverage
                thing you can do — the engine reads labels far more reliably than furniture symbols.
              </li>
              <li>Strip dimension strings, notes, grid lines, north points and title blocks. Keep walls, doors, windows and furniture.</li>
              <li>Thicken the wall linework if you can — hairlines survive the engine’s own resampling poorly.</li>
              <li>Crop tight to the building, with a small even margin.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="section-heading">Where it needs a second look</span>
            <p className="text-body leading-relaxed text-graphite">
              Irregular footprints (L / T / U shapes, stepped or chamfered walls), angled or curved bay windows, very
              small rooms, and densely furnished plans are the hardest cases — the engine tends to regularise them. If
              your footprint is irregular, say so in the prompt box, e.g.{' '}
              <span className="text-graphite">
                “L-shaped footprint with an angled bay window — reproduce the outline exactly, do not square it off.”
              </span>{' '}
              Then check the outline before you use the result.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
