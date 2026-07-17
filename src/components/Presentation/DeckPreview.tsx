import { Download, ExternalLink, Printer, RefreshCw, X } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { PRINT_MESSAGE, injectPrintBridge, makeViewerBlobUrl } from '../../lib/deckViewer';
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
 * Renders a generated frontend-slides deck in a SANDBOXED iframe with the
 * natural post-generation actions: download the single HTML file, open it in a
 * new tab, or print it to PDF.
 *
 * Security: the deck's JavaScript is model-authored (from brand voice, talking
 * points, image labels), so the iframe is sandboxed WITHOUT `allow-same-origin`
 * — the deck runs at an opaque origin and cannot reach `window.parent` or the
 * API keys the app stores in localStorage. Printing is done via a postMessage
 * bridge injected only into the preview (see lib/deckViewer.ts); the downloaded
 * file stays pristine.
 */
export function DeckPreview({ html, projectName, onRegenerate, onClear, regenerating = false }: DeckPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Preview HTML carries the print bridge; the download does not.
  const previewHtml = useMemo(() => injectPrintBridge(html), [html]);

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    downloadDataURL(url, `${slugify(projectName || 'presentation')}.html`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpen = () => {
    const url = makeViewerBlobUrl(html);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handlePrint = () => {
    // Cross-origin (sandboxed): postMessage is allowed even though reading the
    // frame's DOM is not — the injected bridge calls the deck's own print().
    iframeRef.current?.contentWindow?.postMessage(PRINT_MESSAGE, '*');
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
          srcDoc={previewHtml}
          className="h-full w-full"
          sandbox="allow-scripts allow-modals allow-popups allow-downloads"
        />
      </div>

      <p className="text-[0.7rem] text-mist">
        Navigate with arrow keys, space, or swipe. “Print / PDF” prints one 16:9 slide per page — choose “Save as PDF”.
      </p>
    </div>
  );
}
