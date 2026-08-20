import type { ReactNode } from 'react';
import { useState } from 'react';
import type { FeatureKind, GeneratedImage } from '../../types';
import { Lightbox } from './Lightbox';
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
  /**
   * Rendered instead of the grid when there is nothing to show. Callers that
   * already gate on `outputs.length` keep the previous behaviour (nothing).
   */
  empty?: ReactNode;
}

function SkeletonCard({ tall = false }: { tall?: boolean }) {
  // Mirrors the real card's geometry so nothing jumps when results land, and the
  // bars sit on bg-hairline — bg-drafting on bg-paper is a ~2% step, so the
  // pulse was effectively invisible.
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-hairline bg-paper shadow-card">
      <div className={`${tall ? 'h-72' : 'h-64'} animate-pulse rounded-t-card bg-hairline`} />
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-hairline" />
        <div className="flex shrink-0 items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-7 animate-pulse rounded-control bg-hairline" />
          ))}
        </div>
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
  empty,
}: OutputGridProps) {
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  if (loading) {
    const count = Math.max(1, loadingCount);
    return (
      <div className={count === 1 ? '' : 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} tall={count === 1} />
        ))}
      </div>
    );
  }

  if (outputs.length === 0) {
    return <>{empty ?? null}</>;
  }

  // A single result renders full-width at the input's size (architects asked for
  // parity with the uploaded plan); two or more fall back to the compact grid.
  const single = outputs.length === 1;

  return (
    <>
      <div className={single ? '' : 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'}>
        {outputs.map((image, i) => (
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
            onView={() => setViewIndex(i)}
          />
        ))}
      </div>
      {viewIndex !== null ? (
        <Lightbox images={outputs} index={Math.min(viewIndex, outputs.length - 1)} onClose={() => setViewIndex(null)} onIndex={setViewIndex} />
      ) : null}
    </>
  );
}
