import { Camera, ImageUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { MAX_FILE_SIZE_BYTES, fileToDataURL, resizeDataURL } from '../../lib/images';
import { STUDIO_SAMPLES, sampleUrl } from './samples';
import type { StudioSample } from './samples';
import { loadExampleInput } from '../../lib/examples';
import { toolsWithoutImage } from '../registry';
import { useProjectStore } from '../../store/useProjectStore';

const ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

function describeRejection(rejections: FileRejection[]): string {
  const code = rejections[0]?.errors[0]?.code;
  if (code === 'file-too-large') return 'That image is over 10MB. Try a smaller one.';
  if (code === 'file-invalid-type') return 'That file is not an image. Use a PNG, JPG or WEBP.';
  if (code === 'too-many-files') return 'One image at a time.';
  return 'Could not read that file. Use a PNG, JPG or WEBP under 10MB.';
}

interface StudioDropProps {
  /** Called with the image and, when a sample was used, the kind it is known to
   *  be plus the asset it came from — which lets the caller skip guessing, and
   *  lets the result be served from the bundled pair instead of generated. */
  onImage: (dataURL: string, knownKind?: StudioSample['kind'], source?: string) => void;
}

/**
 * The front door: one sentence, two buttons, four samples.
 *
 * Everything else the old dashboard put here — the project name, the pipeline
 * map, the three-step card, the tool categories — is gone from this screen. The
 * only question is "what do you have?", and the only ways to answer it are the
 * three a person actually uses: drag it, pick it, or shoot it.
 *
 * Paste is bound at the document while this is mounted, because the fastest way
 * to get a Google Earth grab into a browser is Cmd-V and no affordance in any
 * app announces it.
 */
export function StudioDrop({ onImage }: StudioDropProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'file' | 'sample' | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const setTab = useProjectStore((s) => s.setTab);

  // 2048px lossless, matching the shared dropzone: these are line drawings
  // headed for a vision model, and hairline walls do not survive JPEG.
  const accept = useCallback(
    async (file: File) => {
      setError(null);
      setBusy('file');
      try {
        onImage(await resizeDataURL(await fileToDataURL(file), 2048, 'image/png'));
      } catch {
        setError('Could not read that image. Try another file.');
      } finally {
        setBusy(null);
      }
    },
    [onImage],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
    onDropAccepted: (files) => void (files[0] && accept(files[0])),
    onDropRejected: (r) => setError(describeRejection(r)),
  });

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (!file) return;
      e.preventDefault();
      void accept(file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [accept]);

  const trySample = async (sample: StudioSample) => {
    setError(null);
    setBusy('sample');
    try {
      onImage(await loadExampleInput(sampleUrl(sample)), sample.kind, sample.file);
    } catch {
      setError('Could not load that sample. Check your connection.');
    } finally {
      setBusy(null);
    }
  };

  const textOnly = toolsWithoutImage();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div
        {...getRootProps()}
        data-studio-drop
        className={`flex cursor-pointer flex-col items-center justify-center gap-5 rounded-card border border-dashed px-6 py-14 text-center transition-colors sm:py-20 ${
          isDragActive ? 'border-ochre bg-drafting' : 'border-hairline bg-paper hover:border-mist'
        }`}
      >
        <input {...getInputProps()} />
        {busy ? (
          <>
            <Spinner size={24} className="text-ochre" />
            <p className="text-body text-graphite">{busy === 'sample' ? 'Loading the sample…' : 'Reading your image…'}</p>
          </>
        ) : (
          <>
            <ImageUp size={26} strokeWidth={1.5} className="text-mist" />
            <h1 className="max-w-lg font-display text-display-lg text-ink sm:text-display-xl">
              {isDragActive ? 'Drop it' : 'Drop a plan, a sketch, or a photo of a room.'}
            </h1>
            <p className="text-body text-mist">Drag it here, paste it, or pick a file · PNG, JPG, WEBP up to 10MB</p>
            {/* stopPropagation so these do not also trigger the dropzone's own
                click-to-browse — two file pickers open otherwise. */}
            <div className="flex flex-wrap items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="primary"
                icon={<Camera size={16} strokeWidth={1.75} />}
                onClick={() => cameraRef.current?.click()}
              >
                Take a photo
              </Button>
              <Button variant="secondary" onClick={open}>
                Choose a file
              </Button>
            </div>
          </>
        )}
        {/* `capture` asks a phone for the rear camera and is ignored on desktop,
            where this stays a plain file picker. */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void accept(file);
          }}
        />
      </div>

      {error ? <p className="text-body text-danger">{error}</p> : null}

      <div className="flex flex-col gap-3">
        <p className="text-caption text-mist">Or start from one of ours</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STUDIO_SAMPLES.map((sample) => (
            <button
              key={sample.file}
              type="button"
              data-sample={sample.kind}
              disabled={busy !== null}
              onClick={() => void trySample(sample)}
              className="group flex flex-col overflow-hidden rounded-card border border-hairline bg-paper text-left transition-colors hover:border-mist disabled:opacity-60"
            >
              <img
                src={sampleUrl(sample)}
                alt={sample.label}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <span className="px-3 py-2 text-caption text-graphite">{sample.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* The one tool that needs no image at all. It has nowhere else to live on
          a screen whose organising idea is "what did you drop?". */}
      {textOnly.length > 0 ? (
        <p className="text-body text-mist">
          No image yet?{' '}
          {textOnly.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTab(f.key)}
              className="rounded-control text-ochre-deep underline decoration-ochre/40 underline-offset-2 transition-colors hover:decoration-ochre-deep"
            >
              {f.verb.toLowerCase()}
            </button>
          ))}{' '}
          — describe the project in words and get a massing study back.
        </p>
      ) : null}
    </div>
  );
}
