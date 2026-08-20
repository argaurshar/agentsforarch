import { ChevronDown, Palette, RotateCcw, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { fileToDataURL, resizeDataURL, validateImageFile } from '../../lib/images';
import { useProjectStore } from '../../store/useProjectStore';
import type { Brand } from '../../types';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Select } from '../ui/Select';

const FONT_OPTIONS = [
  { value: 'Fraunces, Georgia, serif', label: 'Fraunces (serif)' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia (serif)' },
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (sans)' },
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica (sans)' },
  { value: '"JetBrains Mono", ui-monospace, monospace', label: 'JetBrains Mono (mono)' },
];

// Must stay identical to `makeDefaultBrand()` in store/useProjectStore.ts (it is
// module-private there): "Reset to studio default" has to write back exactly the
// brand a fresh project starts with, not a drifted copy. These are the deck's
// OWN brand values — deliberately independent of the app chrome's tokens.
const DEFAULT_BRAND: Brand = {
  name: '',
  primary: '#0f1729',
  accent: '#c2410c',
  background: '#f7f2e8',
  text: '#334155',
  headingFont: 'Fraunces, Georgia, serif',
  bodyFont: 'Inter, system-ui, sans-serif',
  voice: '',
  logo: undefined,
};

interface ColorRowProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

function ColorRow({ label, value, onChange }: ColorRowProps) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-label text-graphite">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded-control border border-hairline bg-paper p-0.5"
          aria-label={label}
        />
        {/* font-mono is legitimate here — a hex field is a code value. */}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label={`${label} hex`}
          className="w-24 rounded-field border border-hairline bg-paper px-2.5 py-1.5 font-mono text-label text-graphite"
        />
      </span>
    </label>
  );
}

export function BrandPanel() {
  const brand = useProjectStore((s) => s.project.brand);
  const setBrand = useProjectStore((s) => s.setBrand);
  const [open, setOpen] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onLogoFile = async (file: File | undefined) => {
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.ok) {
      setLogoError(check.error);
      return;
    }
    setLogoError(null);
    try {
      const raw = await fileToDataURL(file);
      const resized = await resizeDataURL(raw, 512, 'image/png'); // PNG keeps logo transparency + embeds in jsPDF
      setBrand({ logo: resized });
    } catch {
      setLogoError('Could not read that logo. Try another file.');
    }
  };

  return (
    <div className="mb-8 overflow-hidden rounded-card border border-hairline bg-paper shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-drafting"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Palette size={16} strokeWidth={1.75} className="text-mist" />
          <span className="section-heading">Brand identity</span>
          {brand.name ? <span className="text-body text-graphite">· {brand.name}</span> : null}
        </span>
        {/* One chevron that rotates — swapping two glyphs read as a different control. */}
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={`text-mist transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="grid gap-6 border-t border-hairline px-4 py-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Name + voice */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="brand-name" className="mono-meta">
                Studio / client name
              </label>
              <input
                id="brand-name"
                value={brand.name}
                onChange={(e) => setBrand({ name: e.target.value })}
                placeholder="e.g. AND Studio"
                className="rounded-field border border-hairline bg-paper px-3.5 py-2 text-body text-graphite placeholder:text-mist"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="brand-voice" className="mono-meta">
                Voice / tone
              </label>
              <textarea
                id="brand-voice"
                value={brand.voice ?? ''}
                onChange={(e) => setBrand({ voice: e.target.value })}
                rows={3}
                placeholder="e.g. warm, material-led, quietly confident"
                className="resize-none rounded-field border border-hairline bg-paper px-3.5 py-2 text-body text-graphite placeholder:text-mist"
              />
            </div>
          </div>

          {/* Palette */}
          <div className="flex flex-col gap-3">
            <span className="mono-meta">Palette</span>
            <ColorRow label="Primary" value={brand.primary} onChange={(v) => setBrand({ primary: v })} />
            <ColorRow label="Accent" value={brand.accent} onChange={(v) => setBrand({ accent: v })} />
            <ColorRow label="Background" value={brand.background} onChange={(v) => setBrand({ background: v })} />
            <ColorRow label="Text" value={brand.text} onChange={(v) => setBrand({ text: v })} />
          </div>

          {/* Type + logo */}
          <div className="flex flex-col gap-4">
            <Select
              label="Heading font"
              value={brand.headingFont}
              options={FONT_OPTIONS}
              onChange={(v) => setBrand({ headingFont: v })}
            />
            <Select
              label="Body font"
              value={brand.bodyFont}
              options={FONT_OPTIONS}
              onChange={(v) => setBrand({ bodyFont: v })}
            />
            <div className="flex flex-col gap-2">
              <span className="mono-meta">Logo</span>
              <div className="flex items-center gap-3">
                {brand.logo ? (
                  <span className="flex h-10 w-16 items-center justify-center rounded-control border border-hairline bg-drafting">
                    <img src={brand.logo} alt="Brand logo" className="max-h-8 max-w-full object-contain" />
                  </span>
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void onLogoFile(e.target.files?.[0])}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Upload size={14} strokeWidth={1.75} />}
                  onClick={() => fileRef.current?.click()}
                >
                  {brand.logo ? 'Replace' : 'Upload'}
                </Button>
                {brand.logo ? (
                  <IconButton
                    icon={<X size={16} strokeWidth={1.75} />}
                    label="Remove logo"
                    tone="danger"
                    onClick={() => setBrand({ logo: undefined })}
                  />
                ) : null}
              </div>
              {logoError ? <p className="text-caption text-danger">{logoError}</p> : null}
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={14} strokeWidth={1.75} />}
              onClick={() => setBrand(DEFAULT_BRAND)}
              className="w-fit"
            >
              Reset to studio default
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
