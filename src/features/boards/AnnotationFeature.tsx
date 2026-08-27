import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { SwitchRow } from '../../components/ui/SwitchRow';
import type { AnnotationSubject } from '../../store/generation';

const SUBJECT_OPTIONS: { value: AnnotationSubject; label: string }[] = [
  { value: 'circulation', label: 'Circulation' },
  { value: 'ventilation', label: 'Ventilation' },
  { value: 'sun', label: 'Sun path' },
  { value: 'program', label: 'Program' },
  { value: 'structure', label: 'Structure' },
  { value: 'custom', label: 'Something else' },
];

export function AnnotationFeature() {
  return (
    <GenerationScreen feature="annotation">
      {({ settings, patch }) => (
        <>
          <div className="p-5">
            <ChipGroup
              label="Explain"
              value={settings.subject}
              options={SUBJECT_OPTIONS}
              onChange={(v) => patch({ subject: v })}
            />
          </div>

          {settings.subject === 'custom' ? (
            <div className="flex flex-col gap-2 p-5">
              <label htmlFor="annotation-custom" className="mono-meta">
                What should it explain
              </label>
              <input
                id="annotation-custom"
                value={settings.custom}
                onChange={(e) => patch({ custom: e.target.value })}
                placeholder="how rainwater is collected and reused"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
          ) : null}

          <div className="p-5">
            <SwitchRow
              checked={settings.labels}
              onChange={(v) => patch({ labels: v })}
              label="Labels and a legend"
              hint="Off leaves arrows and highlight zones only — cleaner, and it needs someone present to explain it."
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
