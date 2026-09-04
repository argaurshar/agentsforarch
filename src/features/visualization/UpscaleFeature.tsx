import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';
import { Notice } from '../../components/ui/Notice';
import { useProjectStore } from '../../store/useProjectStore';

export function UpscaleFeature() {
  // The resolution parameter reaches the kie.ai API; Gemini's image endpoint
  // takes no equivalent, so on that engine only the prompt is doing the work.
  // Saying so beats quietly under-delivering on the one tool whose entire
  // selling point is the pixel count.
  const providerName = useProjectStore((s) => s.providerName);
  const onKie = /kie/i.test(providerName);

  return (
    <GenerationScreen feature="upscale">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          {!onKie ? (
            <div className="p-5">
              <Notice
                tone="warning"
                message={`${providerName} takes no resolution parameter, so this runs as a detail pass at the model's own output size. Switch the engine to kie.ai in Settings to request ${settings.resolution} directly.`}
              />
            </div>
          ) : null}
        </>
      )}
    </GenerationScreen>
  );
}
