import { ChevronLeft, ChevronRight, Crop, Download, Minus, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadDataURL, slugify } from '../../lib/images';
import { useDialog } from '../../lib/useDialog';
import type { GeneratedImage } from '../../types';
import { SocialExport } from './SocialExport';

interface LightboxProps {
  images: GeneratedImage[];
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/** Ghost control for the dark chrome — the light IconButton tones vanish here. */
const LIGHTBOX_BTN =
  'flex h-9 w-9 items-center justify-center rounded-control border border-white/15 bg-white/5 text-white/90 transition-colors hover:bg-white/15';

/**
 * Full-screen viewer for outputs: ←/→ navigation, zoom (buttons / double-click)
 * with drag-pan when zoomed, Escape to close (useDialog also traps focus).
 */
export function Lightbox({ images, index, onClose, onIndex }: LightboxProps) {
  const ref = useDialog<HTMLDivElement>({ open: true, onClose });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [social, setSocial] = useState(false);
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const image = images[index];
  const count = images.length;

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      onIndex((index + delta + count) % count);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
    [count, index, onIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (social) return; // the social dialog is on top — don't navigate behind it
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, social]);

  if (!image) return null;

  const setZoomClamped = (z: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    setZoom(next);
    if (next === 1) setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Image viewer — ${image.label}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-sm"
    >
      {/* Top bar — a soft scrim keeps the controls legible over pale images. */}
      <div className="relative flex items-center gap-3 bg-gradient-to-b from-black/40 to-transparent px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-label text-bone" title={image.label}>
          {image.label}
        </span>
        <span className="shrink-0 text-label text-bone/60">
          {index + 1} / {count}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* Zoom is a segmented trio; on touch, pinch covers it. */}
          <div className="hidden items-center overflow-hidden rounded-control border border-white/15 bg-white/5 sm:flex">
            <button
              type="button"
              onClick={() => setZoomClamped(zoom - 0.5)}
              className="flex h-9 w-9 items-center justify-center text-white/90 transition-colors hover:bg-white/15"
              aria-label="Zoom out"
            >
              <Minus size={16} strokeWidth={1.75} />
            </button>
            <span className="w-12 text-center text-caption tabular-nums text-bone/70">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomClamped(zoom + 0.5)}
              className="flex h-9 w-9 items-center justify-center text-white/90 transition-colors hover:bg-white/15"
              aria-label="Zoom in"
            >
              <Plus size={16} strokeWidth={1.75} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSocial(true)}
            className={LIGHTBOX_BTN}
            title="Crop for social"
            aria-label="Crop for social media"
          >
            <Crop size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => downloadDataURL(image.url, `${slugify(image.label)}.jpg`)}
            className={LIGHTBOX_BTN}
            title="Download"
            aria-label="Download image"
          >
            <Download size={16} strokeWidth={1.75} />
          </button>
          {/* Dismiss is never the accent — the accent means "primary action". */}
          <button type="button" onClick={onClose} className={LIGHTBOX_BTN} aria-label="Close viewer">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        className={`relative flex-1 select-none overflow-hidden ${zoom > 1 ? 'cursor-grab' : ''}`}
        onDoubleClick={() => setZoomClamped(zoom > 1 ? 1 : 2)}
        onPointerDown={(e) => {
          if (zoom <= 1) return;
          drag.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPan({ x: drag.current.baseX + (e.clientX - drag.current.startX), y: drag.current.baseY + (e.clientY - drag.current.startY) });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <img
          src={image.url}
          alt={image.label}
          draggable={false}
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain transition-transform duration-100"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        />
        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border-0 bg-ink/70 p-2.5 text-white/90 backdrop-blur-sm transition-colors hover:bg-ink"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border-0 bg-ink/70 p-2.5 text-white/90 backdrop-blur-sm transition-colors hover:bg-ink"
              aria-label="Next image"
            >
              <ChevronRight size={18} strokeWidth={1.75} />
            </button>
          </>
        ) : null}
      </div>

      {/* Pointer/keyboard hint — meaningless on touch, so it stays off phones. */}
      <p className="hidden px-4 pb-3 text-center text-caption text-bone/60 sm:block">
        ← → navigate · double-click to zoom · drag to pan · Esc to close
      </p>

      {social ? <SocialExport image={image} onClose={() => setSocial(false)} /> : null}
    </div>
  );
}
