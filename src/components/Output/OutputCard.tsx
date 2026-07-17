import { ArrowRight, Check, Download, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { downloadDataURL, slugify } from '../../lib/images';
import type { FeatureKind, GeneratedImage } from '../../types';
import type { SendTarget } from './OutputGrid';

interface OutputCardProps {
  image: GeneratedImage;
  onAddToPresentation: (imageId: string) => void;
  added: boolean;
  onDelete?: (imageId: string) => void;
  onRefine?: (image: GeneratedImage) => void;
  sendTargets?: SendTarget[];
  onSend?: (target: FeatureKind, image: GeneratedImage) => void;
  /** 'full' shows the image at input size (single result); 'grid' is the compact card. */
  size?: 'grid' | 'full';
}

const ICON_BTN =
  'flex items-center justify-center border border-hairline bg-paper p-1.5 text-graphite hover:bg-drafting focus-visible:outline-ochre';

const SHORT_TARGET: Record<string, string> = { elevation: 'Elevation', axonometric: 'Axon.', render: 'Render' };

export function OutputCard({
  image,
  onAddToPresentation,
  added,
  onDelete,
  onRefine,
  sendTargets,
  onSend,
  size = 'grid',
}: OutputCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <figure className="group flex flex-col border border-hairline bg-paper transition-colors hover:border-ochre/50">
      <div className="overflow-hidden border-b border-hairline bg-drafting">
        <img
          src={image.url}
          alt={image.label}
          className={`${
            size === 'full' ? 'max-h-72' : 'max-h-64'
          } w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]`}
        />
      </div>
      <figcaption className="flex flex-col gap-2 px-3 py-3">
        <span className="mono-meta truncate" title={image.label}>
          {image.label}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {onRefine ? (
            <button type="button" onClick={() => onRefine(image)} className={ICON_BTN} title="Refine this image">
              <Sparkles size={15} strokeWidth={1.75} className="text-ochre" />
            </button>
          ) : null}
          {sendTargets && onSend
            ? sendTargets.map((t) => (
                <button
                  key={t.target}
                  type="button"
                  onClick={() => onSend(t.target, image)}
                  className={`${ICON_BTN} gap-1 px-2 font-mono text-[0.6rem] uppercase tracking-[0.12em]`}
                  title={t.label}
                >
                  <ArrowRight size={13} strokeWidth={1.75} /> {SHORT_TARGET[t.target] ?? t.target}
                </button>
              ))
            : null}
          <button
            type="button"
            onClick={() => downloadDataURL(image.url, `${slugify(image.label)}.jpg`)}
            className={ICON_BTN}
            title="Download"
            aria-label={`Download ${image.label}`}
          >
            <Download size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => onAddToPresentation(image.id)}
            disabled={added}
            className={
              added
                ? 'flex items-center justify-center border border-hairline bg-drafting p-1.5 text-mist'
                : 'flex items-center justify-center border border-ochre bg-ochre p-1.5 text-bone hover:bg-ochre-deep focus-visible:outline-ochre'
            }
            title={added ? 'Already in presentation' : 'Add to presentation'}
            aria-label={added ? 'Already in presentation' : `Add ${image.label} to presentation`}
          >
            {added ? <Check size={15} strokeWidth={2} /> : <Plus size={15} strokeWidth={1.75} />}
          </button>
          {onDelete ? (
            confirmDelete ? (
              <span className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(image.id);
                    setConfirmDelete(false);
                  }}
                  className="border border-ochre bg-paper px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ochre hover:bg-drafting focus-visible:outline-ochre"
                >
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className={ICON_BTN} title="Cancel" aria-label="Cancel delete">
                  <X size={14} strokeWidth={1.75} />
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className={`${ICON_BTN} ml-auto`}
                title="Delete this image"
                aria-label={`Delete ${image.label}`}
              >
                <Trash2 size={15} strokeWidth={1.75} />
              </button>
            )
          ) : null}
        </div>
      </figcaption>
    </figure>
  );
}
