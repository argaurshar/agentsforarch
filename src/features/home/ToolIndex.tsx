import { ArrowRight, Layers, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { CATEGORIES } from '../registry';
import type { FeatureDef } from '../registry';
import { INPUT_KIND_LABEL } from '../registry/keys';
import { useProjectStore } from '../../store/useProjectStore';

/**
 * Every tool there is, grouped by the stage of the job it belongs to.
 *
 * This replaced a dashboard whose nav row promised "Every tool, with full
 * controls" and delivered FOUR of thirty: it was a pipeline map of the tools
 * that happened to declare a `stage`, plus a getting-started card and a recent
 * outputs strip. All three of those jobs are now done better somewhere else —
 * the front door is the way in, the chain row tells the pipeline story from what
 * each tool actually produces, and the Gallery holds the outputs — so what was
 * left was a destination that lied about its own contents.
 *
 * Derived from `CATEGORIES`, which is itself derived from what tools declare.
 * A tool appears here by existing, and `registryLint` fails the build if any
 * tool does not.
 */
export function ToolIndex() {
  const setTab = useProjectStore((s) => s.setTab);
  const total = CATEGORIES.reduce((n, c) => n + c.features.length, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-ink">All {total} tools</h1>
          <p className="mt-2 max-w-xl text-body text-mist">
            The full controls, the prompt and the batch runs live here. If you just have an image and want to see what it
            can become, start at the front door instead.
          </p>
        </div>
        <Button variant="primary" icon={<Sparkles size={16} strokeWidth={1.75} />} onClick={() => setTab('studio')}>
          Drop an image instead
        </Button>
      </div>

      {CATEGORIES.map((category) => (
        <section key={category.key} className="flex flex-col gap-3" data-index-category={category.key}>
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline pb-2">
            <div className="flex items-baseline gap-3">
              <h2 className="font-display text-heading text-ink">{category.label}</h2>
              <span className="font-mono text-caption text-mist">{category.features.length}</span>
            </div>
            {/* The one thing a category screen does that nothing else does: run
                several tools on one image. Worth a direct link, because it is
                otherwise invisible from here. */}
            <button
              type="button"
              data-index-batch={category.key}
              onClick={() => setTab(category.tab)}
              className="flex items-center gap-1.5 rounded-control text-caption text-ochre-deep underline decoration-ochre/40 underline-offset-2 transition-colors hover:decoration-ochre-deep"
            >
              <Layers size={12} strokeWidth={1.75} />
              Run several of these on one image
            </button>
          </div>
          <p className="text-caption text-mist">{category.blurb}</p>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {category.features.map((def) => (
              <ToolRow key={def.key} def={def} onOpen={() => setTab(def.key)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ToolRow({ def, onOpen }: { def: FeatureDef; onOpen: () => void }) {
  const Icon = def.icon;
  // What it reads, in the user's words. A tool with no input kinds takes no
  // image at all, and saying "Typed, no image" is more use than saying nothing.
  const takes =
    def.inputKind.length === 0
      ? 'Typed, no image'
      : def.inputKind.map((k) => INPUT_KIND_LABEL[k]).join(' · ');

  return (
    <button
      type="button"
      data-index-tool={def.key}
      onClick={onOpen}
      className="group flex items-start gap-3 rounded-card border border-hairline bg-paper p-4 text-left transition-all hover:border-ochre/60 hover:shadow-card"
    >
      <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-mist" />
      <span className="min-w-0 flex-1">
        <span className="block text-label font-medium text-ink">{def.name}</span>
        <span className="mt-0.5 block text-caption text-mist">{def.blurb}</span>
        <span className="mt-1.5 block font-mono text-caption text-mist/80">{takes}</span>
      </span>
      <ArrowRight
        size={14}
        strokeWidth={1.75}
        className="mt-1 shrink-0 text-mist opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
      />
    </button>
  );
}
