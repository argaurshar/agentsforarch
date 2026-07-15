// Image helpers: validation, dataURL conversion, resizing, id generation and
// download. Kept free of any provider or UI concern so they can be reused
// everywhere (spec §3).

export const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB (spec §8)

export type ValidationResult = { ok: true } | { ok: false; error: string };

/** Generate a short, collision-resistant id with an optional prefix. */
export function newId(prefix = 'id'): string {
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `${prefix}_${cryptoObj.randomUUID()}`;
  }
  // Fallback for very old environments — not used in modern browsers.
  return `${prefix}_${Math.abs(hashString(String(performance.now()) + prefix)).toString(36)}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/** Validate a dropped/selected file against type and size rules. */
export function validateImageFile(file: File): ValidationResult {
  const typeOk =
    (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type) ||
    ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!typeOk) {
    return { ok: false, error: 'Unsupported file. Use PNG, JPG, or WEBP.' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { ok: false, error: `File is ${mb}MB. Maximum size is 10MB.` };
  }
  return { ok: true };
}

/** Read a File into a dataURL. */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read file.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

/** Load a dataURL/URL into an HTMLImageElement. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image.'));
    img.src = src;
  });
}

/**
 * Downscale a dataURL so its longest edge is at most `maxEdge`, returning a
 * JPEG dataURL. Images already within bounds are returned unchanged. Keeps
 * canvas work in the mock provider bounded and keeps in-memory state light.
 */
export async function resizeDataURL(dataURL: string, maxEdge = 1600): Promise<string> {
  const img = await loadImage(dataURL);
  const longest = Math.max(img.width, img.height);
  if (longest <= maxEdge) {
    return dataURL;
  }
  const scale = maxEdge / longest;
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return dataURL;
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Trigger a browser download of a dataURL/URL. */
export function downloadDataURL(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Turn a free-text label into a filesystem-safe slug for downloads. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}
