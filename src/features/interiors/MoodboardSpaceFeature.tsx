import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function MoodboardSpaceFeature() {
  return (
    <GenerationScreen feature="moodboardSpace">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          {settings.room === 'custom' ? (
            <div className="flex flex-col gap-2 p-5">
              <label htmlFor="moodboardSpace-room" className="mono-meta">
                What kind of room
              </label>
              <input
                id="moodboardSpace-room"
                value={settings.customRoom}
                onChange={(e) => patch({ customRoom: e.target.value })}
                placeholder="boutique hotel bathroom"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
          ) : null}
        </>
      )}
    </GenerationScreen>
  );
}
