import { ArrowRight, Download, Sparkles, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { downloadDataURL, slugify } from '../../lib/images';
import type { FeatureKind, GeneratedImage } from '../../types';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import type { SendTarget } from './OutputGrid';

interface OutputCardProps {
  image: GeneratedImage;
  onDelete?: (imageId: string) => void;
  onRefine?: (image: GeneratedImage) => void;
  sendTargets?: SendTarget[];
  onSend?: (target: FeatureKind, image: GeneratedImage) => void;
  /** 'full' shows the image at input size (single result); 'grid' is the compact card. */
  size?: 'grid' | 'full';
  /** Open this image in the full-screen lightbox viewer. */
  onView?: () => void;
}

const TARGET_LABEL: Record<string, string> = { elevation: 'Elevation', axonometric: 'Axonometric', render: 'Render' };

export function OutputCard({
  image,
  onDelete,
  onRefine,
  sendTargets,
  onSend,
  size = 'grid',
  onView,
}: OutputCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <figure className="group flex flex-col overflow-hidden rounded-card border border-hairline bg-paper shadow-card transition-all hover:-translate-y-0.5 hover:border-ochre/50 hover:shadow-card-lg">
      <button
        type="button"
        onClick={onView}
        disabled={!onView}
        className="overflow-hidden border-b border-hairline bg-drafting"
        title={onView ? 'View full screen' : undefined}
        aria-label={onView ? `View ${image.label} full screen` : undefined}
      >
        <img
          src={image.url}
          alt={image.label}
          className={`${
            size === 'full' ? 'max-h-72' : 'max-h-64'
          } w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]`}
        />
      </button>
      <figcaption className="flex flex-col gap-3 px-4 py-4">
        <span className="truncate text-label text-graphite" title={image.label}>
          {image.label}
        </span>
        {/* Two groups: the decision the card is asking for (refine) stays
            visible; the housekeeping actions only surface on hover or keyboard
            focus, so a grid of results no longer reads as a wall of buttons. */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {onRefine ? (
              <IconButton
                icon={<Sparkles size={16} strokeWidth={1.75} />}
                label="Refine this image"
                onClick={() => onRefine(image)}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {sendTargets && onSend
              ? sendTargets.map((t) => (
                  <Button
                    key={t.target}
                    variant="secondary"
                    size="sm"
                    icon={<ArrowRight size={14} strokeWidth={1.75} />}
                    onClick={() => onSend(t.target, image)}
                    title={t.label}
                  >
                    {TARGET_LABEL[t.target] ?? t.target}
                  </Button>
                ))
              : null}
            <IconButton
              icon={<Download size={16} strokeWidth={1.75} />}
              label={`Download ${image.label}`}
              title="Download"
              onClick={() => downloadDataURL(image.url, `${slugify(image.label)}.jpg`)}
            />
            {onDelete ? (
              confirmDelete ? (
                <span className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      onDelete(image.id);
                      setConfirmDelete(false);
                    }}
                  >
                    Delete
                  </Button>
                  <IconButton
                    icon={<X size={16} strokeWidth={1.75} />}
                    label="Cancel delete"
                    title="Cancel"
                    onClick={() => setConfirmDelete(false)}
                  />
                </span>
              ) : (
                <IconButton
                  icon={<Trash2 size={16} strokeWidth={1.75} />}
                  label={`Delete ${image.label}`}
                  title="Delete this image"
                  tone="danger"
                  onClick={() => setConfirmDelete(true)}
                />
              )
            ) : null}
          </div>
        </div>
      </figcaption>
    </figure>
  );
}
