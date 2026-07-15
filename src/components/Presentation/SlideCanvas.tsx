import { ImageOff } from 'lucide-react';
import type { GeneratedImage, Slide, SlideLayout } from '../../types';

interface SlideCanvasProps {
  slide: Slide | null;
  imageMap: Map<string, GeneratedImage>;
}

const CAPACITY: Record<SlideLayout, number> = {
  full: 1,
  'two-up': 2,
  'four-grid': 4,
};

const GRID_CLASS: Record<SlideLayout, string> = {
  full: 'grid-cols-1 grid-rows-1',
  'two-up': 'grid-cols-2 grid-rows-1',
  'four-grid': 'grid-cols-2 grid-rows-2',
};

/** Renders a slide at A4-landscape proportions, mirroring the PDF export. */
export function SlideCanvas({ slide, imageMap }: SlideCanvasProps) {
  if (!slide) {
    return (
      <div
        className="flex items-center justify-center border border-hairline bg-paper"
        style={{ aspectRatio: '297 / 210' }}
      >
        <p className="max-w-xs text-center text-sm text-mist">
          No slide selected. Add a slide from the images on the left, or pick one from the list.
        </p>
      </div>
    );
  }

  const capacity = CAPACITY[slide.layout];
  const cells = Array.from({ length: capacity }, (_, i) => slide.imageIds[i] ?? null);

  return (
    <div
      className="flex flex-col gap-4 border border-hairline bg-bone p-8"
      style={{ aspectRatio: '297 / 210' }}
    >
      {slide.title ? (
        <h2 className="font-serif text-2xl font-light text-ink">{slide.title}</h2>
      ) : null}

      <div className={`grid min-h-0 flex-1 gap-4 ${GRID_CLASS[slide.layout]}`}>
        {cells.map((imageId, i) => {
          const image = imageId ? imageMap.get(imageId) : null;
          return (
            <div key={i} className="flex items-center justify-center overflow-hidden border border-hairline bg-drafting">
              {image ? (
                <img src={image.url} alt={image.label} className="h-full w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-mist">
                  <ImageOff size={20} strokeWidth={1} />
                  <span className="mono-meta text-mist">Empty</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-end justify-between gap-4 border-t border-hairline pt-3">
        <p className="max-w-xl font-mono text-[0.7rem] uppercase tracking-[0.14em] text-graphite">
          {slide.caption ?? ''}
        </p>
        <p className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ochre">
          AND Studio · Concept Presentation
        </p>
      </div>
    </div>
  );
}
