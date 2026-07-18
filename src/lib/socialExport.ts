// Render an output onto a fixed social-media canvas (cover-fit + a subtle brand
// footer), so architects/designers can post a render straight to Instagram or a
// site without opening another tool. Pure client-side canvas — no dependency.

import { loadImage } from './images';

export interface SocialFormat {
  key: string;
  label: string;
  w: number;
  h: number;
}

export const SOCIAL_FORMATS: SocialFormat[] = [
  { key: 'square', label: 'Square 1:1', w: 1080, h: 1080 },
  { key: 'portrait', label: 'Portrait 4:5', w: 1080, h: 1350 },
  { key: 'story', label: 'Story 9:16', w: 1080, h: 1920 },
  { key: 'landscape', label: 'Landscape 16:9', w: 1200, h: 675 },
];

interface SocialOpts {
  caption: string; // project / studio name shown bottom-left
  accent: string; // brand accent hex — the tick + footer rule
}

/** Compose the image into the chosen frame and return a JPEG dataURL. */
export async function renderSocial(url: string, fmt: SocialFormat, opts: SocialOpts): Promise<string> {
  const img = await loadImage(url);
  const { w, h } = fmt;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the export canvas.');

  // Cover-fit the image into the whole frame (center-crop).
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, w, h);
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);

  // Bottom gradient so the caption stays legible over any image.
  const grad = ctx.createLinearGradient(0, h * 0.66, 0, h);
  grad.addColorStop(0, 'rgba(17,17,17,0)');
  grad.addColorStop(1, 'rgba(17,17,17,0.78)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, Math.round(h * 0.66), w, Math.round(h * 0.34));

  // Brand tick + caption bottom-left.
  const pad = Math.round(w * 0.055);
  const tickW = Math.round(w * 0.06);
  ctx.fillStyle = opts.accent || '#86662e';
  ctx.fillRect(pad, h - pad - Math.round(w * 0.05), tickW, Math.round(w * 0.008));
  const caption = opts.caption.trim() || 'AND Studio';
  ctx.fillStyle = '#f3ede1';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${Math.round(w * 0.036)}px Georgia, "Times New Roman", serif`;
  ctx.fillText(caption, pad, h - pad - Math.round(w * 0.065));

  return canvas.toDataURL('image/jpeg', 0.92);
}
