import { FileDown, ImagePlus, Images, LayoutGrid, Plus, Sparkles } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { BrandPanel } from '../../components/Presentation/BrandPanel';
import { SlideCanvas } from '../../components/Presentation/SlideCanvas';
import { SlideList } from '../../components/Presentation/SlideList';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { composeDeck } from '../../lib/composer';
import type { ComposerImage } from '../../lib/composer';
import { fileToDataURL, newId, resizeDataURL, validateImageFile } from '../../lib/images';
import { exportPresentationPdf } from '../../lib/pdf';
import { imageMapFromProject, poolFromProject, useProjectStore } from '../../store/useProjectStore';
import type { GeneratedImage, SlideLayout } from '../../types';

const LAYOUT_OPTIONS: { value: SlideLayout; label: string }[] = [
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

  const pool = useMemo(() => poolFromProject(project), [project]);
  const imageMap = useMemo(() => imageMapFromProject(project), [project]);
  const orderedSlides = useMemo(() => [...project.slides].sort((a, b) => a.order - b.order), [project.slides]);
  const groups = useMemo(() => {
    const seen: string[] = [];
    for (const p of pool) if (!seen.includes(p.group)) seen.push(p.group);
    return seen;
  }, [pool]);

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
    if (ids.length === 0) return;
    const capped = ids.slice(0, 4);
    const id = addSlide(capped, layoutForCount(capped.length));
    setSelectedSlideId(id);
    setChecked(new Set());
  };

  const handleExport = async () => {
    setPdfError(null);
    setExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 30));
      exportPresentationPdf({ projectName, slides: orderedSlides, imageMap, brand });
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
    for (const file of Array.from(files)) {
      const check = validateImageFile(file);
      if (!check.ok) {
        setUploadError(check.error);
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
        setUploadError('Could not read one of the files.');
      }
    }
    if (images.length > 0) addUploads(images);
    if (uploadRef.current) uploadRef.current.value = '';
  };

  const hasImages = pool.length > 0;

  return (
    <div>
      <SectionHeader
        index="04"
        eyebrow="Concept Presentation"
        title="Concept Presentation"
        description="Assemble outputs into an arranged, on-brand presentation — compose it with Claude, then export to PDF."
        actions={
          <Button
            variant="primary"
            icon={<FileDown size={16} strokeWidth={1.75} />}
            onClick={handleExport}
            loading={exporting}
            disabled={orderedSlides.length === 0}
          >
            {exporting ? 'Exporting…' : 'Export PDF'}
          </Button>
        }
      />

      <BrandPanel />

      {pdfError ? (
        <div className="mb-6">
          <ErrorBanner message={pdfError} onRetry={handleExport} />
        </div>
      ) : null}

      {!hasImages ? (
        <EmptyState
          icon={Images}
          title="No images yet"
          description="Generate renders, elevations, or axonometrics — or upload your own below — then compose them into a presentation. Nothing is required in any particular order."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => setTab('render')}>Go to Render</Button>
              <Button onClick={() => setTab('elevation')}>Go to Elevation</Button>
              <Button onClick={() => setTab('axonometric')}>Go to Axonometric</Button>
              <Button icon={<ImagePlus size={15} strokeWidth={1.75} />} onClick={() => uploadRef.current?.click()}>
                Upload images
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_minmax(0,19rem)]">
          {/* Left — compose, upload, and the image picker. */}
          <aside className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
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
                <p className="text-[0.7rem] text-mist">Add a Claude key in Settings to enable.</p>
              ) : null}
              {confirmCompose ? (
                <div className="border border-hairline bg-drafting px-3 py-2.5 text-xs text-graphite">
                  Replace your {orderedSlides.length} slide{orderedSlides.length === 1 ? '' : 's'} with a
                  Claude-composed deck?
                  <div className="mt-2 flex gap-2">
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

            <div className="flex items-center justify-between">
              <p className="mono-meta">Images</p>
              <span className="mono-meta text-mist">{checked.size} selected</span>
            </div>

            {groups.map((group) => {
              const groupImages = pool.filter((p) => p.group === group);
              return (
                <div key={group} className="flex flex-col gap-2">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-graphite">{group}</p>
                  <div className="flex flex-col gap-1.5">
                    {groupImages.map((ref) => {
                      const isChecked = checked.has(ref.image.id);
                      return (
                        <button
                          key={ref.image.id}
                          type="button"
                          onClick={() => toggleChecked(ref.image.id)}
                          aria-pressed={isChecked}
                          className={`flex items-center gap-2 border p-1.5 text-left transition-colors focus-visible:outline-ochre ${
                            isChecked ? 'border-ochre bg-drafting' : 'border-hairline bg-paper hover:bg-drafting'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                              isChecked ? 'border-ochre bg-ochre' : 'border-mist bg-paper'
                            }`}
                          >
                            {isChecked ? <span className="h-1.5 w-1.5 bg-bone" /> : null}
                          </span>
                          <span className="h-8 w-11 shrink-0 overflow-hidden border border-hairline bg-drafting">
                            <img src={ref.image.url} alt="" className="h-full w-full object-cover" />
                          </span>
                          <span className="mono-meta truncate text-graphite" title={ref.image.label}>
                            {ref.image.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} strokeWidth={1.75} />}
                onClick={handleAddSlide}
                disabled={checked.size === 0}
              >
                Add slide
              </Button>
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="flex items-center justify-center gap-1.5 border border-hairline bg-paper px-3 py-1.5 text-xs text-graphite hover:bg-drafting focus-visible:outline-ochre"
              >
                <ImagePlus size={14} strokeWidth={1.75} /> Upload images
              </button>
              {uploadError ? <p className="text-[0.7rem] text-ochre">{uploadError}</p> : null}
              <p className="text-[0.7rem] text-mist">Up to 4 images per slide.</p>
            </div>
          </aside>

          {/* Center — current slide. */}
          <div className="min-w-0">
            <p className="mono-meta mb-3">Slide {selectedSlide ? '' : '· none'}</p>
            <SlideCanvas slide={selectedSlide} imageMap={imageMap} brand={brand} />
          </div>

          {/* Right — slide list + per-slide editor. */}
          <aside className="flex flex-col gap-5">
            <div>
              <p className="mono-meta mb-3">Slides ({orderedSlides.length})</p>
              {orderedSlides.length === 0 ? (
                <p className="border border-dashed border-hairline bg-paper px-4 py-6 text-center text-xs text-mist">
                  Select images and press “Add slide”, or “Compose with Claude” to build the deck for you.
                </p>
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
              <div className="flex flex-col gap-4 border-t border-hairline pt-5">
                <p className="mono-meta">Slide settings</p>

                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-graphite">
                    <LayoutGrid size={12} strokeWidth={1.75} /> Layout
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LAYOUT_OPTIONS.map((opt) => {
                      const active = selectedSlide.layout === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => updateSlide(selectedSlide.id, { layout: opt.value })}
                          className={`border px-1 py-2 text-xs font-medium transition-colors focus-visible:outline-ochre ${
                            active ? 'border-ochre bg-ochre text-bone' : 'border-hairline bg-paper text-graphite hover:bg-drafting'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="slide-title" className="mono-meta">
                    Title
                  </label>
                  <input
                    id="slide-title"
                    value={selectedSlide.title ?? ''}
                    onChange={(e) => updateSlide(selectedSlide.id, { title: e.target.value })}
                    placeholder="e.g. Street approach"
                    className="border border-hairline bg-paper px-3 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
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
                    className="resize-none border border-hairline bg-paper px-3 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
                  />
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      )}

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
