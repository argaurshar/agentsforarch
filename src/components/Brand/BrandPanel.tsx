import { ChevronDown, Palette, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { makeDefaultBrand, useProjectStore } from '../../store/useProjectStore';
import { Button } from '../ui/Button';

/**
 * The project's artefact palette. These four colours are stamped onto the things
 * the app renders itself — the mood-board collage and the social-format export —
 * so the panel lives beside the board that shows them off. They are deliberately
 * independent of the app chrome's design tokens.
 */

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

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-paper shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-drafting"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Palette size={16} strokeWidth={1.75} className="text-mist" />
          <span className="section-heading">Board palette</span>
        </span>
        {/* One chevron that rotates — swapping two glyphs read as a different control. */}
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={`text-mist transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="flex flex-col gap-3 border-t border-hairline px-4 py-5">
          <ColorRow label="Primary" value={brand.primary} onChange={(v) => setBrand({ primary: v })} />
          <ColorRow label="Accent" value={brand.accent} onChange={(v) => setBrand({ accent: v })} />
          <ColorRow label="Background" value={brand.background} onChange={(v) => setBrand({ background: v })} />
          <ColorRow label="Text" value={brand.text} onChange={(v) => setBrand({ text: v })} />
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={14} strokeWidth={1.75} />}
            onClick={() => setBrand(makeDefaultBrand())}
            className="w-fit"
          >
            Reset to studio default
          </Button>
        </div>
      ) : null}
    </div>
  );
}
