import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { downloadDataURL, slugify } from '../../lib/images';
import { SOCIAL_FORMATS, renderSocial } from '../../lib/socialExport';
import type { SocialFormat } from '../../lib/socialExport';
import { useDialog } from '../../lib/useDialog';
import { useProjectStore } from '../../store/useProjectStore';
import type { GeneratedImage } from '../../types';

interface SocialExportProps {
  image: GeneratedImage;
  onClose: () => void;
}

/** Crop an output to a social format with a brand footer, preview it, download it. */
export function SocialExport({ image, onClose }: SocialExportProps) {
  const ref = useDialog<HTMLDivElement>({ open: true, onClose });
  const projectName = useProjectStore((s) => s.project.name);
  const accent = useProjectStore((s) => s.project.brand.accent);
  const [format, setFormat] = useState<SocialFormat>(SOCIAL_FORMATS[0]);
  const [preview, setPreview] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    renderSocial(image.url, format, { caption: projectName, accent })
      .then((url) => {
        if (!cancelled) setPreview(url);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [image.url, format, projectName, accent]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4">
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Export for social" tabIndex={-1} className="flex max-h-[90vh] w-full max-w-lg flex-col border border-hairline bg-bone">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
          <p className="mono-meta text-ochre">Export for social</p>
          <button type="button" onClick={onClose} className="text-mist hover:text-graphite focus-visible:outline-ochre" aria-label="Close">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-1.5">
            {SOCIAL_FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={f.key === format.key}
                onClick={() => setFormat(f)}
                className={`border px-3 py-1.5 text-xs transition-colors focus-visible:outline-ochre ${
                  f.key === format.key ? 'border-ochre bg-ochre text-bone' : 'border-hairline bg-paper text-graphite hover:bg-drafting'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center border border-hairline bg-drafting p-3" style={{ minHeight: 220 }}>
            {preview ? (
              <img src={preview} alt="Social export preview" className="max-h-[52vh] w-auto object-contain" />
            ) : (
              <span className="text-xs text-mist">{rendering ? 'Rendering…' : 'Preview unavailable.'}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!preview}
              onClick={() => preview && downloadDataURL(preview, `${slugify(image.label)}-${format.key}.jpg`)}
              className="flex items-center gap-1.5 border border-ochre bg-ochre px-4 py-2 text-sm text-bone hover:bg-ochre-deep focus-visible:outline-ochre disabled:opacity-45"
            >
              <Download size={15} strokeWidth={1.75} /> Download {format.w}×{format.h}
            </button>
            <span className="text-xs text-mist">Cover-cropped with your project name in the footer.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
