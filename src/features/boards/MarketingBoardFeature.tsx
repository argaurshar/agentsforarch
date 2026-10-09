import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function MarketingBoardFeature() {
  return (
    <GenerationScreen feature="marketingBoard">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="marketingBoard-title" className="mono-meta">
                Project name · optional
              </label>
              <input
                id="marketingBoard-title"
                value={settings.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Hillside House"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="marketingBoard-facts" className="mono-meta">
                Facts to print · optional
              </label>
              <textarea
                id="marketingBoard-facts"
                value={settings.facts}
                onChange={(e) => patch({ facts: e.target.value })}
                placeholder="Bengaluru, India · 320 m² · 2026"
                className="min-h-[4.5rem] resize-y rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
              <p className="text-caption text-mist">The board prints these and nothing else — no invented areas, dates or awards.</p>
            </div>
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
