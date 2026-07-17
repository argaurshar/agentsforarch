// Helpers for viewing a generated deck WITHOUT giving its (model-authored)
// JavaScript access to the app's origin. The preview/new-tab iframes are
// sandboxed WITHOUT `allow-same-origin`, so the deck runs at an opaque origin
// and cannot read the API keys the app keeps in localStorage.

// The deck's inline JS can't call the parent's print() across the sandbox
// boundary, so we inject a tiny app-authored bridge into the PREVIEWED html
// only (the downloaded file stays pristine): the parent posts a message and the
// deck prints itself.
const PRINT_BRIDGE =
  "<script>addEventListener('message',function(e){if(e.data==='and-studio:print'){window.print();}});</script>";

export const PRINT_MESSAGE = 'and-studio:print';

/** Append the print bridge just before </body> (or at the end as a fallback). */
export function injectPrintBridge(html: string): string {
  const idx = html.toLowerCase().lastIndexOf('</body>');
  if (idx === -1) return html + PRINT_BRIDGE;
  return html.slice(0, idx) + PRINT_BRIDGE + html.slice(idx);
}

/**
 * A blob URL for "Open in new tab": an app-authored wrapper page that hosts the
 * deck in a *sandboxed* inner iframe. A raw blob of the deck would run at the
 * app's own origin (same key-leak surface as an unsandboxed iframe); this keeps
 * the deck opaque-origin even in its own tab.
 */
export function makeViewerBlobUrl(html: string): string {
  // Escape </script> so the deck's own scripts can't terminate our wrapper's.
  const json = JSON.stringify(injectPrintBridge(html)).replace(/<\/script/gi, '<\\/script');
  const wrapper =
    '<!doctype html><html><head><meta charset="utf-8"><title>Presentation</title>' +
    '<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100vw;height:100vh;display:block}</style>' +
    '</head><body><iframe sandbox="allow-scripts allow-modals"></iframe>' +
    `<script>document.querySelector('iframe').srcdoc=${json};</script></body></html>`;
  return URL.createObjectURL(new Blob([wrapper], { type: 'text/html' }));
}
