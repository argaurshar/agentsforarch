import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { QuickControls } from '../../components/Generation/QuickControls';

export function PlaceObjectFeature() {
  // The product shot is declared on the registry entry as an extra input slot,
  // so the shell renders its dropzone and the store holds it. It used to be
  // `useState` here, which meant App.tsx's remount-on-tab-change quietly threw
  // it away the moment you looked at another tool.
  return (
    <GenerationScreen feature="placeObject">
      {({ feature, settings, patch }) => (
        <>
          <QuickControls feature={feature} settings={settings} patch={patch} />
          <div className="flex flex-col gap-2 p-5">
            <label htmlFor="place-target" className="mono-meta">
              {settings.placement === 'replace' ? 'What to replace' : 'Where to put it'}
            </label>
            <input
              id="place-target"
              value={settings.target}
              onChange={(e) => patch({ target: e.target.value })}
              placeholder={
                settings.placement === 'replace' ? 'the grey sofa under the window' : 'centred above the fireplace'
              }
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
          </div>
        </>
      )}
    </GenerationScreen>
  );
}
