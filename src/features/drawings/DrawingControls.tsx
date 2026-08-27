import { ChipGroup } from '../../components/ui/ChipGroup';
import type { AnnotationMode, DrawingUnits } from '../../store/generation';

/**
 * The two controls every drawing tool has: how much text goes on the drawing,
 * and in what units.
 *
 * Shared rather than repeated four times — the last thing this codebase needs is
 * four copies of a control pair that then drift. Units only appear once
 * dimensions are switched on, because they mean nothing otherwise.
 *
 * `none` is the default everywhere: text on a generated drawing is a liability,
 * since a misspelled room name is worse than no room name.
 */

const ANNOTATION_OPTIONS: { value: AnnotationMode; label: string }[] = [
  { value: 'none', label: 'No text' },
  { value: 'labels', label: 'Labels' },
  { value: 'dimensioned', label: 'Labels + dimensions' },
];

const UNIT_OPTIONS: { value: DrawingUnits; label: string }[] = [
  { value: 'metric', label: 'Metric (mm)' },
  { value: 'imperial', label: 'Imperial (ft/in)' },
];

export function DrawingAnnotation({
  annotation,
  units,
  onAnnotation,
  onUnits,
  subject,
}: {
  annotation: AnnotationMode;
  units: DrawingUnits;
  onAnnotation: (v: AnnotationMode) => void;
  onUnits: (v: DrawingUnits) => void;
  /** What gets labelled, for the hint line. */
  subject: string;
}) {
  return (
    <div className="flex flex-col gap-4 p-5">
      <ChipGroup label="Annotation" value={annotation} options={ANNOTATION_OPTIONS} onChange={onAnnotation} />
      <p className="text-caption text-mist">
        {annotation === 'none'
          ? 'A clean drawing with nothing written on it.'
          : annotation === 'labels'
            ? `Each ${subject} named — nothing else.`
            : `Each ${subject} named, with dimension lines along the outer faces.`}
        {annotation !== 'none' ? ' Generated text is occasionally misspelled — read it before you use it.' : ''}
      </p>
      {annotation === 'dimensioned' ? (
        <ChipGroup label="Units" value={units} options={UNIT_OPTIONS} onChange={onUnits} />
      ) : null}
    </div>
  );
}
