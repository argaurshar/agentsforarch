import { Check, FileDown, ImagePlus, Images, LayoutGrid, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { BrandPanel } from '../../components/Presentation/BrandPanel';
import { DeckGenerator } from '../../components/Presentation/DeckGenerator';
import { SlideCanvas } from '../../components/Presentation/SlideCanvas';
import { SlideList } from '../../components/Presentation/SlideList';
import { Button } from '../../components/ui/Button';
import { ChipGroup } from '../../components/ui/ChipGroup';
import type { ChipOption } from '../../components/ui/ChipGroup';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { IconButton } from '../../components/ui/IconButton';
import { Notice } from '../../components/ui/Notice';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { composeDeck } from '../../lib/composer';
import type { ComposerImage } from '../../lib/composer';
import { fileToDataURL, newId, resizeDataURL, validateImageFile } from '../../lib/images';
import { exportPresentationPdf } from '../../lib/pdf';
import { imageMapFromProject, poolFromProject, useProjectStore } from '../../store/useProjectStore';
import type { GeneratedImage, SlideLayout } from '../../types';

const LAYOUT_OPTIONS: ChipOption<SlideLayout>[] = [
  { value: 'full', label: 'Full' },
  { value: 'two-up', label: 'Two-up' },
  { value: 'four-grid', label: 'Four-grid' },
];

function layoutForCount(count: number): SlideLayout {
  if (count >= 3) return 'four-grid';
  if (count === 2) return 'two-up';
  return 'full';
}

export function PresentationFeature() {
  const project = useProjectStore((s) => s.project);
  const projectName = project.name;
  const brand = project.brand;
  const claudeApiKey = useProjectStore((s) => s.claudeApiKey);
  const addSlide = useProjectStore((s) => s.addSlide);
  const updateSlide = useProjectStore((s) => s.updateSlide);
  const removeSlide = useProjectStore((s) => s.removeSlide);
  const moveSlide = useProjectStore((s) => s.moveSlide);
  const setTab = useProjectStore((s) => s.setTab);
  const setComposedSlides = useProjectStore((s) => s.setComposedSlides);
  const addUploads = useProjectStore((s) => s.addUploads);
  const removeImage = useProjectStore((s) => s.removeImage);

  const pool = useMemo(() => poolFromProject(project), [project]);
  const imageMap = useMemo(() => imageMapFromProject(project), [project]);
  const orderedSlides = useMemo(() => [...project.slides].sort((a, b) => a.order - b.order), [project.slides]);
  const groups = useMemo(() => {
    const seen: string[] = [];
    for (const p of pool) if (!seen.includes(p.group)) seen.push(p.group);
    return seen;
  }, [pool]);

  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [confirmCompose, setConfirmCompose] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const effectiveSlideId =
    (selectedSlideId && orderedSlides.some((s) => s.id === selectedSlideId) ? selectedSlideId : orderedSlides[0]?.id) ??
    null;
  const selectedSlide = orderedSlides.find((s) => s.id === effectiveSlideId) ?? null;
  // 1-based position of the shown slide — also the canvas's page number.
  const slideIndex = Math.max(1, orderedSlides.findIndex((s) => s.id === effectiveSlideId) + 1);

  const toggleChecked = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSlide = () => {
    const ids = pool.filter((p) => checked.has(p.image.id)).map((p) => p.image.id);
    if (ids.length === 0 || ids.length > 4) return; // the button is disabled past 4
    const id = addSlide(ids, layoutForCount(ids.length));
    setSelectedSlideId(id);
    setChecked(new Set());
  };

  const handleExport = async () => {
    setPdfError(null);
    setExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 30));
      await exportPresentationPdf({ projectName, slides: orderedSlides, imageMap, brand });
    } catch {
      setPdfError('Could not export the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const canCompose = Boolean(claudeApiKey) && pool.length > 0;

  const runCompose = async () => {
    setComposeError(null);
    setConfirmCompose(false);
    setComposing(true);
    try {
      const images: ComposerImage[] = pool.map((p) => ({ id: p.image.id, group: p.group, label: p.image.label }));
      const composed = await composeDeck({ projectName, brand, images });
      setComposedSlides(composed);
      setSelectedSlideId(null);
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : 'The composer failed. Please try again.');
    } finally {
      setComposing(false);
    }
  };

  const onComposeClick = () => {
    if (!canCompose) return;
    if (orderedSlides.length > 0) {
      setConfirmCompose(true);
      return;
    }
    void runCompose();
  };

  const onUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const images: GeneratedImage[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      const check = validateImageFile(file);
      if (!check.ok) {
        errors.push(`${file.name} — ${check.error}`);
        continue;
      }
      try {
        const raw = await fileToDataURL(file);
        const url = await resizeDataURL(raw);
        images.push({
          id: newId('img'),
          url,
          label: file.name.replace(/\.[^.]+$/, '') || 'Uploaded image',
          createdAt: Date.now(),
        });
      } catch {
        errors.push(`${file.name} — could not be read`);
      }
    }
    if (images.length > 0) addUploads(images);
    if (errors.length > 0) {
      setUploadError(`${errors.length} file${errors.length === 1 ? '' : 's'} skipped: ${errors.join('; ')}`);
    }
    if (uploadRef.current) uploadRef.current.value = '';
  };

  const hasImages = pool.length > 0;

  return (
    <div>
      <SectionHeader
        index="04"
        eyebrow="Deliverables"
        title="Concept presentation"
        description="Generate a distinctive, self-contained HTML deck with Claude — or arrange outputs into an on-brand storyboard and export to PDF."
        actions={
          mode === 'manual' ? (
            <Button
              variant="primary"
              icon={<FileDown size={16} strokeWidth={1.75} />}
              onClick={handleExport}
              loading={exporting}
              disabled={orderedSlides.length === 0}
            >
              {exporting ? 'Exporting…' : 'Export PDF'}
            </Button>
          ) : undefined
        }
      />

      {/* Mode toggle — AI deck (frontend-slides skill) vs. manual storyboard.
          The active pill is ochre-deep: white on plain ochre fails AA below 18px. */}
      <div
        className="mb-6 inline-flex gap-1 rounded-full border border-hairline bg-paper p-1 shadow-card"
        role="tablist"
        aria-label="Presentation mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'ai'}
          onClick={() => setMode('ai')}
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-label transition-all active:scale-[0.98] ${
            mode === 'ai' ? 'bg-ochre-deep text-white' : 'text-graphite hover:bg-drafting'
          }`}
        >
          <Wand2 size={14} strokeWidth={1.75} /> AI deck
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'manual'}
          onClick={() => setMode('manual')}
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-label transition-all active:scale-[0.98] ${
            mode === 'manual' ? 'bg-ochre-deep text-white' : 'text-graphite hover:bg-drafting'
          }`}
        >
          <LayoutGrid size={14} strokeWidth={1.75} /> Manual storyboard
        </button>
      </div>

      <BrandPanel />

      {mode === 'ai' ? <DeckGenerator /> : null}

      {mode === 'manual' ? (
        <>
          {pdfError ? (
            <div className="mb-6">
              <ErrorBanner message={pdfError} onRetry={handleExport} />
            </div>
          ) : null}

          {!hasImages ? (
            <EmptyState
              icon={Images}
              title="No images yet"
              description="Generate renders on the Isometric, Elevation, or Axonometric tabs — or upload your own — then compose them into a presentation. Nothing is required in any particular order."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button variant="primary" onClick={() => setTab('render')}>
                    Generate your first image
                  </Button>
                  <Button icon={<ImagePlus size={15} strokeWidth={1.75} />} onClick={() => uploadRef.current?.click()}>
                    Upload images
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_minmax(0,19rem)]">
              {/* Left — compose, upload, and the image picker. */}
              <aside className="flex flex-col gap-6">
                <div className="flex flex-col gap-3 rounded-card border border-hairline bg-paper p-4 shadow-card">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Sparkles size={14} strokeWidth={1.75} />}
                    onClick={onComposeClick}
                    loading={composing}
                    disabled={!canCompose}
                  >
                    {composing ? 'Composing…' : 'Compose with Claude'}
                  </Button>
                  {!claudeApiKey ? (
                    <p className="text-caption text-warning">Add a Claude key in Settings to enable.</p>
                  ) : null}
                  {confirmCompose ? (
                    <div className="flex flex-col gap-3 rounded-field border border-hairline bg-drafting px-3.5 py-3 text-body text-graphite">
                      <p>
                        Replace your {orderedSlides.length} slide{orderedSlides.length === 1 ? '' : 's'} with a
                        Claude-composed deck?
                      </p>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={() => void runCompose()}>
                          Replace
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setConfirmCompose(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {composeError ? <ErrorBanner message={composeError} onRetry={onComposeClick} /> : null}
                </div>

                <div className="flex flex-col gap-4 rounded-card border border-hairline bg-paper p-4 shadow-card">
                  <div className="flex items-center justify-between gap-2">
                    <p className="section-heading">Images</p>
                    <span className="mono-meta text-mist">{checked.size} selected</span>
                  </div>

                  {/* Capped so a long pool cannot push the canvas off-screen on tablet. */}
                  <div className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto">
                    {groups.map((group) => {
                      const groupImages = pool.filter((p) => p.group === group);
                      return (
                        <div key={group} className="flex flex-col gap-2 rounded-field bg-drafting p-3">
                          <p className="mono-meta">{group}</p>
                          <div className="flex flex-col gap-2">
                            {groupImages.map((ref) => {
                              const isChecked = checked.has(ref.image.id);
                              return (
                                <div
                                  key={ref.image.id}
                                  className={`flex items-center gap-1 rounded-field border pr-1 transition-colors ${
                                    isChecked ? 'border-ochre/60 bg-ochre/5' : 'border-hairline bg-paper hover:bg-drafting'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleChecked(ref.image.id)}
                                    aria-pressed={isChecked}
                                    className="flex min-w-0 flex-1 items-center gap-2 rounded-field p-1.5 text-left"
                                  >
                                    <span
                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-control border ${
                                        isChecked
                                          ? 'border-ochre-deep bg-ochre-deep text-white'
                                          : 'border-mist bg-paper'
                                      }`}
                                    >
                                      {isChecked ? <Check size={11} strokeWidth={2} /> : null}
                                    </span>
                                    <span className="h-8 w-11 shrink-0 overflow-hidden rounded-control border border-hairline bg-drafting">
                                      <img src={ref.image.url} alt="" className="h-full w-full object-cover" />
                                    </span>
                                    <span className="mono-meta truncate text-graphite" title={ref.image.label}>
                                      {ref.image.label}
                                    </span>
                                  </button>
                                  <IconButton
                                    icon={<Trash2 size={14} strokeWidth={1.75} />}
                                    label={`Remove ${ref.image.label}`}
                                    tone="danger"
                                    onClick={() => removeImage(ref.image.id)}
                                    title="Remove from project"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-hairline pt-4">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus size={14} strokeWidth={1.75} />}
                      onClick={handleAddSlide}
                      disabled={checked.size === 0 || checked.size > 4}
                    >
                      Add slide
                    </Button>
                    {checked.size > 4 ? (
                      <Notice
                        tone="warning"
                        message={`Select at most 4 images per slide (${checked.size} selected).`}
                      />
                    ) : null}
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<ImagePlus size={14} strokeWidth={1.75} />}
                      onClick={() => uploadRef.current?.click()}
                    >
                      Upload images
                    </Button>
                    {uploadError ? <Notice tone="error" message={uploadError} /> : null}
                    <p className="text-caption text-mist">Up to 4 images per slide.</p>
                  </div>
                </div>
              </aside>

              {/* Center — current slide. */}
              <div className="min-w-0">
                <p className="mono-meta mb-3">
                  {selectedSlide ? `Slide ${slideIndex} of ${orderedSlides.length}` : 'No slide selected'}
                </p>
                <SlideCanvas
                  slide={selectedSlide}
                  imageMap={imageMap}
                  brand={brand}
                  projectName={projectName}
                  slideNumber={slideIndex}
                  slideCount={orderedSlides.length}
                />
              </div>

              {/* Right — slide list + per-slide editor. */}
              <aside className="flex flex-col gap-6 md:col-span-2 lg:col-span-1">
                <div className="flex flex-col gap-3">
                  <p className="section-heading">Slides ({orderedSlides.length})</p>
                  {orderedSlides.length === 0 ? (
                    <EmptyState
                      icon={LayoutGrid}
                      title="No slides yet"
                      description="Select images and press “Add slide”, or let “Compose with Claude” build the deck for you."
                    />
                  ) : (
                    <SlideList
                      slides={orderedSlides}
                      selectedId={effectiveSlideId}
                      imageMap={imageMap}
                      onSelect={setSelectedSlideId}
                      onMove={moveSlide}
                      onDelete={removeSlide}
                    />
                  )}
                </div>

                {selectedSlide ? (
                  <div className="flex flex-col gap-4 rounded-card border border-hairline bg-paper p-4 shadow-card">
                    <p className="section-heading">Slide settings</p>

                    <ChipGroup
                      label="Layout"
                      value={selectedSlide.layout}
                      options={LAYOUT_OPTIONS}
                      onChange={(v) => updateSlide(selectedSlide.id, { layout: v })}
                    />

                    <div className="flex flex-col gap-2">
                      <label htmlFor="slide-title" className="mono-meta">
                        Title
                      </label>
                      <input
                        id="slide-title"
                        value={selectedSlide.title ?? ''}
                        onChange={(e) => updateSlide(selectedSlide.id, { title: e.target.value })}
                        placeholder="e.g. Street approach"
                        className="rounded-field border border-hairline bg-paper px-3.5 py-2 text-body text-graphite placeholder:text-mist"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label htmlFor="slide-caption" className="mono-meta">
                        Caption
                      </label>
                      <textarea
                        id="slide-caption"
                        value={selectedSlide.caption ?? ''}
                        onChange={(e) => updateSlide(selectedSlide.id, { caption: e.target.value })}
                        rows={2}
                        placeholder="e.g. Warm evening light, brick and glass"
                        className="resize-none rounded-field border border-hairline bg-paper px-3.5 py-2 text-body text-graphite placeholder:text-mist"
                      />
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          )}
        </>
      ) : null}

      {/* Shared hidden upload input (used by both the empty state and the picker). */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => void onUploadFiles(e.target.files)}
      />
    </div>
  );
}

// Default export so App can lazy-load this whole tree (Anthropic SDK + jspdf +
// vendored skill markdown) out of the main chunk.
export default PresentationFeature;
