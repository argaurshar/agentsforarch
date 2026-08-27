import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import { Notice } from '../../components/ui/Notice';
import { SwitchRow } from '../../components/ui/SwitchRow';
import { useProjectStore } from '../../store/useProjectStore';
import type { UpscaleSettings } from '../../store/generation';

const RES_OPTIONS: { value: UpscaleSettings['resolution']; label: string }[] = [
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

export function UpscaleFeature() {
  // The resolution parameter reaches the kie.ai API; Gemini's image endpoint
  // takes no equivalent, so on that engine only the prompt is doing the work.
  // Saying so beats quietly under-delivering on the one tool whose entire
  // selling point is the pixel count.
  const providerName = useProjectStore((s) => s.providerName);
  const onKie = /kie/i.test(providerName);

  return (
    <GenerationScreen feature="upscale">
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-3 p-5">
            <ChipGroup
              label="Target size"
              value={settings.resolution}
              options={RES_OPTIONS}
              onChange={(v) => patch({ resolution: v })}
            />
            {!onKie ? (
              <Notice
                tone="warning"
                message={`${providerName} takes no resolution parameter, so this runs as a detail pass at the model's own output size. Switch the engine to kie.ai in Settings to request ${settings.resolution} directly.`}
              />
            ) : null}
          </div>
          <div className="p-5">
            <SwitchRow
              checked={settings.sharpen}
              onChange={(v) => patch({ sharpen: v })}
              label="Output sharpening"
              hint="Restrained, for large-format print. Off leaves the result naturally soft."
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
