import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { SceneControls } from '../../components/Scene/SceneControls';
import { SwitchRow } from '../../components/ui/SwitchRow';

export function WireframeRenderFeature() {
  return (
    <GenerationScreen feature="wireframeRender">
      {({ settings, patch }) => (
        <>
          <div className="p-5">
            <SwitchRow
              checked={settings.keepBackground}
              onChange={(v) => patch({ keepBackground: v })}
              label="Keep the viewport background"
              hint="On: whatever is behind the model stays. Off: a plausible setting is built around it."
            />
          </div>
          <div className="p-5">
            <SceneControls
              value={settings.scene}
              onChange={(p) => patch({ scene: p })}
              show={{ materials: true, lighting: true, season: true, mood: true, entourage: true }}
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
