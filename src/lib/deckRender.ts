// Editorial deck renderer — draws every presentation page on canvas in the
// project's brand identity (real fonts, not jsPDF's built-ins), so the on-screen
// preview and the exported PDF are pixel-identical. The design language follows
// the studio system: serif display type, mono eyebrows, one accent, hairlines,
// generous whitespace — a magazine-style architecture deck, not an image dump.

import type { Brand, GeneratedImage, Slide, SlideLayout } from '../types';
import { loadImage } from './images';

// A4 landscape at ~7× points — crisp in print, fast enough to render live.
export const DECK_PAGE_W = 2100;
export const DECK_PAGE_H = 1485;

const CAPACITY: Record<SlideLayout, number> = { full: 1, 'two-up': 2, 'four-grid': 4 };

const MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace";

const imageCache = new Map<string, HTMLImageElement>();
async function cachedImage(url: string): Promise<HTMLImageElement | null> {
  const hit = imageCache.get(url);
  if (hit) return hit;
  try {
    const img = await loadImage(url);
    imageCache.set(url, img);
    return img;
  } catch {
    return null;
  }
}

function withAlpha(hex: string, alpha: number, fallback: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return fallback;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const int = parseInt(h, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

/** Word-wrap `text` to `maxWidth`, at most `maxLines` lines (ellipsis on the last). */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width <= maxWidth || !line) {
      line = probe;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && line && lines[maxLines - 1] !== line) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

/** Cover-fit-draw an image into a clipped rect (center-crop) with a hairline frame. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  hairline: string,
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
  ctx.strokeStyle = hairline;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function emptyCell(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tint: string, hairline: string): void {
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = hairline;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

interface DeckTheme {
  bg: string;
  primary: string;
  text: string;
  accent: string;
  hairline: string;
  tint: string;
  serif: string;
  body: string;
}

function themeFrom(brand: Brand): DeckTheme {
  return {
    bg: brand.background || '#F7F2E8',
    primary: brand.primary || '#0F1729',
    text: brand.text || '#334155',
    accent: brand.accent || '#C2410C',
    hairline: withAlpha(brand.primary || '#0F1729', 0.16, 'rgba(15,23,41,0.16)'),
    tint: withAlpha(brand.primary || '#0F1729', 0.04, 'rgba(15,23,41,0.04)'),
    serif: brand.headingFont || 'Cormorant, Georgia, serif',
    body: brand.bodyFont || 'Inter, system-ui, sans-serif',
  };
}

function newPage(t: DeckTheme): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = DECK_PAGE_W;
  canvas.height = DECK_PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, DECK_PAGE_W, DECK_PAGE_H);
  return { canvas, ctx };
}

/** Wait for the document's webfonts so canvas text uses the real brand faces. */
async function fontsReady(): Promise<void> {
  try {
    await document.fonts.ready;
  } catch {
    /* older browsers — fall back silently */
  }
}

function monthYear(): string {
  return new Date()
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    .toUpperCase();
}

/** Mono eyebrow with manual letter-spacing (canvas has no letter-spacing). */
function drawMono(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, tracking = 0.18): number {
  ctx.font = `500 ${size}px ${MONO}`;
  ctx.fillStyle = color;
  let cx = x;
  const track = size * tracking;
  for (const ch of text.toUpperCase()) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + track;
  }
  return cx - track;
}

function drawMonoRight(ctx: CanvasRenderingContext2D, text: string, right: number, y: number, size: number, color: string, tracking = 0.18): void {
  ctx.font = `500 ${size}px ${MONO}`;
  const track = size * tracking;
  let width = 0;
  for (const ch of text.toUpperCase()) width += ctx.measureText(ch).width + track;
  drawMono(ctx, text, right - (width - track), y, size, color, tracking);
}

function footer(ctx: CanvasRenderingContext2D, t: DeckTheme, projectName: string, brandName: string, page: number, total: number): void {
  const y = DECK_PAGE_H - 118;
  ctx.strokeStyle = t.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, y);
  ctx.lineTo(DECK_PAGE_W - 120, y);
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  ctx.font = `500 22px ${MONO}`;
  drawMono(ctx, truncate(ctx, `${projectName} · Concept Presentation`, 1100), 120, y + 52, 22, t.text, 0.14);
  drawMonoRight(ctx, `${brandName} · ${String(page).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, DECK_PAGE_W - 120, y + 52, 22, t.accent, 0.14);
}

/** Page 1 — the cover: type left, optional full-height hero right. */
export async function renderCoverPage(opts: {
  projectName: string;
  brand: Brand;
  heroUrl?: string | null;
  pageCount: number;
}): Promise<string> {
  await fontsReady();
  const t = themeFrom(opts.brand);
  const { canvas, ctx } = newPage(t);
  const brandName = (opts.brand.name || 'AND Studio').toUpperCase();
  const hero = opts.heroUrl ? await cachedImage(opts.heroUrl) : null;

  // Optional hero panel — right 45%, full height.
  const textRight = hero ? 1080 : DECK_PAGE_W - 260;
  if (hero) drawCover(ctx, hero, 1155, 0, DECK_PAGE_W - 1155, DECK_PAGE_H, t.hairline);

  // Accent tick + eyebrow.
  ctx.fillStyle = t.accent;
  ctx.fillRect(150, 208, 92, 8);
  drawMono(ctx, `${brandName} — Concept Presentation`, 150, 296, 26, t.accent);

  // Project name, large light serif.
  ctx.font = `300 168px ${t.serif}`;
  ctx.fillStyle = t.primary;
  const lines = wrapText(ctx, opts.projectName || 'Untitled Project', textRight - 150, 3);
  let ty = 520;
  for (const line of lines) {
    ctx.fillText(line, 150, ty);
    ty += 176;
  }

  // Date + counts under the title block.
  drawMono(ctx, monthYear(), 150, ty + 20, 26, t.text);

  // Cover footer — no page number on the cover.
  const fy = DECK_PAGE_H - 118;
  ctx.strokeStyle = t.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(150, fy);
  ctx.lineTo(textRight, fy);
  ctx.stroke();
  drawMono(ctx, 'Architecture & Design Studio', 150, fy + 52, 22, t.text, 0.14);

  return canvas.toDataURL('image/jpeg', 0.92);
}

/** A content page: a left rail (number · title · rule · caption) + editorial image zone. */
export async function renderSlidePage(opts: {
  slide: Slide;
  imageMap: Map<string, GeneratedImage>;
  brand: Brand;
  projectName: string;
  page: number; // 1-based across the whole deck (cover = 1)
  pageCount: number;
  slideNumber: number; // 1-based among content slides
}): Promise<string> {
  const { slide, imageMap, brand, projectName, page, pageCount, slideNumber } = opts;
  await fontsReady();
  const t = themeFrom(brand);
  const { canvas, ctx } = newPage(t);
  const brandName = (brand.name || 'AND Studio').toUpperCase();

  // --- Left rail --------------------------------------------------------------
  const railX = 120;
  const railW = 470;

  // Big light serif slide number.
  ctx.font = `300 210px ${t.serif}`;
  ctx.fillStyle = withAlpha(brand.accent || '#C2410C', 0.85, 'rgba(194,65,12,0.85)');
  ctx.fillText(String(slideNumber).padStart(2, '0'), railX - 6, 320);

  // Title.
  let ty = 470;
  if (slide.title) {
    ctx.font = `500 74px ${t.serif}`;
    ctx.fillStyle = t.primary;
    for (const line of wrapText(ctx, slide.title, railW, 4)) {
      ctx.fillText(line, railX, ty);
      ty += 84;
    }
    ty += 14;
  }

  // Accent rule.
  ctx.fillStyle = t.accent;
  ctx.fillRect(railX, ty - 44, 64, 6);
  ty += 42;

  // Caption body.
  if (slide.caption) {
    ctx.font = `400 34px ${t.body}`;
    ctx.fillStyle = t.text;
    for (const line of wrapText(ctx, slide.caption, railW, 9)) {
      ctx.fillText(line, railX, ty);
      ty += 50;
    }
  }

  // --- Image zone -------------------------------------------------------------
  const zone = { x: 680, y: 120, w: DECK_PAGE_W - 680 - 120, h: 1120 };
  const ids = slide.imageIds.slice(0, CAPACITY[slide.layout]);
  const images = await Promise.all(ids.map((id) => cachedImage(imageMap.get(id)?.url ?? '')));
  const labels = ids.map((id) => imageMap.get(id)?.label ?? '');
  const figLabel = (i: number) => `Fig. ${String(i + 1).padStart(2, '0')} — ${labels[i] || 'Untitled'}`;

  if (slide.layout === 'full') {
    if (images[0]) drawCover(ctx, images[0], zone.x, zone.y, zone.w, zone.h - 56, t.hairline);
    else emptyCell(ctx, zone.x, zone.y, zone.w, zone.h - 56, t.tint, t.hairline);
    ctx.font = `500 22px ${MONO}`;
    drawMono(ctx, truncate(ctx, figLabel(0), zone.w), zone.x, zone.y + zone.h + 8, 22, t.text, 0.12);
  } else if (slide.layout === 'two-up') {
    // Editorial stagger: the first image sits high, the second drops.
    const gap = 46;
    const w = (zone.w - gap) / 2;
    const h = zone.h - 146;
    const cells = [
      { x: zone.x, y: zone.y, w, h },
      { x: zone.x + w + gap, y: zone.y + 90, w, h },
    ];
    cells.forEach((c, i) => {
      if (images[i]) drawCover(ctx, images[i] as HTMLImageElement, c.x, c.y, c.w, c.h, t.hairline);
      else emptyCell(ctx, c.x, c.y, c.w, c.h, t.tint, t.hairline);
      ctx.font = `500 20px ${MONO}`;
      drawMono(ctx, truncate(ctx, figLabel(i), c.w), c.x, c.y + c.h + 44, 20, t.text, 0.12);
    });
  } else {
    const gap = 36;
    const w = (zone.w - gap) / 2;
    const h = (zone.h - gap - 40) / 2;
    const cells = [
      { x: zone.x, y: zone.y, w, h },
      { x: zone.x + w + gap, y: zone.y, w, h },
      { x: zone.x, y: zone.y + h + gap, w, h },
      { x: zone.x + w + gap, y: zone.y + h + gap, w, h },
    ];
    cells.forEach((c, i) => {
      if (images[i]) drawCover(ctx, images[i] as HTMLImageElement, c.x, c.y, c.w, c.h, t.hairline);
      else emptyCell(ctx, c.x, c.y, c.w, c.h, t.tint, t.hairline);
    });
    ctx.font = `500 20px ${MONO}`;
    const listed = labels.filter(Boolean).slice(0, 4).join('  ·  ');
    drawMono(ctx, truncate(ctx, listed || 'Gallery', zone.w), zone.x, zone.y + zone.h + 36, 20, t.text, 0.12);
  }

  footer(ctx, t, projectName, brandName, page, pageCount);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** The closing page — a quiet studio sign-off. */
export async function renderClosingPage(opts: { projectName: string; brand: Brand; pageCount: number }): Promise<string> {
  const t = themeFrom(opts.brand);
  const { canvas, ctx } = newPage(t);
  const brandName = opts.brand.name || 'AND Studio';

  ctx.textAlign = 'center';
  ctx.fillStyle = t.accent;
  ctx.fillRect(DECK_PAGE_W / 2 - 46, 560, 92, 8);
  ctx.font = `300 150px ${t.serif}`;
  ctx.fillStyle = t.primary;
  ctx.fillText(truncate(ctx, brandName, DECK_PAGE_W - 400), DECK_PAGE_W / 2, 780);
  ctx.textAlign = 'left';
  ctx.font = `500 26px ${MONO}`;
  const line = 'ARCHITECTURE & DESIGN STUDIO';
  const track = 26 * 0.24;
  let width = 0;
  for (const ch of line) width += ctx.measureText(ch).width + track;
  drawMono(ctx, line, (DECK_PAGE_W - (width - track)) / 2, 880, 26, t.text, 0.24);

  footer(ctx, t, opts.projectName, brandName.toUpperCase(), opts.pageCount, opts.pageCount);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** All deck pages in order: cover, one page per slide, closing. */
export async function renderDeckPages(opts: {
  projectName: string;
  slides: Slide[]; // already ordered
  imageMap: Map<string, GeneratedImage>;
  brand: Brand;
}): Promise<string[]> {
  const { projectName, slides, imageMap, brand } = opts;
  const pageCount = slides.length + 2;
  const heroUrl = slides[0]?.imageIds.map((id) => imageMap.get(id)?.url).find(Boolean) ?? null;
  const pages: string[] = [await renderCoverPage({ projectName, brand, heroUrl, pageCount })];
  for (let i = 0; i < slides.length; i += 1) {
    pages.push(
      await renderSlidePage({
        slide: slides[i],
        imageMap,
        brand,
        projectName,
        page: i + 2,
        pageCount,
        slideNumber: i + 1,
      }),
    );
  }
  pages.push(await renderClosingPage({ projectName, brand, pageCount }));
  return pages;
}
