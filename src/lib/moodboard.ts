// Render a set of pooled images onto a single branded material / mood board on
// canvas — a client-pleaser architects hand to clients alongside the renders.
// Pure client-side canvas (no dependency): a serif header, an adaptive image
// grid (cover-fit, centred partial last row), and a brand-accented footer.

import { loadImage } from './images';

export interface MoodboardOrientation {
  key: 'portrait' | 'landscape' | 'square';
  label: string;
  w: number;
  h: number;
}

// Print-friendly proportions (2:2.5 / 4:3 / 1:1). Rendered at generous pixel
// sizes so the exported PNG stays crisp when placed in a deck or printed.
export const MOODBOARD_ORIENTATIONS: MoodboardOrientation[] = [
  { key: 'portrait', label: 'Portrait', w: 1600, h: 2000 },
  { key: 'landscape', label: 'Landscape', w: 2000, h: 1500 },
  { key: 'square', label: 'Square', w: 1800, h: 1800 },
];

export const MOODBOARD_MAX_IMAGES = 9;

export interface MoodboardBrand {
  primary: string; // headings
  accent: string; // eyebrow + footer tick
  background: string; // board background
  text: string; // subtitle / body
}

export interface MoodboardOpts {
  title: string;
  subtitle: string;
  projectName: string;
  brand: MoodboardBrand;
}

// Decoded images are cached by URL so dragging orientation / editing the title
// re-renders instantly instead of re-decoding every dataURL each keystroke.
const imageCache = new Map<string, HTMLImageElement>();

async function cachedImage(url: string): Promise<HTMLImageElement> {
  const hit = imageCache.get(url);
  if (hit) return hit;
  const img = await loadImage(url);
  imageCache.set(url, img);
  return img;
}

/** Truncate text with an ellipsis so it never overflows `maxWidth`. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out.trimEnd()}…`;
}

/** Cover-fit-draw an image into a clipped cell (center-crop, no distortion). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/**
 * Compose the selected images into a branded board and return a PNG dataURL.
 * `urls` is 1..MOODBOARD_MAX_IMAGES images, in display order.
 */
export async function renderMoodboard(urls: string[], orientation: MoodboardOrientation, opts: MoodboardOpts): Promise<string> {
  const imgs = await Promise.all(urls.slice(0, MOODBOARD_MAX_IMAGES).map(cachedImage));
  // Ensure brand web fonts are ready so serif text renders correctly (not a fallback).
  try {
    await document.fonts?.ready;
  } catch {
    // Font Loading API unavailable — fall back to system serif.
  }

  const { w, h } = orientation;
  const { primary, accent, background, text } = opts.brand;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the mood-board canvas.');

  ctx.fillStyle = background || '#f3ede1';
  ctx.fillRect(0, 0, w, h);

  const margin = Math.round(w * 0.055);
  const contentW = w - margin * 2;

  // --- Header ---------------------------------------------------------------
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const eyebrowY = margin + Math.round(w * 0.02);
  ctx.fillStyle = accent || '#86662e';
  ctx.font = `${Math.round(w * 0.014)}px "Courier New", ui-monospace, monospace`;
  const eyebrow = 'MATERIAL · MOOD BOARD';
  ctx.fillText(spaced(eyebrow), margin, eyebrowY);

  const titleY = eyebrowY + Math.round(w * 0.055);
  ctx.fillStyle = primary || '#1c1815';
  ctx.font = `${Math.round(w * 0.05)}px Fraunces, Georgia, serif`;
  const title = (opts.title.trim() || 'Material & Mood Board').toString();
  ctx.fillText(fitText(ctx, title, contentW), margin, titleY);

  let headerBottom = titleY;
  const subtitle = opts.subtitle.trim();
  if (subtitle) {
    const subY = titleY + Math.round(w * 0.032);
    ctx.fillStyle = text || '#4b463f';
    ctx.font = `${Math.round(w * 0.02)}px Georgia, "Times New Roman", serif`;
    ctx.fillText(fitText(ctx, subtitle, contentW), margin, subY);
    headerBottom = subY;
  }

  // Hairline under the header.
  const ruleY = headerBottom + Math.round(w * 0.03);
  ctx.strokeStyle = hairline(primary || '#1c1815');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, ruleY);
  ctx.lineTo(w - margin, ruleY);
  ctx.stroke();

  // --- Footer ---------------------------------------------------------------
  const footerY = h - margin;
  ctx.strokeStyle = hairline(primary || '#1c1815');
  ctx.beginPath();
  ctx.moveTo(margin, footerY - Math.round(w * 0.03));
  ctx.lineTo(w - margin, footerY - Math.round(w * 0.03));
  ctx.stroke();

  // Accent tick + project name (left), studio mark (right).
  const tickW = Math.round(w * 0.045);
  ctx.fillStyle = accent || '#86662e';
  ctx.fillRect(margin, footerY - Math.round(w * 0.014), tickW, Math.round(w * 0.006));
  ctx.fillStyle = primary || '#1c1815';
  ctx.font = `${Math.round(w * 0.02)}px Fraunces, Georgia, serif`;
  const project = opts.projectName.trim() || 'AND Studio';
  ctx.fillText(fitText(ctx, project, contentW * 0.6), margin + tickW + Math.round(w * 0.02), footerY - Math.round(w * 0.005));

  ctx.textAlign = 'right';
  ctx.fillStyle = accent || '#86662e';
  ctx.font = `${Math.round(w * 0.013)}px "Courier New", ui-monospace, monospace`;
  ctx.fillText(spaced('AND STUDIO'), w - margin, footerY - Math.round(w * 0.006));
  ctx.textAlign = 'left';

  // --- Image grid -----------------------------------------------------------
  const gridTop = ruleY + Math.round(w * 0.035);
  const gridBottom = footerY - Math.round(w * 0.06);
  const gridH = gridBottom - gridTop;
  const gap = Math.round(w * 0.018);

  const n = imgs.length;
  if (n > 0 && gridH > 0) {
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const cellW = (contentW - (cols - 1) * gap) / cols;
    const cellH = (gridH - (rows - 1) * gap) / rows;

    for (let i = 0; i < n; i += 1) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      // Centre a partial last row so the board never looks lopsided.
      const inRow = Math.min(cols, n - row * cols);
      const rowWidth = inRow * cellW + (inRow - 1) * gap;
      const rowStartX = margin + (contentW - rowWidth) / 2;
      const x = rowStartX + col * (cellW + gap);
      const y = gridTop + row * (cellH + gap);
      drawCover(ctx, imgs[i], x, y, cellW, cellH);
      // Hairline frame around each tile.
      ctx.strokeStyle = hairline(primary || '#1c1815');
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
    }
  }

  return canvas.toDataURL('image/png');
}

/** Wide letter-spacing for the mono eyebrow (canvas has no letter-spacing before recent APIs). */
function spaced(text: string): string {
  return text.split('').join(' '); // thin space between glyphs
}

/** A translucent version of the ink colour for hairline rules/frames. */
function hairline(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 'rgba(28,24,21,0.16)';
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},0.16)`;
}
