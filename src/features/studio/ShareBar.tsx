import { Check, Link2, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { BRAND, siteUrl } from '../../lib/brand';
import { slugify } from '../../lib/images';
import { copyText, shareImage } from '../../lib/share';
import { canvasBlob, renderShareCard } from '../../lib/shareCard';
import type { FeatureKind } from '../../types';
import { remixHash } from './remix';

interface ShareBarProps {
  feature: FeatureKind;
  /** The transformation in the registry's words — the card's headline. */
  verb: string;
  before: string;
  after: string;
  /** Bundled asset the input came from, so the link can reproduce this exact
   *  result for a stranger with no key. Null for a user's own image. */
  source: string | null;
  /** True when this pair is a prepared example rather than a live run. */
  prepared: boolean;
}

/**
 * Two buttons: send the picture, or send the link.
 *
 * They are different things and both are wanted. The PICTURE is what gets
 * looked at — a before/after pair needs no explanation in a group chat. The
 * LINK is what gets acted on, and when the input was one of ours it opens on
 * this very result, for free, for whoever taps it.
 *
 * When the input is the user's own image the link cannot carry it — it is
 * theirs, and it is megabytes — so it carries the tool instead, and the
 * recipient's first drop goes straight to the same transformation.
 */
export function ShareBar({ feature, verb, before, after, source, prepared }: ShareBarProps) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const url = `${siteUrl()}${remixHash(feature, source)}`;

  const share = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const canvas = await renderShareCard({ before, after, verb, url, prepared });
      // Both encodings up front: the clipboard path cannot take the JPEG, and
      // asking for a second render after a failed share would have lost the
      // user gesture the clipboard needs.
      const [jpeg, png] = await Promise.all([canvasBlob(canvas, 'image/jpeg'), canvasBlob(canvas, 'image/png')]);
      const outcome = await shareImage({
        jpeg,
        png,
        filename: `${slugify(`${BRAND.name} ${verb}`)}.jpg`,
        title: `${verb} · ${BRAND.name}`,
        text: `${verb}. ${BRAND.promise}`,
        url,
      });
      if (outcome === 'copied') setStatus('Card copied — paste it anywhere.');
      else if (outcome === 'downloaded') {
        await copyText(url);
        setStatus('Card saved, and the link is on your clipboard.');
      } else if (outcome === 'failed') {
        await copyText(url);
        setStatus('Could not save the card here. The link is copied instead.');
      }
      // 'shared' and 'cancelled' say nothing: the OS sheet already did.
    } catch {
      // The one real failure mode is a tainted canvas — an output served from a
      // remote engine URL rather than a dataURL poisons `toBlob`. The link is
      // still perfectly shareable, so that is what happens instead of an error.
      await copyText(url);
      setStatus('The image could not be composed here, so the link is copied instead.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    const ok = await copyText(url);
    setCopied(ok);
    setStatus(ok ? null : 'Could not reach the clipboard. The link is in the address bar.');
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          icon={<Share2 size={16} strokeWidth={1.75} />}
          onClick={() => void share()}
          disabled={busy}
          data-share
        >
          {busy ? 'Composing…' : 'Share'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={copied ? <Check size={14} strokeWidth={2} /> : <Link2 size={14} strokeWidth={1.75} />}
          onClick={() => void copyLink()}
          data-share-link
        >
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
      </div>
      {status ? (
        <p className="text-caption text-mist" data-share-status>
          {status}
        </p>
      ) : null}
      <p className="text-caption text-mist">
        {source
          ? 'The link opens on this exact result — no key, no upload.'
          : 'Your image stays here. The link carries the tool, so whoever opens it starts one click from the same thing.'}
      </p>
    </div>
  );
}
