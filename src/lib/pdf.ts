import { jsPDF } from 'jspdf';
import type { GeneratedImage, Slide, SlideLayout } from '../types';
import { slugify } from './images';

// A4 landscape in points.
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 48;
const GAP = 16;

// Palette (spec §4) as RGB tuples for jsPDF.
const BONE: [number, number, number] = [247, 242, 232];
const INK: [number, number, number] = [15, 23, 41];
const GRAPHITE: [number, number, number] = [51, 65, 85];
const OCHRE: [number, number, number] = [194, 65, 12];
const HAIRLINE: [number, number, number] = [216, 209, 192];

const CAPACITY: Record<SlideLayout, number> = {
  full: 1,
  'two-up': 2,
  'four-grid': 4,
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function cellsForLayout(layout: SlideLayout, area: Rect): Rect[] {
  if (layout === 'full') {
    return [area];
  }
  if (layout === 'two-up') {
    const w = (area.w - GAP) / 2;
    return [
      { x: area.x, y: area.y, w, h: area.h },
      { x: area.x + w + GAP, y: area.y, w, h: area.h },
    ];
  }
  // four-grid (2×2)
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

/** Contain-fit an image of natural size (iw,ih) inside a cell. */
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
}

/**
 * Export the presentation to A4-landscape PDF: one slide per page, Bone
 * background, images placed per layout, serif title, mono caption, and the
 * studio footer line (spec §8.04).
 */
export function exportPresentationPdf({ projectName, slides, imageMap }: ExportOptions): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  slides.forEach((slide, index) => {
    if (index > 0) doc.addPage();

    // Bone background.
    doc.setFillColor(...BONE);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    let contentTop = MARGIN;

    // Title (serif).
    if (slide.title) {
      doc.setFont('times', 'normal');
      doc.setFontSize(22);
      doc.setTextColor(...INK);
      doc.text(slide.title, MARGIN, MARGIN + 16);
      contentTop = MARGIN + 34;
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
        // Hairline frame around the placed image.
        doc.setDrawColor(...HAIRLINE);
        doc.setLineWidth(0.75);
        doc.rect(placed.x, placed.y, placed.w, placed.h, 'S');
      } catch {
        // Skip any image jsPDF can't decode rather than aborting the export.
      }
    }

    // Caption (mono).
    if (slide.caption) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRAPHITE);
      doc.text(slide.caption.toUpperCase(), MARGIN, PAGE_H - MARGIN - 20);
    }

    // Footer line.
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...OCHRE);
    doc.text('AND STUDIO  ·  CONCEPT PRESENTATION', MARGIN, PAGE_H - MARGIN);
  });

  doc.save(`${slugify(projectName || 'presentation')}.pdf`);
}
