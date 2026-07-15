import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
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
              className={`flex items-center gap-3 border p-2 transition-colors ${
                active ? 'border-ochre bg-drafting' : 'border-hairline bg-paper hover:bg-drafting'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(slide.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-ochre"
              >
                <span className="mono-meta w-6 shrink-0 text-center text-mist">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="h-10 w-14 shrink-0 overflow-hidden border border-hairline bg-drafting">
                  {firstImage ? (
                    <img src={firstImage.url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-ink">{slide.title || 'Untitled slide'}</span>
                  <span className="mono-meta text-mist">
                    {LAYOUT_LABEL[slide.layout]} · {slide.imageIds.length} img
                  </span>
                </span>
              </button>

              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => onMove(slide.id, 'up')}
                  disabled={index === 0}
                  className="p-1 text-graphite hover:text-ochre disabled:opacity-30 focus-visible:outline-ochre"
                  aria-label="Move slide up"
                >
                  <ChevronUp size={15} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(slide.id, 'down')}
                  disabled={index === slides.length - 1}
                  className="p-1 text-graphite hover:text-ochre disabled:opacity-30 focus-visible:outline-ochre"
                  aria-label="Move slide down"
                >
                  <ChevronDown size={15} strokeWidth={1.75} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onDelete(slide.id)}
                className="shrink-0 p-1.5 text-graphite hover:text-ochre focus-visible:outline-ochre"
                aria-label="Delete slide"
              >
                <Trash2 size={15} strokeWidth={1.75} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
