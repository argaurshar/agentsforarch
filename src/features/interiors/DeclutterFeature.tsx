import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { SwitchRow } from '../../components/ui/SwitchRow';

export function DeclutterFeature() {
  return (
    <GenerationScreen feature="declutter">
      {({ settings, patch }) => (
        <div className="p-5">
          <SwitchRow
            checked={settings.keepBuiltIns}
            onChange={(next) => patch({ keepBuiltIns: next })}
            label="Keep fitted joinery"
            hint="On: wardrobes, kitchen units and fixed shelving stay. Off: a full strip-out to bare walls."
          />
        </div>
      )}
    </GenerationScreen>
  );
}
