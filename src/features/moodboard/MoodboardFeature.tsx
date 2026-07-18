import { Download, LayoutTemplate, Palette } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Spinner } from '../../components/ui/Spinner';
import { downloadDataURL, newId, slugify } from '../../lib/images';
import { MOODBOARD_MAX_IMAGES, MOODBOARD_ORIENTATIONS, renderMoodboard } from '../../lib/moodboard';
import type { MoodboardOrientation } from '../../lib/moodboard';
import { poolFromProject, useProjectStore } from '../../store/useProjectStore';
import type { GeneratedImage } from '../../types';

/**
 * Feature 05 · Mood Board — compose selected renders/elevations/interiors into a
 * single branded material & mood board (canvas), download it as a PNG, or drop it
 * into the presentation pool. Frontend-only; no generation call.
 */
export function MoodboardFeature() {
  const project = useProjectStore((s) => s.project);
  const setTab = useProjectStore((s) => s.setTab);
  const addUploads = useProjectStore((s) => s.addUploads);

  const pool = useMemo(() => poolFromProject(project), [project]);
  const groups = useMemo(() => {
    const seen: string[] = [];
    for (const p of pool) if (!seen.includes(p.group)) seen.push(p.group);
    return seen;
  }, [pool]);

  // Ordered selection — the order images are picked is the order they lay out.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<MoodboardOrientation>(MOODBOARD_ORIENTATIONS[0]);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [added, setAdded] = useState(false);

  // Keep the selection valid if an image is deleted elsewhere.
  useEffect(() => {
    const live = new Set(pool.map((p) => p.image.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => live.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [pool]);

  const atMax = selectedIds.length >= MOODBOARD_MAX_IMAGES;
  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MOODBOARD_MAX_IMAGES) return prev;
      return [...prev, id];
    });

  // The selected images' URLs, in pick order.
  const selectedUrls = useMemo(() => {
    const byId = new Map(pool.map((p) => [p.image.id, p.image.url]));
    return selectedIds.map((id) => byId.get(id)).filter((u): u is string => Boolean(u));
  }, [pool, selectedIds]);

  // Clear the "added" confirmation only when the board itself is edited — NOT when
  // an unrelated upload (including this very board) changes the project/pool.
  useEffect(() => {
    setAdded(false);
  }, [selectedIds, orientation, title, subtitle]);

  // Re-render the board whenever the inputs change. Cheap: images are cached.
  useEffect(() => {
    if (selectedUrls.length === 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setRendering(true);
    renderMoodboard(selectedUrls, orientation, {
      title,
      subtitle,
      projectName: project.name,
      brand: project.brand,
    })
      .then((url) => {
        if (!cancelled) setPreview(url);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedUrls, orientation, title, subtitle, project.name, project.brand]);

  const boardName = title.trim() || 'mood-board';

  const addToPresentation = () => {
    if (!preview) return;
    const image: GeneratedImage = {
      id: newId('img'),
      url: preview,
      label: title.trim() ? `Mood board — ${title.trim()}` : 'Mood board',
      createdAt: Date.now(),
    };
    addUploads([image]);
    setAdded(true);
  };

  return (
    <div>
      <SectionHeader
        index="05"
        eyebrow="Mood Board"
        title="Mood Board"
        description="Compose your renders, elevations and interiors into one branded material & mood board — the artefact you hand a client alongside the work. Pick images, choose a shape, add a title, then download it or drop it straight into a presentation."
      />

      {pool.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="No images to compose yet"
          description="Generate renders, elevations, axonometrics or interiors on the earlier tabs (or upload images in the presentation) and they'll appear here to arrange into a mood board."
          action={
            <Button icon={<Palette size={15} strokeWidth={1.75} />} onClick={() => setTab('render')}>
              Start on the Isometric tab
            </Button>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Controls */}
          <div className="flex flex-col gap-6">
            {/* Image picker */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="mono-meta">
                  Images · {selectedIds.length} of {MOODBOARD_MAX_IMAGES} chosen
                </span>
                {selectedIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="border border-hairline bg-paper px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-graphite hover:bg-drafting focus-visible:outline-ochre"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {groups.map((group) => (
                <div key={group} className="flex flex-col gap-2">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-graphite">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {pool
                      .filter((p) => p.group === group)
                      .map((ref) => {
                        const pos = selectedIds.indexOf(ref.image.id);
                        const isSel = pos >= 0;
                        const disabled = !isSel && atMax;
                        return (
                          <button
                            key={ref.image.id}
                            type="button"
                            onClick={() => toggle(ref.image.id)}
                            disabled={disabled}
                            aria-pressed={isSel}
                            title={disabled ? `Up to ${MOODBOARD_MAX_IMAGES} images` : ref.image.label}
                            className={`relative h-16 w-24 overflow-hidden border transition-all focus-visible:outline-ochre ${
                              isSel
                                ? 'border-ochre'
                                : disabled
                                  ? 'cursor-not-allowed border-hairline opacity-25'
                                  : 'border-hairline opacity-55 hover:opacity-90'
                            }`}
                          >
                            <img src={ref.image.url} alt={ref.image.label} className="h-full w-full object-cover" />
                            {isSel ? (
                              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center border border-ochre bg-ochre font-mono text-[0.6rem] text-bone">
                                {pos + 1}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {/* Orientation */}
            <div className="flex flex-col gap-2">
              <span className="mono-meta">Board shape</span>
              <div className="flex flex-wrap gap-1.5">
                {MOODBOARD_ORIENTATIONS.map((o) => {
                  const active = o.key === orientation.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setOrientation(o)}
                      className={`border px-3 py-1.5 text-xs transition-colors focus-visible:outline-ochre ${
                        active ? 'border-ochre bg-ochre text-bone' : 'border-hairline bg-paper text-graphite hover:bg-drafting'
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title / subtitle */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="mb-title" className="mono-meta">
                  Title <span className="text-mist">(optional)</span>
                </label>
                <input
                  id="mb-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Material & Mood Board"
                  className="border border-hairline bg-paper px-3 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="mb-subtitle" className="mono-meta">
                  Subtitle <span className="text-mist">(optional)</span>
                </label>
                <input
                  id="mb-subtitle"
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Project name · phase · date"
                  className="border border-hairline bg-paper px-3 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  icon={<Download size={16} strokeWidth={1.75} />}
                  disabled={!preview}
                  onClick={() => preview && downloadDataURL(preview, `${slugify(boardName)}-moodboard.png`)}
                >
                  Download PNG
                </Button>
                <Button
                  variant="secondary"
                  icon={<LayoutTemplate size={16} strokeWidth={1.75} />}
                  disabled={!preview}
                  onClick={addToPresentation}
                >
                  Add to presentation
                </Button>
              </div>
              {added ? (
                <p className="text-[0.7rem] text-graphite">
                  Added to the presentation pool — it appears under <span className="text-ink">Uploaded</span> on the
                  Presentation and Gallery tabs.
                </p>
              ) : null}
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <span className="mono-meta">Preview</span>
            <div className="mt-2 flex min-h-[320px] items-center justify-center border border-hairline bg-drafting p-4">
              {preview ? (
                <img src={preview} alt="Mood board preview" className="max-h-[68vh] w-auto object-contain shadow-sm" />
              ) : rendering ? (
                <Spinner size={20} className="text-ochre" />
              ) : (
                <p className="max-w-xs text-center text-sm text-mist">
                  Pick one or more images on the left to compose your mood board.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
