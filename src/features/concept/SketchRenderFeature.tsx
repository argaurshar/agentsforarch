import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { SceneControls } from '../../components/Scene/SceneControls';
import { QuickControls } from '../../components/Generation/QuickControls';

export function SketchRenderFeature() {
  return (
    <GenerationScreen feature="sketchRender">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />

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
