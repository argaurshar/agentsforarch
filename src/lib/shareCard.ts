// The picture that travels.
//
// Sharing a bare output loses the only interesting part: that it came from
// something else. A render on its own is a render; a plan NEXT TO the render is
// the whole product in one image, and it needs no caption to be understood in a
// group chat.
//
// So the card is the pair, a verb, and the address — nothing else. Square,
// because square is what survives being a thumbnail in every app that will
// carry it.
//
// Pure canvas, like `socialExport.ts` beside it: no library, no server, and the
// user's image never leaves the tab.

import { BRAND } from './brand';
import { loadImage } from './images';

/** Square: the only shape that is not cropped by somebody. */
export const CARD_SIZE = 1080;
/** How much of the card the image pair gets. The rest is the footer. */
const PAIR_H = Math.round(CARD_SIZE * 0.7);
const MIST = '#a8a29a';

export interface ShareCardOpts {
  /** What went in. */
  before: string;
  /** What came out. */
  after: string;
  /** The transformation, in the registry's own words — "Draw the axonometric". */
  verb: string;
  /** Where a reader can do it themselves. Drawn small under the name. */
  url: string;
  /** True when the pair is one of the app's bundled examples rather than the
   *  user's own run. Stated on the card, for the same reason it is stated on
   *  screen: a prepared result passed off as a live one is a lie that spreads. */
  prepared?: boolean;
}

/** Cover-fit `img` into the rect, centre-cropped. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

/** A small bone-on-ink tag in the corner of a panel, so the pair reads in the
 *  right order without the viewer having to guess which half is the input.
 *  `align: 'right'` measures the text and hangs the tag off the right edge. */
function drawTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'right' = 'left',
): void {
  ctx.font = `500 ${Math.round(CARD_SIZE * 0.024)}px Inter, system-ui, -apple-system, sans-serif`;
  const padX = Math.round(CARD_SIZE * 0.016);
  const w = ctx.measureText(text).width + padX * 2;
  const h = Math.round(CARD_SIZE * 0.046);
  const left = align === 'right' ? x - w : x;
  ctx.fillStyle = 'rgba(17,17,17,0.72)';
  ctx.fillRect(left, y, w, h);
  ctx.fillStyle = BRAND.bone;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + padX, y + h / 2 + 1);
}

/**
 * Compose the card and hand back a canvas.
 *
 * A canvas rather than a dataURL because the two things that happen next want
 * different encodings — `navigator.share` and the download want a compact JPEG,
 * the clipboard accepts only PNG — and re-rendering for each would be work done
 * twice on the user's phone.
 */
export async function renderShareCard(opts: ShareCardOpts): Promise<HTMLCanvasElement> {
  const [before, after] = await Promise.all([loadImage(opts.before), loadImage(opts.after)]);

  // Webfonts are loaded from a stylesheet, so a card composed during the first
  // paint would fall back to system-ui mid-render. Cheap to wait for, and it is
  // already resolved by the time anyone reaches a result.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // A browser that refuses is a browser that will use the fallback stack.
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the share canvas.');

  ctx.fillStyle = BRAND.ink;
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  // Side by side for anything squarish or upright; stacked for a wide result,
  // where two half-width panels would centre-crop away most of the building.
  const wide = after.width / after.height > 1.15;
  const gap = 2;
  const tagPad = Math.round(CARD_SIZE * 0.022);
  if (wide) {
    const h = (PAIR_H - gap) / 2;
    drawCover(ctx, before, 0, 0, CARD_SIZE, h);
    drawCover(ctx, after, 0, h + gap, CARD_SIZE, h);
    drawTag(ctx, 'before', tagPad, tagPad);
    drawTag(ctx, 'after', tagPad, h + gap + tagPad);
  } else {
    const w = (CARD_SIZE - gap) / 2;
    drawCover(ctx, before, 0, 0, w, PAIR_H);
    drawCover(ctx, after, w + gap, 0, w, PAIR_H);
    drawTag(ctx, 'before', tagPad, tagPad);
    drawTag(ctx, 'after', w + gap + tagPad, tagPad);
  }

  // The honesty line rides on the IMAGE, opposite "before" — not in the footer,
  // where it collided with the address and where a platform that crops to a
  // 4:5 preview would cut it off entirely. What it discloses has to survive the
  // crop, or it is not a disclosure.
  if (opts.prepared) drawTag(ctx, 'a prepared example', CARD_SIZE - tagPad, tagPad, 'right');

  // --- Footer ---------------------------------------------------------------
  const pad = Math.round(CARD_SIZE * 0.055);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = BRAND.accent;
  ctx.fillRect(pad, PAIR_H + Math.round(CARD_SIZE * 0.055), Math.round(CARD_SIZE * 0.06), Math.round(CARD_SIZE * 0.007));

  ctx.fillStyle = BRAND.bone;
  ctx.font = `600 ${Math.round(CARD_SIZE * 0.05)}px Sora, Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText(opts.verb, pad, PAIR_H + Math.round(CARD_SIZE * 0.13));

  ctx.fillStyle = MIST;
  ctx.font = `400 ${Math.round(CARD_SIZE * 0.028)}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.fillText(`${BRAND.name} · ${BRAND.promise}`, pad, PAIR_H + Math.round(CARD_SIZE * 0.185));

  // Where the app lives, not the whole remix URL: the full link travels in the
  // share message and on the clipboard, and a hash with a query in it is both
  // unreadable at this size and long enough to run off the card.
  ctx.fillStyle = BRAND.accent;
  ctx.fillText(
    opts.url.replace(/^https?:\/\//, '').replace(/[#?].*$/, '').replace(/\/$/, ''),
    pad,
    PAIR_H + Math.round(CARD_SIZE * 0.235),
  );

  return canvas;
}

/** `canvas.toBlob` as a promise, since every caller here awaits it. */
export function canvasBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the share image.'))),
      type,
      type === 'image/jpeg' ? 0.92 : undefined,
    );
  });
}
