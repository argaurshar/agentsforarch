import type { FeatureKind, GeneratedImage } from '../../types';
import { OutputCard } from './OutputCard';

export interface SendTarget {
  label: string;
  target: FeatureKind;
}

interface OutputGridProps {
  outputs: GeneratedImage[];
  loading: boolean;
  loadingCount: number;
  onAddToPresentation: (imageId: string) => void;
  addedIds: Set<string>;
  onDelete?: (imageId: string) => void;
  onRefine?: (image: GeneratedImage) => void;
  sendTargets?: SendTarget[];
  onSend?: (target: FeatureKind, image: GeneratedImage) => void;
}

function SkeletonCard({ tall = false }: { tall?: boolean }) {
  return (
    <div className="flex flex-col border border-hairline bg-paper">
      <div className={`${tall ? 'h-72' : 'h-56'} animate-pulse bg-drafting`} />
      <div className="flex items-center justify-between px-3 py-3">
        <div className="h-3 w-24 animate-pulse bg-drafting" />
        <div className="h-6 w-14 animate-pulse bg-drafting" />
      </div>
    </div>
  );
}

export function OutputGrid({
  outputs,
  loading,
  loadingCount,
  onAddToPresentation,
  addedIds,
  onDelete,
  onRefine,
  sendTargets,
  onSend,
}: OutputGridProps) {
  if (loading) {
    const count = Math.max(1, loadingCount);
    return (
      <div className={count === 1 ? '' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} tall={count === 1} />
        ))}
      </div>
    );
  }

  if (outputs.length === 0) {
    return null;
  }

  // A single result renders full-width at the input's size (architects asked for
  // parity with the uploaded plan); two or more fall back to the compact grid.
  const single = outputs.length === 1;

  return (
    <div className={single ? '' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'}>
      {outputs.map((image) => (
        <OutputCard
          key={image.id}
          image={image}
          size={single ? 'full' : 'grid'}
          onAddToPresentation={onAddToPresentation}
          added={addedIds.has(image.id)}
          onDelete={onDelete}
          onRefine={onRefine}
          sendTargets={sendTargets}
          onSend={onSend}
        />
      ))}
    </div>
  );
}
