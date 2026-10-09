// Reframe & Extend: the canvas work that makes "no distortion and no loss of
// detail" a guarantee instead of a hope.
//
// BEFORE the request, the input is placed on a canvas of the target ratio with
// flat grey margins, so the model is shown exactly where the picture stops and
// what is new. AFTER it, the original pixels are pasted back over their place
// with a soft feathered edge, so whatever the model did to the middle of the
// frame, the building the architect supplied is the building that comes back.
//
// The geometry is a pure function (unit-checked in qa/units.ts); the two canvas
// steps are browser-only and are driven headlessly by the live harness.

export type ReframeAnchor = 'centre' | 'top' | 'bottom';

export interface Placement {
  /** The padded canvas. */
  W: number;
  H: number;
  /** Where the original sits on it, at its own size. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** "9:16" → 0.5625. */
export function ratioValue(ratio: string): number {
  const [a, b] = ratio.split(':').map(Number);
  return a > 0 && b > 0 ? a / b : 1;
}

/**
 * The smallest canvas of the target ratio that holds the original at its own
 * size. Extending horizontally always centres; vertically the anchor decides
 * whether the new space goes above, below or both.
 */
export function placement(w: number, h: number, ratio: string, anchor: ReframeAnchor): Placement {
  const r = ratioValue(ratio);
  if (w / h < r) {
    const W = Math.round(h * r);
    return { W, H: h, x: Math.round((W - w) / 2), y: 0, w, h };
  }
  const H = Math.round(w / r);
  const y = anchor === 'top' ? 0 : anchor === 'bottom' ? H - h : Math.round((H - h) / 2);
  return { W: w, H, x: 0, y, w, h };
}

/** The grey the margins are filled with — named in the prompt. */
export const MARGIN_GREY = '#808080';

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the image to reframe.'));
    img.src = src;
  });
}

/** The input on its target-ratio canvas, and where it sits. */
export async function padToRatio(
  dataURL: string,
  ratio: string,
  anchor: ReframeAnchor,
): Promise<{ dataURL: string; place: Placement }> {
  const img = await load(dataURL);
  const place = placement(img.naturalWidth, img.naturalHeight, ratio, anchor);
  const c = document.createElement('canvas');
  c.width = place.W;
  c.height = place.H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable.');
  ctx.fillStyle = MARGIN_GREY;
  ctx.fillRect(0, 0, place.W, place.H);
  ctx.drawImage(img, place.x, place.y);
  return { dataURL: c.toDataURL('image/png'), place };
}

/**
 * The model's extended picture, scaled to the padded canvas, with the original
 * pasted back over its own place. The edge is feathered over `feather` of the
 * shorter side so the seam between supplied and generated pixels is soft.
 */
export async function pasteBack(original: string, result: string, place: Placement, feather = 0.03): Promise<string> {
  const [orig, out] = await Promise.all([load(original), load(result)]);
  const c = document.createElement('canvas');
  c.width = place.W;
  c.height = place.H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable.');
  ctx.drawImage(out, 0, 0, place.W, place.H);

  // The original, masked by a rectangle whose edges fade to nothing.
  const f = Math.max(2, Math.round(Math.min(place.w, place.h) * feather));
  const layer = document.createElement('canvas');
  layer.width = place.w;
  layer.height = place.h;
  const l = layer.getContext('2d');
  if (!l) throw new Error('Canvas unavailable.');
  l.drawImage(orig, 0, 0);
  // Edges that touch the canvas border keep full opacity: there is no
  // generated pixel beyond them to blend into.
  const left = place.x > 0 ? f : 0;
  const right = place.x + place.w < place.W ? f : 0;
  const top = place.y > 0 ? f : 0;
  const bottom = place.y + place.h < place.H ? f : 0;
  featherEdges(l, place.w, place.h, { left, right, top, bottom });
  ctx.drawImage(layer, place.x, place.y);
  return c.toDataURL('image/jpeg', 0.92);
}

/**
 * Fade a layer's edges to transparent over the given widths (0 = keep the edge
 * hard). Four ramps multiplied together with destination-in. Shared by
 * Reframe's paste-back and the Ground Floor crop's paste-back.
 */
export function featherEdges(
  l: CanvasRenderingContext2D,
  w: number,
  h: number,
  e: { left: number; right: number; top: number; bottom: number },
): void {
  l.globalCompositeOperation = 'destination-in';
  const ramp = (x0: number, y0: number, x1: number, y1: number) => {
    const g = l.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    return g;
  };
  if (e.left) {
    l.fillStyle = ramp(0, 0, e.left, 0);
    l.fillRect(0, 0, w, h);
  }
  if (e.right) {
    l.fillStyle = ramp(w, 0, w - e.right, 0);
    l.fillRect(0, 0, w, h);
  }
  if (e.top) {
    l.fillStyle = ramp(0, 0, 0, e.top);
    l.fillRect(0, 0, w, h);
  }
  if (e.bottom) {
    l.fillStyle = ramp(0, h, 0, h - e.bottom);
    l.fillRect(0, 0, w, h);
  }
  l.globalCompositeOperation = 'source-over';
}
