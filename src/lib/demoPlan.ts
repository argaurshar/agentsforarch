// The bundled sample floor plan (src/assets/demo-plan.svg) rasterized to a PNG
// dataURL, so a first-time user can try Feature 01 with zero assets of their
// own. Rasterizing (instead of passing the SVG through) matches what the
// dropzone produces and what the Gemini provider expects.

import demoPlanUrl from '../assets/demo-plan.svg';
import { loadImage } from './images';

let cached: string | null = null;

export async function loadDemoPlan(): Promise<string> {
  if (cached) return cached;
  const img = await loadImage(demoPlanUrl);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the sample plan.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  cached = canvas.toDataURL('image/png');
  return cached;
}
