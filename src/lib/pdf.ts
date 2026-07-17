import { jsPDF } from 'jspdf';
import type { Brand, GeneratedImage, Slide, SlideLayout } from '../types';
import { slugify } from './images';

// A4 landscape in points.
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 48;
const GAP = 16;

const HAIRLINE: [number, number, number] = [216, 209, 192];

const CAPACITY: Record<SlideLayout, number> = {
  full: 1,
  'two-up': 2,
  'four-grid': 4,
};

type Rgb = [number, number, number];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function hexToRgb(hex: string, fallback: Rgb): Rgb {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return fallback;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const int = parseInt(h, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Map a CSS font-family stack to the closest jsPDF built-in font. */
function pdfFont(family: string): 'times' | 'helvetica' | 'courier' {
  const f = (family || '').toLowerCase();
  if (/mono|courier|consol|jetbrains/.test(f)) return 'courier';
  if (/sans|inter|helvetica|arial|grotesk|roboto|system-ui/.test(f)) return 'helvetica';
  if (/serif|fraunces|georgia|times|garamond|playfair|cambria|slab/.test(f)) return 'times';
  return 'helvetica';
}

function cellsForLayout(layout: SlideLayout, area: Rect): Rect[] {
  if (layout === 'full') return [area];
  if (layout === 'two-up') {
    const w = (area.w - GAP) / 2;
    return [
      { x: area.x, y: area.y, w, h: area.h },
      { x: area.x + w + GAP, y: area.y, w, h: area.h },
    ];
  }
  const w = (area.w - GAP) / 2;
  const h = (area.h - GAP) / 2;
  return [
    { x: area.x, y: area.y, w, h },
    { x: area.x + w + GAP, y: area.y, w, h },
    { x: area.x, y: area.y + h + GAP, w, h },
    { x: area.x + w + GAP, y: area.y + h + GAP, w, h },
  ];
}

function detectFormat(url: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (url.startsWith('data:image/png')) return 'PNG';
  if (url.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

function containRect(cell: Rect, iw: number, ih: number): Rect {
  if (iw <= 0 || ih <= 0) return cell;
  const scale = Math.min(cell.w / iw, cell.h / ih);
  const w = iw * scale;
  const h = ih * scale;
  return { x: cell.x + (cell.w - w) / 2, y: cell.y + (cell.h - h) / 2, w, h };
}

interface ExportOptions {
  projectName: string;
  slides: Slide[]; // already ordered
  imageMap: Map<string, GeneratedImage>;
  brand: Brand;
}

/**
 * Export the presentation to A4-landscape PDF in the project's brand identity:
 * one slide per page, brand background, images placed per layout, brand fonts,
 * a logo, and the studio footer line (spec §8.04).
 */
export function exportPresentationPdf({ projectName, slides, imageMap, brand }: ExportOptions): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  const bg = hexToRgb(brand.background, [247, 242, 232]);
  const titleColor = hexToRgb(brand.primary, [15, 23, 41]);
  const textColor = hexToRgb(brand.text, [51, 65, 85]);
  const accent = hexToRgb(brand.accent, [194, 65, 12]);
  const headingFont = pdfFont(brand.headingFont);
  const bodyFont = pdfFont(brand.bodyFont);
  const footerName = (brand.name || 'AND STUDIO').toUpperCase();

  slides.forEach((slide, index) => {
    if (index > 0) doc.addPage();

    // Brand background.
    doc.setFillColor(...bg);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    let contentTop = MARGIN;

    // Logo, top-right.
    if (brand.logo) {
      try {
        const props = doc.getImageProperties(brand.logo);
        const h = 22;
        const w = props.height > 0 ? (props.width / props.height) * h : h;
        doc.addImage(brand.logo, detectFormat(brand.logo), PAGE_W - MARGIN - w, MARGIN - 6, w, h);
        contentTop = Math.max(contentTop, MARGIN + 24);
      } catch {
        /* skip an undecodable logo */
      }
    }

    // Title (wrapped so a long title never runs off the page or into the logo).
    if (slide.title) {
      doc.setFont(headingFont, 'normal');
      doc.setFontSize(22);
      doc.setTextColor(...titleColor);
      const titleWidth = PAGE_W - MARGIN * 2 - (brand.logo ? 120 : 0);
      const lines = doc.splitTextToSize(slide.title, titleWidth).slice(0, 2);
      doc.text(lines, MARGIN, MARGIN + 16);
      contentTop = Math.max(contentTop, MARGIN + 34 + (lines.length - 1) * 24);
    }

    const contentBottom = PAGE_H - MARGIN - (slide.caption ? 44 : 26);
    const area: Rect = {
      x: MARGIN,
      y: contentTop,
      w: PAGE_W - MARGIN * 2,
      h: Math.max(40, contentBottom - contentTop),
    };

    // Images per layout.
    const cells = cellsForLayout(slide.layout, area);
    const count = Math.min(slide.imageIds.length, CAPACITY[slide.layout]);
    for (let i = 0; i < count; i += 1) {
      const image = imageMap.get(slide.imageIds[i]);
      const cell = cells[i];
      if (!image || !cell) continue;
      try {
        const props = doc.getImageProperties(image.url);
        const placed = containRect(cell, props.width, props.height);
        doc.addImage(image.url, detectFormat(image.url), placed.x, placed.y, placed.w, placed.h);
        doc.setDrawColor(...HAIRLINE);
        doc.setLineWidth(0.75);
        doc.rect(placed.x, placed.y, placed.w, placed.h, 'S');
      } catch {
        /* skip an image jsPDF can't decode */
      }
    }

    // Caption (brand body font).
    if (slide.caption) {
      doc.setFont(bodyFont, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      const lines = doc.splitTextToSize(slide.caption, PAGE_W - MARGIN * 2 - 220);
      doc.text(lines.slice(0, 2), MARGIN, PAGE_H - MARGIN - 20);
    }

    // Footer line (brand accent).
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...accent);
    doc.text(`${footerName}  ·  CONCEPT PRESENTATION`, MARGIN, PAGE_H - MARGIN);
  });

  doc.save(`${slugify(projectName || 'presentation')}.pdf`);
}
