import { ArrowRight, Box, Building2, Check, FileImage, Images, KeyRound, LayoutTemplate, Palette, PencilRuler, Sofa, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { loadDemoPlan } from '../../lib/demoPlan';
import { useProjectStore } from '../../store/useProjectStore';
import type { FeatureKind, GeneratedImage, TabKey } from '../../types';

interface StageDef {
  key: FeatureKind;
  index: string;
  name: string;
  what: string;
  icon: LucideIcon;
}

const STAGES: StageDef[] = [
  { key: 'render', index: '01', name: 'Isometric', what: 'Floor plan → 3D cutaway', icon: PencilRuler },
  { key: 'elevation', index: '02', name: 'Elevation', what: 'Sketch → styled elevation', icon: Building2 },
  { key: 'axonometric', index: '03', name: 'Axonometric', what: 'Elevation → 3D view', icon: Box },
  { key: 'interior', index: '04', name: 'Interior', what: 'Room photo → redesign', icon: Sofa },
];

interface ShortcutDef {
  key: TabKey;
  name: string;
  what: string;
  icon: LucideIcon;
}

const SHORTCUTS: ShortcutDef[] = [
  { key: 'moodboard', name: 'Mood board', what: 'Compose your outputs into a branded material board.', icon: Palette },
  {
    key: 'presentation',
    name: 'Concept presentation',
    what: 'Build an AI deck or a branded PDF from your outputs.',
    icon: LayoutTemplate,
  },
  { key: 'gallery', name: 'Gallery · save / load', what: 'Every output, plus whole-project export and import.', icon: Images },
];

/** One shortcut tile — the three used to be copy-pasted markup that had drifted apart. */
function ShortcutCard({ shortcut, onOpen }: { shortcut: ShortcutDef; onOpen: () => void }) {
  const Icon = shortcut.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex items-center gap-4 rounded-card border border-hairline bg-paper px-5 py-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-mist/40 hover:shadow-card-lg"
    >
      <Icon size={22} strokeWidth={1.75} className="shrink-0 text-mist" />
      <span className="flex-1">
        <span className="block font-display text-heading text-ink">{shortcut.name}</span>
        <span className="block text-body text-mist">{shortcut.what}</span>
      </span>
      <ArrowRight size={16} strokeWidth={1.75} className="shrink-0 text-mist transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function DashboardFeature() {
  const project = useProjectStore((s) => s.project);
  const engineReady = useProjectStore((s) => s.engineReady);
  const setTab = useProjectStore((s) => s.setTab);
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const tipsDismissed = useProjectStore((s) => s.tipsDismissed);
  const dismissTips = useProjectStore((s) => s.dismissTips);
  const [loadingSample, setLoadingSample] = useState(false);
  // Dismissal is persisted in the store and has no undo there, so the reopen
  // is local — otherwise the guidance is gone for good after one stray click.
  const [tipsReopened, setTipsReopened] = useState(false);

  // Per-stage counts + newest thumbnail, and the recent strip, from the assets.
  const { byFeature, recent, totalOutputs } = useMemo(() => {
    const byFeature = new Map<FeatureKind, { count: number; thumb: string | null }>();
    const all: { image: GeneratedImage; feature: FeatureKind; createdAt: number }[] = [];
    for (const asset of project.assets) {
      const entry = byFeature.get(asset.feature) ?? { count: 0, thumb: null };
      entry.count += asset.outputs.length;
      if (!entry.thumb && asset.outputs.length > 0) entry.thumb = asset.outputs[0].url;
      byFeature.set(asset.feature, entry);
      for (const image of asset.outputs) all.push({ image, feature: asset.feature, createdAt: asset.createdAt });
    }
    // newest first, prefer the latest assets' thumbs
    for (const asset of [...project.assets].sort((a, b) => b.createdAt - a.createdAt)) {
      const entry = byFeature.get(asset.feature);
      if (entry && asset.outputs.length > 0) entry.thumb = asset.outputs[0].url;
      break;
    }
    all.sort((a, b) => b.createdAt - a.createdAt);
    return { byFeature, recent: all.slice(0, 6), totalOutputs: all.length };
  }, [project.assets]);

  const hasAnyInput = totalOutputs > 0;
  const showTips = tipsReopened || (!tipsDismissed && !(engineReady && hasAnyInput));

  const trySample = async () => {
    setLoadingSample(true);
    try {
      const url = await loadDemoPlan();
      setFeatureInput('render', url);
      setTab('render');
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div>
      <SectionHeader
        index="00"
        eyebrow="Project Dashboard"
        title={project.name || 'Untitled Project'}
        description="Your project at a glance — jump into any stage of the pipeline, pick up where you left off, or open the presentation and gallery."
      />

      {/* Getting started — shown until the key is set and something exists. */}
      {showTips ? (
        <div className="mb-8 rounded-card border border-hairline bg-paper p-6 shadow-card">
          <div className="mb-4 flex items-start justify-between gap-3">
            <p className="section-heading">Getting started · three steps</p>
            <IconButton
              icon={<X size={16} strokeWidth={1.75} />}
              label="Dismiss getting started"
              onClick={() => {
                setTipsReopened(false);
                dismissTips();
              }}
            />
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            <li className="flex items-start gap-3">
              {/* All three markers share one 32px round geometry — the first used
                  to be a 28px square and visibly broke the row's baseline. */}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  engineReady ? 'border-ochre-deep bg-ochre-deep text-white' : 'border-hairline bg-paper text-graphite'
                }`}
              >
                {engineReady ? <Check size={14} strokeWidth={2} /> : <KeyRound size={14} strokeWidth={1.75} />}
              </span>
              <div>
                <p className="text-body font-medium text-ink">Connect your API key</p>
                <p className="mt-0.5 text-body text-mist">Settings (top right) — the key stays in your browser.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-paper text-graphite">
                <FileImage size={14} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-body font-medium text-ink">Add a floor plan</p>
                <p className="mt-0.5 text-body text-mist">Upload your own, or</p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2.5"
                  onClick={() => void trySample()}
                  loading={loadingSample}
                >
                  Try the sample plan
                </Button>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-paper text-graphite">
                <Sparkles size={14} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-body font-medium text-ink">Generate &amp; refine</p>
                <p className="mt-0.5 text-body text-mist">
                  One click per stage — refine with quick chips, no prompts to write.
                </p>
              </div>
            </li>
          </ol>
        </div>
      ) : tipsDismissed ? (
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => setTipsReopened(true)}>
            Show tips
          </Button>
        </div>
      ) : null}

      {/* Pipeline map */}
      <p className="section-heading mb-3">Pipeline</p>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage) => {
          const info = byFeature.get(stage.key);
          const Icon = stage.icon;
          const count = info?.count ?? 0;
          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => setTab(stage.key)}
              className="group flex flex-col overflow-hidden rounded-card border border-hairline bg-paper text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-mist/40 hover:shadow-card-lg"
            >
              <div className="flex h-36 items-center justify-center overflow-hidden border-b border-hairline bg-drafting">
                {info?.thumb ? (
                  <img src={info.thumb} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <Icon size={30} strokeWidth={1.75} className="text-mist-faint" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 px-4 py-3">
                <span className="flex items-center gap-2">
                  {/* Decorative numbering stays neutral — the accent means action. */}
                  <span className="text-caption font-medium text-mist">{stage.index}</span>
                  <span className="font-display text-heading text-ink">{stage.name}</span>
                  <span className="ml-auto rounded-full bg-drafting px-2 py-0.5 text-caption font-medium text-graphite">
                    {count > 0 ? `${count} image${count === 1 ? '' : 's'}` : 'Not started'}
                  </span>
                </span>
                <span className="text-body text-mist">{stage.what}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent outputs — or, on a brand-new project, the one thing to do next. */}
      {recent.length > 0 ? (
        <div className="mb-8">
          <p className="section-heading mb-3">Recent outputs</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {recent.map(({ image, feature }) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setTab(feature)}
                title={image.label}
                className="group aspect-square overflow-hidden rounded-field border border-hairline bg-drafting transition-all hover:border-mist/40 hover:shadow-card"
              >
                <img src={image.url} alt={image.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              </button>
            ))}
          </div>
        </div>
      ) : totalOutputs === 0 ? (
        <div className="mb-8">
          <EmptyState
            icon={Images}
            title="No outputs yet"
            description="Nothing has been generated in this project. Start with a floor plan on the Isometric tab — every later stage feeds off it."
            action={
              <Button variant="primary" icon={<ArrowRight size={16} strokeWidth={1.75} />} onClick={() => setTab('render')}>
                Start with a floor plan
              </Button>
            }
          />
        </div>
      ) : null}

      {/* Shortcuts */}
      <div className="grid gap-4 sm:grid-cols-3">
        {SHORTCUTS.map((shortcut) => (
          <ShortcutCard key={shortcut.key} shortcut={shortcut} onOpen={() => setTab(shortcut.key)} />
        ))}
      </div>
    </div>
  );
}
