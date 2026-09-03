// What kind of image did the user just drop?
//
// The whole front door hangs on this question, so it is worth being explicit
// about what this is and is not. It is a CHEAP PIXEL HEURISTIC — a few hundred
// samples off a downscaled canvas — and it is wrong sometimes. That is fine,
// and deliberate: the alternative was a vision call on every drop, which costs
// the user money before the app has done anything for them, on a guess the user
// can correct in one tap.
//
// So the contract is: guess well enough that the right card is usually already
// on screen, never block on being right, and always show the guess as a
// correctable chip rather than a silent decision.
//
// The three signals, in the order they decide things:
//
//   1. INK ON WHITE. Drawings are mostly paper. A high fraction of near-white
//      pixels with almost no colour is a plan, a sketch or a line elevation —
//      not a photograph. This is the one signal that is close to reliable,
//      because "mostly white with thin dark marks" is what a drawing IS.
//   2. SKY. Among photographs, a bright or blue top edge means we are outside.
//      Interiors have a ceiling there instead: darker than the middle of the
//      frame, and never blue.
//   3. TOP-DOWN GREEN/GREY. Satellite imagery is unusually flat in luminance
//      and skews green-grey with no sky anywhere. Weakest of the three, so it
//      is checked last and only claims `map` when the frame is also un-sky-like.
//
// Plan vs sketch is deliberately NOT attempted. Both are ink on white, the
// difference is line quality, and getting it wrong either way costs one tap.
// `plan` wins because it is the studio's most common input.

import type { InputKind } from '../features/registry/keys';

/** The sample grid. 48×48 is ~2,300 pixels — plenty for fractions, and fast. */
const GRID = 48;

interface Stats {
  /** Fraction of pixels that are near-white. */
  paper: number;
  /** Mean saturation, 0–1. */
  saturation: number;
  /** Mean luminance of the top 15% of rows, 0–1. */
  skyLuma: number;
  /** Mean blue-minus-red of the top 15% of rows, −1–1. Positive = blue sky. */
  skyBlue: number;
  /** Mean luminance of the whole frame, 0–1. */
  luma: number;
  /** Standard deviation of luminance, 0–1. Low = flat, like satellite. */
  contrast: number;
  /** Mean green-minus-red across the frame, −1–1. */
  green: number;
}

function sample(img: HTMLImageElement): Stats | null {
  const canvas = document.createElement('canvas');
  canvas.width = GRID;
  canvas.height = GRID;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, GRID, GRID);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, GRID, GRID).data;
  } catch {
    // A cross-origin image would taint the canvas. Every image the app handles
    // is a data URL, so this should not happen — but a thrown classifier must
    // not take the drop with it.
    return null;
  }

  const skyRows = Math.max(1, Math.round(GRID * 0.15));
  let paper = 0;
  let satSum = 0;
  let lumaSum = 0;
  let lumaSqSum = 0;
  let greenSum = 0;
  let skyLumaSum = 0;
  let skyBlueSum = 0;
  let skyCount = 0;

  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const i = (y * GRID + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = max === 0 ? 0 : (max - min) / max;

      if (l > 0.88 && max - min < 0.08) paper += 1;
      satSum += sat;
      lumaSum += l;
      lumaSqSum += l * l;
      greenSum += g - r;
      if (y < skyRows) {
        skyLumaSum += l;
        skyBlueSum += b - r;
        skyCount += 1;
      }
    }
  }

  const n = GRID * GRID;
  const luma = lumaSum / n;
  return {
    paper: paper / n,
    saturation: satSum / n,
    skyLuma: skyLumaSum / skyCount,
    skyBlue: skyBlueSum / skyCount,
    luma,
    contrast: Math.sqrt(Math.max(0, lumaSqSum / n - luma * luma)),
    green: greenSum / n,
  };
}

/** The guess, plus how much to trust it. `low` is what makes the chip a prompt
 *  to check rather than a label to ignore. */
export interface Guess {
  kind: InputKind;
  confidence: 'high' | 'low';
}

/** Classify from already-measured statistics. Pure, so it is testable without
 *  a DOM — which is the only way to check the thresholds honestly. */
export function classifyStats(s: Stats): Guess {
  // 1. Ink on white. Two thresholds because a scanned drawing has grey paper.
  if (s.paper > 0.55 && s.saturation < 0.12) return { kind: 'plan', confidence: 'high' };
  if (s.paper > 0.4 && s.saturation < 0.08) return { kind: 'plan', confidence: 'low' };

  // 2. Sky. A bright top edge, or a blue one, means outside.
  const brightTop = s.skyLuma > s.luma + 0.12 && s.skyLuma > 0.5;
  const blueTop = s.skyBlue > 0.06;
  if (blueTop && brightTop) return { kind: 'building', confidence: 'high' };
  if (blueTop || brightTop) return { kind: 'building', confidence: 'low' };

  // 3. Flat, green-grey and skyless: overhead imagery.
  if (s.contrast < 0.16 && s.green > 0.01) return { kind: 'map', confidence: 'low' };

  // Everything left is a photograph with a ceiling in it.
  return { kind: 'room', confidence: s.luma < 0.62 ? 'high' : 'low' };
}

/**
 * Guess what a dropped image is. Never throws and never blocks: any failure
 * returns the safe default rather than stopping the user at the door.
 */
export async function classifyImage(dataURL: string): Promise<Guess> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode failed'));
      el.src = dataURL;
    });
    const stats = sample(img);
    if (!stats) return { kind: 'plan', confidence: 'low' };
    return classifyStats(stats);
  } catch {
    return { kind: 'plan', confidence: 'low' };
  }
}
