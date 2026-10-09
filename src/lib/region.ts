// Edit only the marked box — by construction, not by request.
//
// Ground Floor asked the model, twice, to change only what was inside a red
// rectangle (Q4, Q4b). Both times it put the new frontage in the main building
// instead: the picture's subject outweighed the instruction, however it was
// worded. So the request no longer depends on the model's restraint. The box is
// cropped out with some context around it, only that crop is sent, and the
// result is pasted back over its own place with a feathered edge — the same
// move Reframe makes. Everything outside the crop is the user's own pixels.
//
// The geometry is pure (unit-checked in qa/units.ts); the canvas steps are
// browser-only and driven headlessly by the live harness via qa/canvasOps.cjs.

import { nearestAspect } from '../providers/options';
import { featherEdges, ratioValue } from './reframe';

/** A rectangle as fractions (0–1) of the image's width and height. */
export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A rectangle in pixels. */
export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * How much context goes round the box, as a share of the box's own size: a
 * lot above and below (the floors the frontage aligns to, the pavement it
 * opens onto), little to the sides. The first free crop test took 0.75 all
 * round and reached into the next building's garage — the very place the model
 * had wrongly put the café twice.
 */
export const CROP_MARGIN = { x: 0.2, y: 0.6 };

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** The box grown by `margin` of its own size on each side, kept inside the image. */
export function cropFrame(r: Region, margin = CROP_MARGIN): Region {
  const x0 = clamp(r.x - r.w * margin.x);
  const y0 = clamp(r.y - r.h * margin.y);
  const x1 = clamp(r.x + r.w * (1 + margin.x));
  const y1 = clamp(r.y + r.h * (1 + margin.y));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Where the box sits inside the crop, as fractions of the crop. */
export function within(r: Region, frame: Region): Region {
  return { x: (r.x - frame.x) / frame.w, y: (r.y - frame.y) / frame.h, w: r.w / frame.w, h: r.h / frame.h };
}

/**
 * The crop in pixels, grown to the nearest ratio the engine accepts so the
 * result can be scaled back without stretching. It grows around its own centre
 * and slides to stay inside the image; if the image is too small in that
 * direction it shrinks the other side instead.
 */
export function cropPixels(frame: Region, W: number, H: number): PixelRect {
  let w = Math.max(1, Math.round(frame.w * W));
  let h = Math.max(1, Math.round(frame.h * H));
  const cx = frame.x * W + w / 2;
  const cy = frame.y * H + h / 2;
  const r = ratioValue(nearestAspect(w, h) ?? `${w}:${h}`);
  if (w / h < r) w = Math.round(h * r);
  else h = Math.round(w / r);
  if (w > W) {
    w = W;
    h = Math.min(H, Math.round(W / r));
  }
  if (h > H) {
    h = H;
    w = Math.min(W, Math.round(H * r));
  }
  const x = Math.min(W - w, Math.max(0, Math.round(cx - w / 2)));
  const y = Math.min(H - h, Math.max(0, Math.round(cy - h / 2)));
  return { x, y, w, h };
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the image to crop.'));
    img.src = src;
  });
}

/** The marked area and its context, cut out of the (already marked) input. */
export async function cropToRegion(dataURL: string, box: Region): Promise<{ dataURL: string; px: PixelRect }> {
  const img = await load(dataURL);
  const px = cropPixels(cropFrame(box), img.naturalWidth, img.naturalHeight);
  const c = document.createElement('canvas');
  c.width = px.w;
  c.height = px.h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable.');
  ctx.drawImage(img, px.x, px.y, px.w, px.h, 0, 0, px.w, px.h);
  return { dataURL: c.toDataURL('image/png'), px };
}

/**
 * The model's edited crop, scaled to the crop's size and pasted over its place
 * in the full image. Its edges fade into the original over `feather` of the
 * crop's shorter side, except where the crop meets the image border.
 */
export async function pasteRegion(base: string, result: string, px: PixelRect, feather = 0.06): Promise<string> {
  const [orig, out] = await Promise.all([load(base), load(result)]);
  const W = orig.naturalWidth;
  const H = orig.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable.');
  ctx.drawImage(orig, 0, 0);
  const layer = document.createElement('canvas');
  layer.width = px.w;
  layer.height = px.h;
  const l = layer.getContext('2d');
  if (!l) throw new Error('Canvas unavailable.');
  l.drawImage(out, 0, 0, px.w, px.h);
  const f = Math.max(2, Math.round(Math.min(px.w, px.h) * feather));
  featherEdges(l, px.w, px.h, {
    left: px.x > 0 ? f : 0,
    right: px.x + px.w < W ? f : 0,
    top: px.y > 0 ? f : 0,
    bottom: px.y + px.h < H ? f : 0,
  });
  ctx.drawImage(layer, px.x, px.y);
  return c.toDataURL('image/jpeg', 0.92);
}
