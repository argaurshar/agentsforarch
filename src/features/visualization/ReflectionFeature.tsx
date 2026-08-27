import { GenerationScreen } from '../../components/Generation/GenerationScreen';
import { ChipGroup } from '../../components/ui/ChipGroup';
import type { ReflectionMode } from '../../store/generation';

const MODE_OPTIONS: { value: ReflectionMode; label: string }[] = [
  { value: 'transparent', label: 'See through it' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'mirror', label: 'Mirror it' },
];

const MODE_HINT: Record<ReflectionMode, string> = {
  transparent: 'Interiors visible through the glass — the reading that makes a building look occupied.',
  balanced: 'Part interior, part sky, varying pane by pane with the angle. The most photographic.',
  mirror: 'The facade disappears into its surroundings. Strongest at a distance.',
};

export function ReflectionFeature() {
  return (
    <GenerationScreen feature="reflection">
      {({ settings, patch }) => (
        <>
          <div className="flex flex-col gap-2 p-5">
            <ChipGroup label="What the glass does" value={settings.mode} options={MODE_OPTIONS} onChange={(v) => patch({ mode: v })} />
            <p className="text-label text-graphite">{MODE_HINT[settings.mode]}</p>
          </div>
          {settings.mode !== 'transparent' ? (
            <div className="flex flex-col gap-2 p-5">
              <label htmlFor="reflect-what" className="mono-meta">
                What it reflects
              </label>
              <input
                id="reflect-what"
                value={settings.reflect}
                onChange={(e) => patch({ reflect: e.target.value })}
                placeholder="the plane trees opposite and a soft evening sky"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2.5 text-body text-graphite placeholder:text-mist"
              />
              <p className="text-caption text-mist">Optional — leave it blank and the existing surroundings are used.</p>
            </div>
          ) : null}
        </>
      )}
    </GenerationScreen>
  );
}
