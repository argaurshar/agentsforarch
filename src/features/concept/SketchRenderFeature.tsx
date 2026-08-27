import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { SceneControls } from '../../components/Scene/SceneControls';
import { ChipGroup } from '../../components/ui/ChipGroup';
import type { SketchMedium } from '../../store/generation';

const MEDIUM_OPTIONS: { value: SketchMedium; label: string }[] = [
  { value: 'illustration', label: 'Illustration' },
  { value: 'photoreal', label: 'Photoreal' },
  { value: 'hybrid', label: 'Hybrid' },
];

export function SketchRenderFeature() {
  return (
    <GenerationScreen feature="sketchRender">
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <ChipGroup
              label="Finish"
              value={settings.medium}
              options={MEDIUM_OPTIONS}
              onChange={(v) => patch({ medium: v })}
            />
            <p className="text-caption text-mist">
              Hybrid keeps your own linework visible over the colour — the closest thing to a sketch that has been
              painted rather than replaced.
            </p>
          </div>

          {/* A rough sketch is ambiguous by construction, and the model resolves
              ambiguity upward unless told what it is looking at. */}
          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="sketch-subject" className="mono-meta">
              What is it
            </label>
            <input
              id="sketch-subject"
              value={settings.subject}
              onChange={(e) => patch({ subject: e.target.value })}
              placeholder="a two-storey house seen from the garden corner"
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
            <p className="text-caption text-mist">
              Optional, and worth typing. A rough line is a roof or a hill; saying which stops the model guessing
              generously.
            </p>
          </div>

          <div className="p-5">
            <SceneControls
              value={settings.scene}
              onChange={(p) => patch({ scene: p })}
              show={{ archStyle: true, materials: true, lighting: true, context: true, entourage: true }}
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
