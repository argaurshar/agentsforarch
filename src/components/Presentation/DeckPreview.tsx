import { Download, ExternalLink, Printer, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { downloadDataURL, slugify } from '../../lib/images';
import { Button } from '../ui/Button';

interface DeckPreviewProps {
  html: string;
  projectName: string;
  onRegenerate: () => void;
  onClear: () => void;
  regenerating?: boolean;
}

/**
 * Renders a generated frontend-slides deck in a sandboxed iframe with the
 * natural post-generation actions: download the single HTML file, open it in a
 * new tab, or print it to PDF (the deck's own @media print rules lay out one
 * 16:9 slide per page). `allow-same-origin` lets the deck's inline JS, fonts,
 * and its own edit mode run; the content is generated from the user's own
 * inputs via their own key.
 */
export function DeckPreview({ html, projectName, onRegenerate, onClear, regenerating = false }: DeckPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const makeBlobUrl = (): string => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    blobUrlRef.current = url;
    return url;
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    downloadDataURL(url, `${slugify(projectName || 'presentation')}.html`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpen = () => {
    window.open(makeBlobUrl(), '_blank', 'noopener');
  };

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          icon={<RefreshCw size={14} strokeWidth={1.75} />}
          onClick={onRegenerate}
          loading={regenerating}
        >
          {regenerating ? 'Regenerating…' : 'Regenerate'}
        </Button>
        <Button size="sm" icon={<Download size={14} strokeWidth={1.75} />} onClick={handleDownload}>
          Download HTML
        </Button>
        <Button size="sm" icon={<ExternalLink size={14} strokeWidth={1.75} />} onClick={handleOpen}>
          Open
        </Button>
        <Button size="sm" icon={<Printer size={14} strokeWidth={1.75} />} onClick={handlePrint}>
          Print / PDF
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<X size={14} strokeWidth={1.75} />}
          onClick={onClear}
          className="ml-auto"
        >
          Clear
        </Button>
      </div>

      <div className="w-full overflow-hidden border border-hairline bg-black" style={{ aspectRatio: '16 / 9' }}>
        <iframe
          ref={iframeRef}
          title="Generated presentation"
          srcDoc={html}
          className="h-full w-full"
          sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-downloads"
        />
      </div>

      <p className="text-[0.7rem] text-mist">
        Navigate with arrow keys, space, or swipe. “Print / PDF” prints one 16:9 slide per page — choose “Save as PDF”.
      </p>
    </div>
  );
}
