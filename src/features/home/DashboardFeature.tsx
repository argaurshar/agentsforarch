import { ArrowRight, Box, Building2, Check, FileImage, Images, KeyRound, LayoutTemplate, Palette, PencilRuler, Sofa, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { loadDemoPlan } from '../../lib/demoPlan';
import { useProjectStore } from '../../store/useProjectStore';
import type { FeatureKind, GeneratedImage } from '../../types';

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

export function DashboardFeature() {
  const project = useProjectStore((s) => s.project);
  const engineReady = useProjectStore((s) => s.engineReady);
  const setTab = useProjectStore((s) => s.setTab);
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const tipsDismissed = useProjectStore((s) => s.tipsDismissed);
  const dismissTips = useProjectStore((s) => s.dismissTips);
  const [loadingSample, setLoadingSample] = useState(false);

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
  const showTips = !tipsDismissed && !(engineReady && hasAnyInput);

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
        <div className="mb-8 border border-ochre bg-paper p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <p className="mono-meta text-ochre">Getting started · three steps</p>
            <button
              type="button"
              onClick={dismissTips}
              className="text-mist hover:text-graphite focus-visible:outline-ochre"
              aria-label="Dismiss getting started"
            >
              <X size={15} strokeWidth={1.75} />
            </button>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            <li className="flex items-start gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center border ${
                  engineReady ? 'border-ochre bg-ochre text-bone' : 'border-hairline text-graphite'
                }`}
              >
                {engineReady ? <Check size={14} strokeWidth={2.5} /> : <KeyRound size={13} strokeWidth={1.75} />}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">Connect your Gemini key</p>
                <p className="mt-0.5 text-xs leading-relaxed text-mist">
                  Settings (top right) — the key stays in your browser.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-hairline text-graphite">
                <FileImage size={13} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">Add a floor plan</p>
                <p className="mt-0.5 text-xs leading-relaxed text-mist">Upload your own, or</p>
                <Button size="sm" variant="secondary" onClick={() => void trySample()} loading={loadingSample}>
                  Try the sample plan
                </Button>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-hairline text-graphite">
                <Sparkles size={13} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">Generate &amp; refine</p>
                <p className="mt-0.5 text-xs leading-relaxed text-mist">
                  One click per stage — refine with quick chips, no prompts to write.
                </p>
              </div>
            </li>
          </ol>
        </div>
      ) : null}

      {/* Pipeline map */}
      <p className="mono-meta mb-3">Pipeline</p>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage) => {
          const info = byFeature.get(stage.key);
          const Icon = stage.icon;
          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => setTab(stage.key)}
              className="group flex flex-col border border-hairline bg-paper text-left transition-colors hover:border-ochre/60 focus-visible:outline-ochre"
            >
              <div className="flex h-36 items-center justify-center overflow-hidden border-b border-hairline bg-drafting">
                {info?.thumb ? (
                  <img src={info.thumb} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <Icon size={30} strokeWidth={1} className="text-mist" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 px-4 py-3">
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-[0.65rem] text-ochre">{stage.index}</span>
                  <span className="text-sm font-medium text-ink">{stage.name}</span>
                  <span className="ml-auto font-mono text-[0.65rem] text-mist">
                    {info?.count ? `${info.count} img${info.count === 1 ? '' : 's'}` : '—'}
                  </span>
                </span>
                <span className="text-xs text-mist">{stage.what}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent outputs */}
      {recent.length > 0 ? (
        <div className="mb-8">
          <p className="mono-meta mb-3">Recent outputs</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {recent.map(({ image, feature }) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setTab(feature)}
                title={image.label}
                className="group aspect-square overflow-hidden border border-hairline bg-drafting transition-colors hover:border-ochre/60 focus-visible:outline-ochre"
              >
                <img src={image.url} alt={image.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Shortcuts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setTab('moodboard')}
          className="group flex items-center gap-4 border border-hairline bg-paper px-5 py-4 text-left transition-colors hover:border-ochre/60 focus-visible:outline-ochre"
        >
          <Palette size={22} strokeWidth={1.25} className="text-ochre" />
          <span className="flex-1">
            <span className="block text-sm font-medium text-ink">Mood Board</span>
            <span className="block text-xs text-mist">Compose your outputs into a branded material board.</span>
          </span>
          <ArrowRight size={16} strokeWidth={1.75} className="text-mist transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          type="button"
          onClick={() => setTab('presentation')}
          className="group flex items-center gap-4 border border-hairline bg-paper px-5 py-4 text-left transition-colors hover:border-ochre/60 focus-visible:outline-ochre"
        >
          <LayoutTemplate size={22} strokeWidth={1.25} className="text-ochre" />
          <span className="flex-1">
            <span className="block text-sm font-medium text-ink">Concept Presentation</span>
            <span className="block text-xs text-mist">Build an AI deck or a branded PDF from your outputs.</span>
          </span>
          <ArrowRight size={16} strokeWidth={1.75} className="text-mist transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          type="button"
          onClick={() => setTab('gallery')}
          className="group flex items-center gap-4 border border-hairline bg-paper px-5 py-4 text-left transition-colors hover:border-ochre/60 focus-visible:outline-ochre"
        >
          <Images size={22} strokeWidth={1.25} className="text-ochre" />
          <span className="flex-1">
            <span className="block text-sm font-medium text-ink">Gallery · Save / Load</span>
            <span className="block text-xs text-mist">Every output, plus whole-project export and import.</span>
          </span>
          <ArrowRight size={16} strokeWidth={1.75} className="text-mist transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
