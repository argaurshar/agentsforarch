import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function ConceptBoardFeature() {
  return (
    <GenerationScreen feature="conceptBoard">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          <div className="flex flex-col gap-4 p-5">
            {settings.program === 'custom' ? (
              <div className="flex flex-col gap-2">
                <label htmlFor="conceptBoard-program" className="mono-meta">
                  What is the building
                </label>
                <input
                  id="conceptBoard-program"
                  value={settings.customProgram}
                  onChange={(e) => patch({ customProgram: e.target.value })}
                  placeholder="a public library on a waterfront"
                  className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <label htmlFor="conceptBoard-title" className="mono-meta">
                Title · optional
              </label>
              <input
                id="conceptBoard-title"
                value={settings.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Leave empty to let the design be named"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
            </div>
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
