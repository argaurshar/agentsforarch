import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';
import { parseMoves } from '../../lib/prompt/concept';

export function ConceptDiagramFeature() {
  return (
    <GenerationScreen feature="conceptDiagram">
      {({ feature, settings, patch }) => {
        const typed = parseMoves(settings.moves).length;
        return (
          <>
            <QuickControls feature={feature} settings={settings} patch={patch} />
            <div className="flex flex-col gap-2 p-5">
              <label htmlFor="conceptDiagram-moves" className="mono-meta">
                The moves · optional
              </label>
              <textarea
                id="conceptDiagram-moves"
                value={settings.moves}
                onChange={(e) => patch({ moves: e.target.value })}
                placeholder={'Leave empty to read the moves from the building, or list them one per line:\nFill the site\nCarve the courtyard\nStep the volume\nAdd roof gardens'}
                className="min-h-[6.5rem] resize-y rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
              <p className="text-caption text-mist" data-moves-count>
                {typed >= 2
                  ? `${typed} moves typed — the diagram draws ${typed} panels, in your order.`
                  : typed === 1
                    ? 'One move is not a sequence — add another, or clear the box to read them from the form.'
                    : 'Empty: the moves are read from the form, as many as Steps says.'}
              </p>
            </div>
          </>
        );
      }}
    </GenerationScreen>
  );
}
