import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function ArchitectTimelineFeature() {
  return (
    <GenerationScreen feature="architectTimeline">
      {({ feature, settings, patch }) => (
        <>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="architectTimeline-architect" className="mono-meta">
                Architect
              </label>
              <input
                id="architectTimeline-architect"
                value={settings.architect}
                onChange={(e) => patch({ architect: e.target.value })}
                placeholder="Zaha Hadid"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="architectTimeline-from" className="mono-meta">
                  From style · optional
                </label>
                <input
                  id="architectTimeline-from"
                  value={settings.fromStyle}
                  onChange={(e) => patch({ fromStyle: e.target.value })}
                  placeholder="sharp deconstructivist angles"
                  className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="architectTimeline-to" className="mono-meta">
                  To style · optional
                </label>
                <input
                  id="architectTimeline-to"
                  value={settings.toStyle}
                  onChange={(e) => patch({ toStyle: e.target.value })}
                  placeholder="fluid organic curves"
                  className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
                />
              </div>
            </div>
          </div>
          <QuickControls feature={feature} settings={settings} patch={patch} />
        </>
      )}
    </GenerationScreen>
  );
}
