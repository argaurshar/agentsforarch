import { ImageUp, RefreshCw, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { MAX_FILE_SIZE_BYTES, fileToDataURL, resizeDataURL } from '../../lib/images';
import { Spinner } from '../ui/Spinner';

interface ImageDropzoneProps {
  value: string | null;
  onImage: (dataURL: string) => void;
  onClear: () => void;
  hint?: string;
}

const ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

function describeRejection(rejections: FileRejection[]): string {
  const code = rejections[0]?.errors[0]?.code;
  if (code === 'file-too-large') return 'File is too large. Maximum size is 10MB.';
  if (code === 'file-invalid-type') return 'Unsupported file. Use PNG, JPG, or WEBP.';
  if (code === 'too-many-files') return 'Drop a single image at a time.';
  return 'Could not accept that file. Use a PNG, JPG, or WEBP under 10MB.';
}

export function ImageDropzone({ value, onImage, onClear, hint }: ImageDropzoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const onDropAccepted = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError(null);
      setProcessing(true);
      try {
        const raw = await fileToDataURL(file);
        const resized = await resizeDataURL(raw);
        onImage(resized);
      } catch {
        setError('Could not read that image. Try another file.');
      } finally {
        setProcessing(false);
      }
    },
    [onImage],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    setError(describeRejection(rejections));
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPT,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
    noClick: value !== null, // once an image exists, clicking the preview shouldn't reopen
    onDropAccepted,
    onDropRejected,
  });

  if (value) {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative border border-hairline bg-drafting">
          <img src={value} alt="Uploaded input" className="max-h-72 w-full object-contain" />
          {processing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bone/80">
              <Spinner size={22} className="text-ochre" />
              <p className="text-sm text-graphite">Processing image…</p>
            </div>
          ) : null}
          <div className="absolute right-0 top-0 flex">
            <button
              type="button"
              onClick={open}
              className="flex items-center gap-1.5 bg-ink/85 px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-bone hover:bg-ink"
            >
              <RefreshCw size={13} strokeWidth={1.75} /> Replace
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                onClear();
              }}
              className="flex items-center bg-ink/85 px-2.5 py-2 text-bone hover:bg-ink"
              aria-label="Remove image"
            >
              <X size={15} strokeWidth={1.75} />
            </button>
          </div>
          {/* Hidden input so Replace can open the picker. */}
          <input {...getInputProps()} />
        </div>
        {error ? <p className="text-xs text-ochre">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center border border-dashed px-8 py-14 text-center transition-colors ${
          isDragActive ? 'border-ochre bg-drafting' : 'border-hairline bg-paper hover:border-mist'
        }`}
      >
        <input {...getInputProps()} />
        {processing ? (
          <>
            <Spinner size={22} className="text-ochre" />
            <p className="mt-4 text-sm text-graphite">Processing image…</p>
          </>
        ) : (
          <>
            <ImageUp size={28} strokeWidth={1} className="text-mist" />
            <p className="mt-4 text-sm text-graphite">
              {isDragActive ? 'Drop to upload' : 'Drag an image here, or click to browse'}
            </p>
            <p className="mono-meta mt-3 text-mist">PNG · JPG · WEBP · max 10MB</p>
            {hint ? <p className="mt-3 max-w-sm text-xs leading-relaxed text-mist">{hint}</p> : null}
          </>
        )}
      </div>
      {error ? <p className="text-xs text-ochre">{error}</p> : null}
    </div>
  );
}
