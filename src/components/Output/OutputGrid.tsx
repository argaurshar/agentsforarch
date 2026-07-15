import type { GeneratedImage } from '../../types';
import { OutputCard } from './OutputCard';

interface OutputGridProps {
  outputs: GeneratedImage[];
  loading: boolean;
  loadingCount: number;
  onAddToPresentation: (imageId: string) => void;
  addedIds: Set<string>;
}

function SkeletonCard() {
  return (
    <div className="flex flex-col border border-hairline bg-paper">
      <div className="h-56 animate-pulse bg-drafting" />
      <div className="flex items-center justify-between px-3 py-3">
        <div className="h-3 w-24 animate-pulse bg-drafting" />
        <div className="h-6 w-14 animate-pulse bg-drafting" />
      </div>
    </div>
  );
}

export function OutputGrid({ outputs, loading, loadingCount, onAddToPresentation, addedIds }: OutputGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: Math.max(1, loadingCount) }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (outputs.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {outputs.map((image) => (
        <OutputCard
          key={image.id}
          image={image}
          onAddToPresentation={onAddToPresentation}
          added={addedIds.has(image.id)}
        />
      ))}
    </div>
  );
}
