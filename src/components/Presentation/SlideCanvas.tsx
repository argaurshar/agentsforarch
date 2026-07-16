import { ImageOff } from 'lucide-react';
import type { Brand, GeneratedImage, Slide, SlideLayout } from '../../types';

interface SlideCanvasProps {
  slide: Slide | null;
  imageMap: Map<string, GeneratedImage>;
  brand: Brand;
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

// Neutral tints that read on any brand background.
const CELL_BG = 'rgba(15,23,41,0.04)';
const CELL_BORDER = 'rgba(15,23,41,0.12)';

/** Renders a slide at A4-landscape proportions in the project's brand identity. */
export function SlideCanvas({ slide, imageMap, brand }: SlideCanvasProps) {
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
  const footerName = (brand.name || 'AND Studio').toUpperCase();

  return (
    <div
      className="flex flex-col gap-4 border border-hairline p-8"
      style={{ aspectRatio: '297 / 210', backgroundColor: brand.background }}
    >
      {slide.title ? (
        <h2 className="text-2xl font-light leading-tight" style={{ fontFamily: brand.headingFont, color: brand.primary }}>
          {slide.title}
        </h2>
      ) : null}

      <div className={`grid min-h-0 flex-1 gap-4 ${GRID_CLASS[slide.layout]}`}>
        {cells.map((imageId, i) => {
          const image = imageId ? imageMap.get(imageId) : null;
          return (
            <div
              key={i}
              className="flex items-center justify-center overflow-hidden border"
              style={{ backgroundColor: CELL_BG, borderColor: CELL_BORDER }}
            >
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

      <div className="flex items-end justify-between gap-4 border-t pt-3" style={{ borderColor: CELL_BORDER }}>
        <p className="max-w-xl text-xs leading-snug" style={{ fontFamily: brand.bodyFont, color: brand.text }}>
          {slide.caption ?? ''}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {brand.logo ? <img src={brand.logo} alt="" className="h-5 w-auto max-w-[120px] object-contain" /> : null}
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em]" style={{ color: brand.accent }}>
            {footerName} · Concept Presentation
          </p>
        </div>
      </div>
    </div>
  );
}
