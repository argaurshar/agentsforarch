import { FileDown, Images, LayoutGrid, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SlideCanvas } from '../../components/Presentation/SlideCanvas';
import { SlideList } from '../../components/Presentation/SlideList';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { exportPresentationPdf } from '../../lib/pdf';
import { imageMapFromAssets, imagesFromAssets, useProjectStore } from '../../store/useProjectStore';
import type { FeatureKind, SlideLayout } from '../../types';

const FEATURE_GROUPS: { key: FeatureKind; label: string }[] = [
  { key: 'render', label: 'Renders' },
  { key: 'elevation', label: 'Elevations' },
  { key: 'axonometric', label: 'Axonometrics' },
];

const LAYOUT_OPTIONS: { value: SlideLayout; label: string; capacity: number }[] = [
  { value: 'full', label: 'Full', capacity: 1 },
  { value: 'two-up', label: 'Two-up', capacity: 2 },
  { value: 'four-grid', label: 'Four-grid', capacity: 4 },
];

function layoutForCount(count: number): SlideLayout {
  if (count >= 3) return 'four-grid';
  if (count === 2) return 'two-up';
  return 'full';
}

export function PresentationFeature() {
  const assets = useProjectStore((s) => s.project.assets);
  const slides = useProjectStore((s) => s.project.slides);
  const projectName = useProjectStore((s) => s.project.name);
  const addSlide = useProjectStore((s) => s.addSlide);
  const updateSlide = useProjectStore((s) => s.updateSlide);
  const removeSlide = useProjectStore((s) => s.removeSlide);
  const moveSlide = useProjectStore((s) => s.moveSlide);
  const setTab = useProjectStore((s) => s.setTab);

  const images = useMemo(() => imagesFromAssets(assets), [assets]);
  const imageMap = useMemo(() => imageMapFromAssets(assets), [assets]);
  const orderedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Resolve the effective selection even as slides are added/removed.
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
    // Preserve on-screen image order; cap to the largest layout capacity (4).
    const ids = images.filter((ref) => checked.has(ref.image.id)).map((ref) => ref.image.id);
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
      // Yield so the spinner paints before the (synchronous) jsPDF work.
      await new Promise((resolve) => setTimeout(resolve, 30));
      exportPresentationPdf({ projectName, slides: orderedSlides, imageMap });
    } catch {
      setPdfError('Could not export the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const hasImages = images.length > 0;

  return (
    <div>
      <SectionHeader
        index="04"
        eyebrow="Concept Presentation"
        title="Concept Presentation"
        description="Assemble selected outputs into an arranged presentation and export it to PDF."
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

      {pdfError ? (
        <div className="mb-6">
          <ErrorBanner message={pdfError} onRetry={handleExport} />
        </div>
      ) : null}

      {!hasImages ? (
        <EmptyState
          icon={Images}
          title="No images yet"
          description="Generate renders, elevations, or axonometrics first — then compose them into a presentation here. Nothing is required in any particular order."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => setTab('render')}>Go to Render</Button>
              <Button onClick={() => setTab('elevation')}>Go to Elevation</Button>
              <Button onClick={() => setTab('axonometric')}>Go to Axonometric</Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,19rem)]">
          {/* Left — image picker grouped by feature. */}
          <aside className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <p className="mono-meta">Images</p>
              <span className="mono-meta text-mist">{checked.size} selected</span>
            </div>
            {FEATURE_GROUPS.map((group) => {
              const groupImages = images.filter((ref) => ref.feature === group.key);
              if (groupImages.length === 0) return null;
              return (
                <div key={group.key} className="flex flex-col gap-2">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-graphite">{group.label}</p>
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
              <p className="text-[0.7rem] text-mist">Up to 4 images per slide.</p>
            </div>
          </aside>

          {/* Center — current slide. */}
          <div className="min-w-0">
            <p className="mono-meta mb-3">Slide {selectedSlide ? '' : '· none'}</p>
            <SlideCanvas slide={selectedSlide} imageMap={imageMap} />
          </div>

          {/* Right — slide list + per-slide editor. */}
          <aside className="flex flex-col gap-5">
            <div>
              <p className="mono-meta mb-3">Slides ({orderedSlides.length})</p>
              {orderedSlides.length === 0 ? (
                <p className="border border-dashed border-hairline bg-paper px-4 py-6 text-center text-xs text-mist">
                  Select images and press “Add slide” to build your deck.
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
    </div>
  );
}
