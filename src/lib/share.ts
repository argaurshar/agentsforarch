// Getting an image out of the tab and into somebody else's hands.
//
// Three paths, tried in order, because no single one works everywhere:
//
//   1. `navigator.share` with a file — phones. One tap and the OS sheet opens
//      on WhatsApp, Messages, AirDrop, the lot. This is the path that matters,
//      and it is the only one that exists on iOS Safari.
//   2. The clipboard — desktop Chrome and Edge, where there is no share sheet
//      but paste-into-Slack is the actual behaviour. PNG only: no browser
//      accepts a JPEG in `ClipboardItem`, which is why the card is encoded
//      twice.
//   3. A download — Firefox, older Safari, anything locked down. Not elegant,
//      but it never fails, so nobody reaches a dead end.
//
// Every step is guarded rather than feature-detected once, because the detects
// lie: Chrome defines `navigator.share` on desktop and then rejects files, and
// `ClipboardItem` exists in browsers whose permission prompt is denied by
// policy. The only honest test is to try it.

export type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'failed';

export interface ShareImageOpts {
  /** JPEG, for the share sheet and the download — small enough to send. */
  jpeg: Blob;
  /** PNG, for the clipboard, which accepts nothing else. */
  png: Blob;
  filename: string;
  title: string;
  /** The sentence that rides along in the message body. */
  text: string;
  url: string;
}

/** Did the user dismiss the OS share sheet? That is not a failure to fall back
 *  from — falling back would download a file they just declined to send. */
function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'NotAllowedError');
}

export async function shareImage(opts: ShareImageOpts): Promise<ShareOutcome> {
  const file = new File([opts.jpeg], opts.filename, { type: 'image/jpeg' });

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: opts.title, text: `${opts.text} ${opts.url}` });
      return 'shared';
    } catch (err) {
      if (isAbort(err)) return 'cancelled';
      // Anything else — a share target that rejected the file, a policy block —
      // falls through to the paths below rather than surfacing an error the
      // user cannot act on.
    }
  }

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': opts.png })]);
      return 'copied';
    } catch {
      // Denied permission, insecure context, or no user gesture left.
    }
  }

  try {
    const href = URL.createObjectURL(opts.jpeg);
    const a = document.createElement('a');
    a.href = href;
    a.download = opts.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoked on the next frame: revoking synchronously races the download in
    // Safari, which reads the object URL after the click handler returns.
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

/** Put a link on the clipboard. Falls back to the deprecated `execCommand` path
 *  because Safari below 13.4 and every non-secure context still need it. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through.
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
