import { RefreshCw, Square, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Button } from '../ui/Button';
import type { MarkerRect } from '../../store/generation';

/**
 * Drag a red box over the input to say "this bit".
 *
 * Several workflows in the guide are written around a red rectangle — "annotate
 * the area marked in red", "the marked zone becomes the entrance" — because
 * language alone cannot point. There is no mask channel in these models; the box
 * IS the pointer, and it has to be in the pixels.
 *
 * The rectangle is stored as fractions of the image, not pixels, so it stays put
 * whatever this element is scaled to and survives the resize on the way out. It
 * is burned in only at request time (see `burnMarker`), so the stored input is
 * never touched and the mark can be redrawn freely.
 */
export function MarkerCanvas({
  src,
  value,
  onChange,
  onReplaceImage,
  disabled,
}: {
  src: string;
  value: MarkerRect | null;
  onChange: (rect: MarkerRect | null) => void;
  /** Swap the image out. This view REPLACES the dropzone once there is an
   *  image — showing both meant the same picture twice on one card — so the
   *  way back to the dropzone has to live here. */
  onReplaceImage: () => void;
  disabled?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  // The drag's anchor, in fractions. Held in a ref so a re-render mid-drag
  // cannot lose it.
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const pointToFraction = useCallback((e: ReactPointerEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
    };
  }, []);

  const rectFrom = (a: { x: number; y: number }, b: { x: number; y: number }): MarkerRect => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  });

  const onPointerDown = (e: ReactPointerEvent) => {
    if (disabled) return;
    const p = pointToFraction(e);
    if (!p) return;
    // Capture on the element, so a drag that leaves the image still tracks and
    // still ends — without this, releasing outside leaves it stuck in drag.
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = p;
    setDragging(true);
    onChange({ ...p, w: 0, h: 0 });
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging || !start.current) return;
    const p = pointToFraction(e);
    if (p) onChange(rectFrom(start.current, p));
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    start.current = null;
    // A tap is not a region. Anything under ~2% in either direction is discarded
    // rather than left as an invisible sliver that still burns a line in.
    if (value && (value.w < 0.02 || value.h < 0.02)) onChange(null);
  };

  const pct = (n: number) => `${n * 100}%`;

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={boxRef}
        data-marker-canvas
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative overflow-hidden rounded-field border border-hairline bg-drafting ${
          disabled ? 'cursor-not-allowed' : 'cursor-crosshair'
        } touch-none select-none`}
      >
        <img src={src} alt="" draggable={false} className="pointer-events-none block w-full" />
        {value ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute border-2 border-[#ff0000]"
            style={{ left: pct(value.x), top: pct(value.y), width: pct(value.w), height: pct(value.h) }}
          />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-caption text-mist">
          {value ? (
            'Drag again to re-draw the box.'
          ) : (
            <span className="flex items-center gap-1.5">
              <Square size={12} strokeWidth={1.75} className="shrink-0 text-[#ff0000]" />
              Drag on the image to mark an area — optional.
            </span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {value ? (
            <Button variant="ghost" size="sm" icon={<X size={14} strokeWidth={1.75} />} onClick={() => onChange(null)}>
              Clear mark
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} strokeWidth={1.75} />}
            onClick={onReplaceImage}
          >
            Replace image
          </Button>
        </div>
      </div>
    </div>
  );
}
