import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import type { GeneratedImage, Slide } from '../../types';

interface SlideListProps {
  slides: Slide[]; // already ordered
  selectedId: string | null;
  imageMap: Map<string, GeneratedImage>;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
}

const LAYOUT_LABEL: Record<Slide['layout'], string> = {
  full: 'Full',
  'two-up': 'Two-up',
  'four-grid': 'Four-grid',
};

export function SlideList({ slides, selectedId, imageMap, onSelect, onMove, onDelete }: SlideListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {slides.map((slide, index) => {
        const active = slide.id === selectedId;
        const firstImage = slide.imageIds.map((id) => imageMap.get(id)).find(Boolean);
        return (
          <li key={slide.id}>
            <div
              className={`flex items-center gap-2.5 rounded-field border p-2.5 transition-all ${
                active
                  ? 'border-ochre/60 bg-ochre/5 ring-1 ring-ochre/20'
                  : 'border-hairline bg-paper hover:border-mist/40 hover:bg-drafting'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(slide.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="mono-meta w-6 shrink-0 text-center text-mist">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="h-10 w-14 shrink-0 overflow-hidden rounded-control border border-hairline bg-drafting">
                  {firstImage ? (
                    <img src={firstImage.url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-body text-ink">{slide.title || 'Untitled slide'}</span>
                  <span className="mono-meta text-mist">
                    {LAYOUT_LABEL[slide.layout]} · {slide.imageIds.length} img
                  </span>
                </span>
              </button>

              <div className="flex shrink-0 flex-col">
                <IconButton
                  icon={<ChevronUp size={14} strokeWidth={1.75} />}
                  label="Move slide up"
                  onClick={() => onMove(slide.id, 'up')}
                  disabled={index === 0}
                  className="disabled:hover:bg-transparent"
                />
                <IconButton
                  icon={<ChevronDown size={14} strokeWidth={1.75} />}
                  label="Move slide down"
                  onClick={() => onMove(slide.id, 'down')}
                  disabled={index === slides.length - 1}
                  className="disabled:hover:bg-transparent"
                />
              </div>

              <IconButton
                icon={<Trash2 size={14} strokeWidth={1.75} />}
                label="Delete slide"
                tone="danger"
                onClick={() => onDelete(slide.id)}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
