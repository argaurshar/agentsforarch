// Project save/load as a single downloadable file — the no-backend answer to
// "I closed the tab and lost my work". The file embeds every image as a dataURL,
// so one .json round-trips the whole project between machines and sessions.

import type { Brand, Project } from '../types';

const FILE_KIND = 'and-studio-project';
const FILE_VERSION = 1;

interface ProjectFile {
  kind: typeof FILE_KIND;
  version: number;
  exportedAt: number;
  project: Project;
}

function safeFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'project'}.andstudio.json`;
}

/** Serialize the project and trigger a browser download. */
export function downloadProjectFile(project: Project): void {
  const payload: ProjectFile = { kind: FILE_KIND, version: FILE_VERSION, exportedAt: Date.now(), project };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename(project.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse + validate an exported project file. Throws a friendly Error on junk. */
export function parseProjectFile(text: string): Project {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not a valid project file (could not read it as JSON).');
  }
  const file = data as Partial<ProjectFile>;
  if (file.kind !== FILE_KIND || typeof file.version !== 'number' || !file.project) {
    throw new Error('That file is not an AND Studio project export.');
  }
  const p = file.project as Partial<Project> & Record<string, unknown>;
  if (typeof p.id !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.assets) || !Array.isArray(p.uploads)) {
    throw new Error('That project file is incomplete or from an incompatible version.');
  }
  // Files exported before the Concept Presentation tab was removed carry a
  // `slides` array and a brand with deck-only fields (fonts, logo, voice).
  // Import them anyway — the images are the valuable part — keeping only the
  // brand colours the mood board and social export still use, and dropping the
  // rest rather than carrying dead weight (a logo dataURL) around forever.
  const { slides: _slides, brand: rawBrand, ...rest } = p;
  const b = (typeof rawBrand === 'object' && rawBrand !== null ? rawBrand : {}) as Partial<Brand>;
  const hex = (v: unknown, fallback: string): string =>
    typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v) ? v : fallback;
  const brand: Brand = {
    primary: hex(b.primary, '#0f1729'),
    accent: hex(b.accent, '#c2410c'),
    background: hex(b.background, '#f7f2e8'),
    text: hex(b.text, '#334155'),
  };
  return { ...(rest as unknown as Project), brand };
}
