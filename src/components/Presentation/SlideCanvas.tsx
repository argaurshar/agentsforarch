import { LayoutGrid } from 'lucide-react';
import { useEffect, useState } from 'react';
import { renderSlidePage } from '../../lib/deckRender';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import type { Brand, GeneratedImage, Slide } from '../../types';

interface SlideCanvasProps {
  slide: Slide | null;
  imageMap: Map<string, GeneratedImage>;
  brand: Brand;
  projectName: string;
  /** 1-based position of this slide among the content slides. */
  slideNumber: number;
  /** Total content slides (the deck adds a cover and a closing page around them). */
  slideCount: number;
}

/**
 * Renders the selected slide through the SAME canvas renderer the PDF export
 * uses (src/lib/deckRender.ts), so what you see is exactly the page that ships —
 * editorial rail, serif number/title, figure labels, brand footer and all.
 */
export function SlideCanvas({ slide, imageMap, brand, projectName, slideNumber, slideCount }: SlideCanvasProps) {
  const [page, setPage] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!slide) {
      setPage(null);
      return;
    }
    let cancelled = false;
    setRendering(true);
    renderSlidePage({
      slide,
      imageMap,
      brand,
      projectName,
      page: slideNumber + 1, // after the cover
      pageCount: slideCount + 2, // cover + slides + closing
      slideNumber,
    })
      .then((url) => {
        if (!cancelled) setPage(url);
      })
      .catch(() => {
        if (!cancelled) setPage(null);
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slide, imageMap, brand, projectName, slideNumber, slideCount]);

  if (!slide) {
    // A single grid child stretches to both axes, so the shared EmptyState keeps
    // the canvas footprint (and the layout stable) while it has no page to show.
    return (
      <div className="grid" style={{ aspectRatio: '297 / 210' }}>
        <EmptyState
          icon={LayoutGrid}
          title="No slide selected"
          description="Add a slide from the images on the left, or pick one from the list."
        />
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-card border border-hairline bg-drafting shadow-card"
      style={{ aspectRatio: '297 / 210' }}
    >
      {page ? (
        <img src={page} alt={slide.title || `Slide ${slideNumber}`} className="h-full w-full object-contain" />
      ) : null}
      {rendering && !page ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size={20} className="text-ochre" />
        </div>
      ) : null}
    </div>
  );
}
