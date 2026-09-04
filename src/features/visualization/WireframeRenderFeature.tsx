import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';
import { SceneControls } from '../../components/Scene/SceneControls';

export function WireframeRenderFeature() {
  return (
    <GenerationScreen feature="wireframeRender">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
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
