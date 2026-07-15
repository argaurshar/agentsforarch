import { loadImage, newId } from '../lib/images';
import { outputLabels } from './labels';
import type { GeneratedImage, GenerateRequest, GenerateResult, ImageProvider } from './types';

// The MockProvider (spec §5). Works with ZERO configuration so the whole app
// is demo-able immediately. It returns the *input image*, canvas-processed so
// each feature's output visibly differs, after a realistic delay.

const MIN_DELAY_MS = 1500;
const MAX_DELAY_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }
  return { canvas, ctx };
}

// render → warm colour wash + slight blur (suggests a render). The base recipe
// is the spec requirement; the style control modulates it so each style reads
// distinctly.
async function renderTransform(input: string, variation: number, style: string | undefined): Promise<string> {
  const img = await loadImage(input);
  const { canvas, ctx } = makeCanvas(img.width, img.height);
  const blur = 0.8 + variation * 0.5;

  if (style === 'line') {
    // Line drawing — grayscale with strong contrast, no colour wash.
    ctx.filter = `grayscale(1) contrast(1.65) brightness(1.1) blur(${Math.max(0, blur - 0.6)}px)`;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  if (style === 'clay') {
    // Clay model — desaturated with a neutral warm-grey wash.
    ctx.filter = `grayscale(0.7) contrast(1.05) brightness(1.05) blur(${blur}px)`;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  // photoreal (default) + watercolour share the warm-wash base.
  const saturation = style === 'watercolour' ? 1.35 : 1.12;
  const extraBlur = style === 'watercolour' ? 1.2 : 0;
  ctx.filter = `blur(${blur + extraBlur}px) saturate(${saturation}) brightness(1.02)`;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';

  // Warm wash — the single-accent family (amber → golden hour), varied per output.
  const washes = ['#c2410c', '#d97706', '#b45309', '#ea580c'];
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = style === 'watercolour' ? 0.2 : 0.28;
  ctx.fillStyle = washes[variation % washes.length];
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // A faint highlight to read as light entering the scene.
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#fff7ed';
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.55);

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return canvas.toDataURL('image/jpeg', 0.9);
}

// elevation → high-contrast grayscale (suggests a line elevation)
async function elevationTransform(input: string, style: string | undefined): Promise<string> {
  const img = await loadImage(input);
  const { canvas, ctx } = makeCanvas(img.width, img.height);
  const contrast = style === 'line' ? 1.7 : style === 'shaded' ? 1.15 : 1.4;
  const brightness = style === 'line' ? 1.12 : 1.04;
  ctx.filter = `grayscale(1) contrast(${contrast}) brightness(${brightness})`;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';

  if (style === 'shaded') {
    // Soft vertical shading gradient for a shaded elevation.
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, 'rgba(15,23,41,0)');
    grad.addColorStop(1, 'rgba(15,23,41,0.22)');
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  return canvas.toDataURL('image/jpeg', 0.9);
}

// axonometric → grayscale + a skew transform baked into the canvas (suggests an
// axon). The shear direction and vertical orientation vary by viewpoint so
// NE/NW/SE/SW read as genuinely different views.
async function axonTransform(input: string, section: boolean, viewpoint: string): Promise<string> {
  const img = await loadImage(input);
  const w = img.width;
  const h = img.height;

  // East viewpoints shear right, West shear left; South viewpoints look up
  // (vertical flip). This makes the four quadrants visually distinct.
  const east = viewpoint.includes('E');
  const south = viewpoint.startsWith('S');
  const shear = 0.34;
  const extra = Math.round(shear * h);

  // 1) Process (grayscale) + optional vertical flip onto a natural-size buffer.
  const { canvas: temp, ctx: tctx } = makeCanvas(w, h);
  tctx.filter = 'grayscale(1) contrast(1.25) brightness(1.03)';
  if (south) {
    tctx.translate(0, h);
    tctx.scale(1, -1);
  }
  tctx.drawImage(img, 0, 0, w, h);
  tctx.filter = 'none';

  // 2) Shear the processed buffer onto the drafting sheet.
  const { canvas, ctx } = makeCanvas(w + extra, h);
  ctx.fillStyle = '#ede6d5'; // drafting-paper backdrop
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (east) {
    // x' = x + shear*y — top edge stays left-aligned.
    ctx.setTransform(1, 0, shear, 1, 0, 0);
  } else {
    // x' = x - shear*y, offset so the bottom edge stays left-aligned.
    ctx.setTransform(1, 0, -shear, 1, extra, 0);
  }
  ctx.drawImage(temp, 0, 0);
  ctx.restore();

  if (section) {
    // Suggest a cut plane with poché bands near the base.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#0f1729';
    const bandHeight = Math.max(6, Math.round(h * 0.02));
    ctx.fillRect(0, canvas.height - bandHeight * 4, canvas.width, bandHeight);
    ctx.fillRect(0, canvas.height - bandHeight * 2, canvas.width, bandHeight);
    ctx.globalAlpha = 1;
  }
  return canvas.toDataURL('image/jpeg', 0.9);
}

export class MockProvider implements ImageProvider {
  name = 'Mock Studio';

  isConfigured(): boolean {
    return true; // always available — the demo path
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const start = performance.now();
    await delay(randomDelay());

    const images: GeneratedImage[] = [];
    const createdAt = Date.now();
    const labels = outputLabels(req); // shared with the real providers

    if (req.feature === 'axonometric') {
      const viewpoints = req.options.viewpoints?.length ? req.options.viewpoints : ['NE'];
      const section = req.options.style === 'section';
      for (let i = 0; i < viewpoints.length; i += 1) {
        const url = await axonTransform(req.inputImage, section, viewpoints[i]);
        images.push({ id: newId('img'), url, label: labels[i], createdAt });
      }
    } else if (req.feature === 'elevation') {
      const url = await elevationTransform(req.inputImage, req.options.style);
      images.push({ id: newId('img'), url, label: labels[0], createdAt });
    } else {
      // render
      const variations = Math.max(1, req.options.variations ?? 1);
      for (let i = 0; i < variations; i += 1) {
        const url = await renderTransform(req.inputImage, i, req.options.style);
        images.push({ id: newId('img'), url, label: labels[i], createdAt });
      }
    }

    return {
      images,
      providerName: this.name,
      elapsedMs: Math.round(performance.now() - start),
    };
  }
}
