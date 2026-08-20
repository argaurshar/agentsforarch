import { jsPDF } from 'jspdf';
import type { Brand, GeneratedImage, Slide } from '../types';
import { DECK_PAGE_H, DECK_PAGE_W, renderDeckPages } from './deckRender';
import { slugify } from './images';

// A4 landscape in points.
const PAGE_W = 841.89;
const PAGE_H = 595.28;

interface ExportOptions {
  projectName: string;
  slides: Slide[]; // already ordered
  imageMap: Map<string, GeneratedImage>;
  brand: Brand;
}

/**
 * Export the presentation to an A4-landscape PDF. Every page — cover, one
 * editorial page per slide, and a closing sign-off — is drawn by the deck
 * renderer (src/lib/deckRender.ts) in the project's brand identity with real
 * fonts, then placed full-bleed into the PDF, so the exported file matches the
 * on-screen slide preview exactly (spec §8.04).
 */
export async function exportPresentationPdf({ projectName, slides, imageMap, brand }: ExportOptions): Promise<void> {
  const pages = await renderDeckPages({ projectName, slides, imageMap, brand });
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  pages.forEach((page, index) => {
    if (index > 0) doc.addPage();
    doc.addImage(page, 'JPEG', 0, 0, PAGE_W, PAGE_H, undefined, 'FAST', 0);
  });
  doc.save(`${slugify(projectName || 'presentation')}.pdf`);
}

export { DECK_PAGE_H, DECK_PAGE_W };
