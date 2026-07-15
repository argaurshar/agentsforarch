import { MoveHorizontal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadImage } from '../../lib/images';

interface ImageCompareProps {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Before/after comparison with a draggable vertical divider (spec §8.01).
 * Fidelity to the sketch is a signature moment for architects, so this is
 * pointer- and keyboard-accessible.
 */
export function ImageCompare({ before, after, beforeLabel = 'Input', afterLabel = 'Output' }: ImageCompareProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(before)
      .then((img) => {
        if (!cancelled && img.width > 0 && img.height > 0) {
          setAspect(img.width / img.height);
        }
      })
      .catch(() => {
        /* fall back to default height */
      });
    return () => {
      cancelled = true;
    };
  }, [before]);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPos(clamp(((clientX - rect.left) / rect.width) * 100, 0, 100));
  }, []);

  useEffect(() => {
    if (!dragging) return undefined;
    const onMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, updateFromClientX]);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden border border-hairline bg-drafting"
      style={aspect ? { aspectRatio: String(aspect) } : { height: 420 }}
    >
      <img src={before} alt={beforeLabel} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      {/* Reveal the AFTER image on the right of the divider so it sits under its
          right-corner label; BEFORE stays on the left under its label. */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <img src={after} alt={afterLabel} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      </div>

      {/* Corner labels */}
      <span className="absolute left-2 top-2 bg-ink/80 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-bone">
        {beforeLabel}
      </span>
      <span className="absolute right-2 top-2 bg-ochre px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-bone">
        {afterLabel}
      </span>

      {/* Divider + handle */}
      <div className="absolute bottom-0 top-0 w-px bg-ochre" style={{ left: `${pos}%` }}>
        <button
          type="button"
          role="slider"
          aria-label="Comparison divider"
          aria-valuenow={Math.round(pos)}
          aria-valuemin={0}
          aria-valuemax={100}
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setPos((p) => clamp(p - 2, 0, 100));
            if (e.key === 'ArrowRight') setPos((p) => clamp(p + 2, 0, 100));
          }}
          className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center border border-ochre bg-bone text-ochre focus-visible:outline-ochre"
        >
          <MoveHorizontal size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
