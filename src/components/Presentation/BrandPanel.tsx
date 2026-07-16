import { ChevronDown, ChevronRight, Palette, RotateCcw, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { fileToDataURL, resizeDataURL, validateImageFile } from '../../lib/images';
import { useProjectStore } from '../../store/useProjectStore';
import type { Brand } from '../../types';
import { Select } from '../ui/Select';

const FONT_OPTIONS = [
  { value: 'Fraunces, Georgia, serif', label: 'Fraunces (serif)' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia (serif)' },
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (sans)' },
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica (sans)' },
  { value: '"JetBrains Mono", ui-monospace, monospace', label: 'JetBrains Mono (mono)' },
];

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
      <span className="text-xs text-graphite">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer border border-hairline bg-paper p-0.5"
          aria-label={label}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label={`${label} hex`}
          className="w-20 border border-hairline bg-paper px-2 py-1 font-mono text-xs text-graphite focus-visible:outline-ochre"
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
      const resized = await resizeDataURL(raw, 512);
      setBrand({ logo: resized });
    } catch {
      setLogoError('Could not read that logo. Try another file.');
    }
  };

  return (
    <div className="mb-8 border border-hairline bg-paper">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left focus-visible:outline-ochre"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Palette size={15} strokeWidth={1.75} className="text-ochre" />
          <span className="mono-meta">Brand Identity</span>
          {brand.name ? <span className="text-sm text-graphite">· {brand.name}</span> : null}
        </span>
        {open ? (
          <ChevronDown size={16} strokeWidth={1.75} className="text-mist" />
        ) : (
          <ChevronRight size={16} strokeWidth={1.75} className="text-mist" />
        )}
      </button>

      {open ? (
        <div className="grid gap-6 border-t border-hairline px-4 py-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Name + voice */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="brand-name" className="mono-meta">
                Studio / client name
              </label>
              <input
                id="brand-name"
                value={brand.name}
                onChange={(e) => setBrand({ name: e.target.value })}
                placeholder="e.g. AND Studio"
                className="border border-hairline bg-paper px-3 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="brand-voice" className="mono-meta">
                Voice / tone
              </label>
              <textarea
                id="brand-voice"
                value={brand.voice ?? ''}
                onChange={(e) => setBrand({ voice: e.target.value })}
                rows={3}
                placeholder="e.g. warm, material-led, quietly confident"
                className="resize-none border border-hairline bg-paper px-3 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
              />
            </div>
          </div>

          {/* Palette */}
          <div className="flex flex-col gap-2">
            <span className="mono-meta">Palette</span>
            <ColorRow label="Primary" value={brand.primary} onChange={(v) => setBrand({ primary: v })} />
            <ColorRow label="Accent" value={brand.accent} onChange={(v) => setBrand({ accent: v })} />
            <ColorRow label="Background" value={brand.background} onChange={(v) => setBrand({ background: v })} />
            <ColorRow label="Text" value={brand.text} onChange={(v) => setBrand({ text: v })} />
          </div>

          {/* Type + logo */}
          <div className="flex flex-col gap-3">
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
            <div className="flex flex-col gap-1.5">
              <span className="mono-meta">Logo</span>
              <div className="flex items-center gap-3">
                {brand.logo ? (
                  <span className="flex h-10 w-16 items-center justify-center border border-hairline bg-drafting">
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
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 border border-hairline bg-paper px-3 py-1.5 text-xs text-graphite hover:bg-drafting focus-visible:outline-ochre"
                >
                  <Upload size={13} strokeWidth={1.75} /> {brand.logo ? 'Replace' : 'Upload'}
                </button>
                {brand.logo ? (
                  <button
                    type="button"
                    onClick={() => setBrand({ logo: undefined })}
                    className="p-1 text-graphite hover:text-ochre focus-visible:outline-ochre"
                    aria-label="Remove logo"
                  >
                    <X size={15} strokeWidth={1.75} />
                  </button>
                ) : null}
              </div>
              {logoError ? <p className="text-xs text-ochre">{logoError}</p> : null}
            </div>

            <button
              type="button"
              onClick={() => setBrand(DEFAULT_BRAND)}
              className="flex w-fit items-center gap-1.5 text-xs text-mist hover:text-ochre focus-visible:outline-ochre"
            >
              <RotateCcw size={12} strokeWidth={1.75} /> Reset to studio default
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
