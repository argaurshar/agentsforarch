import { GenerationScreen } from '../../components/Generation/GenerationScreen';

export function TargetedSwapFeature() {
  return (
    <GenerationScreen feature="targetedSwap">
      {({ settings, patch }) => (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="swap-element" className="mono-meta">
              Change this
            </label>
            <input
              id="swap-element"
              value={settings.element}
              onChange={(e) => patch({ element: e.target.value })}
              placeholder="the beige sofa"
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="swap-replacement" className="mono-meta">
              Into this
            </label>
            <input
              id="swap-replacement"
              value={settings.replacement}
              onChange={(e) => patch({ replacement: e.target.value })}
              placeholder="a dark green velvet sofa of the same size"
              className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
            />
          </div>
          {/* There is no mask here — the target is identified in language, so how
              precisely it is named is what decides whether the edit lands. */}
          <p className="text-label text-graphite">
            Name the element as specifically as you can. “the pendant over the island” beats “the light”.
          </p>
        </div>
      )}
    </GenerationScreen>
  );
}
