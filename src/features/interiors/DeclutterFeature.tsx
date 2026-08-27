import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { Switch } from '../../components/ui/Switch';

export function DeclutterFeature() {
  return (
    <GenerationScreen feature="declutter">
      {({ settings, patch }) => (
        <div className="p-5">
          <Switch
            checked={settings.keepBuiltIns}
            onChange={(next) => patch({ keepBuiltIns: next })}
            label="Keep fitted joinery"
          >
            <span className="flex flex-col text-left">
              <span className="section-heading">Keep fitted joinery</span>
              <span className="mt-1 text-caption text-mist">
                On: wardrobes, kitchen units and fixed shelving stay. Off: a full strip-out to bare walls.
              </span>
            </span>
          </Switch>
        </div>
      )}
    </GenerationScreen>
  );
}
