import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { downloadDataURL, slugify } from '../../lib/images';
import { SOCIAL_FORMATS, renderSocial } from '../../lib/socialExport';
import type { SocialFormat } from '../../lib/socialExport';
import { useDialog } from '../../lib/useDialog';
import { useProjectStore } from '../../store/useProjectStore';
import type { GeneratedImage } from '../../types';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';
import { IconButton } from '../ui/IconButton';

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
  // Bumped by the retry action so a failed render can be re-run.
  const [attempt, setAttempt] = useState(0);

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
  }, [image.url, format, projectName, accent, attempt]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Export for social" tabIndex={-1} className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-hairline bg-paper shadow-card-lg">
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
          <p className="font-display text-title font-semibold text-ink">Export for social</p>
          <IconButton icon={<X size={16} strokeWidth={1.75} />} label="Close" onClick={onClose} />
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-wrap gap-2">
            {SOCIAL_FORMATS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={f.key === format.key}
                onClick={() => setFormat(f)}
                // Small filled chips take the deep ochre: white on plain ochre
                // is only AA at >=18.66px semibold.
                className={`pill border px-3.5 py-1.5 text-label font-medium transition-colors active:scale-[0.98] ${
                  f.key === format.key
                    ? 'border-ochre-deep bg-ochre-deep text-white'
                    : 'border-hairline bg-paper text-graphite hover:border-mist/40 hover:bg-drafting'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center rounded-field border border-hairline bg-drafting p-3" style={{ minHeight: 220 }}>
            {preview ? (
              <img src={preview} alt="Social export preview" className="max-h-[52vh] w-auto object-contain" />
            ) : rendering ? (
              // Placeholder at the target ratio so the dialog does not resize
              // when the render lands.
              <div
                className="w-full max-w-[16rem] animate-pulse rounded-field bg-hairline"
                style={{ aspectRatio: `${format.w} / ${format.h}` }}
                aria-hidden="true"
              />
            ) : (
              <ErrorBanner message="Preview unavailable." onRetry={() => setAttempt((n) => n + 1)} />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              icon={<Download size={15} strokeWidth={1.75} />}
              disabled={!preview}
              onClick={() => preview && downloadDataURL(preview, `${slugify(image.label)}-${format.key}.jpg`)}
            >
              Download {format.w}×{format.h}
            </Button>
            <span className="text-caption text-graphite">Cover-cropped with your project name in the footer.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
