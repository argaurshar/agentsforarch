import { Check, Download, Plus } from 'lucide-react';
import { downloadDataURL, slugify } from '../../lib/images';
import type { GeneratedImage } from '../../types';

interface OutputCardProps {
  image: GeneratedImage;
  onAddToPresentation: (imageId: string) => void;
  added: boolean;
}

export function OutputCard({ image, onAddToPresentation, added }: OutputCardProps) {
  return (
    <figure className="group flex flex-col border border-hairline bg-paper transition-colors hover:border-ochre/50">
      <div className="overflow-hidden border-b border-hairline bg-drafting">
        <img
          src={image.url}
          alt={image.label}
          className="max-h-64 w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <figcaption className="flex items-center justify-between gap-2 px-3 py-3">
        <span className="mono-meta truncate" title={image.label}>
          {image.label}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => downloadDataURL(image.url, `${slugify(image.label)}.jpg`)}
            className="flex items-center justify-center border border-hairline bg-paper p-1.5 text-graphite hover:bg-drafting focus-visible:outline-ochre"
            title="Download"
            aria-label={`Download ${image.label}`}
          >
            <Download size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => onAddToPresentation(image.id)}
            disabled={added}
            className={`flex items-center justify-center border p-1.5 focus-visible:outline-ochre ${
              added
                ? 'cursor-default border-hairline bg-drafting text-mist'
                : 'border-ochre bg-ochre text-bone hover:bg-ochre-deep'
            }`}
            title={added ? 'Already in presentation' : 'Add to presentation'}
            aria-label={added ? 'Already in presentation' : `Add ${image.label} to presentation`}
          >
            {added ? <Check size={15} strokeWidth={2} /> : <Plus size={15} strokeWidth={1.75} />}
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
