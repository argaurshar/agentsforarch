import { Download, LayoutGrid, LayoutTemplate, Palette, RotateCcw, Sparkles, Wand2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { OutputGrid } from '../../components/Output/OutputGrid';
import { ImageDropzone } from '../../components/Upload/ImageDropzone';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Spinner } from '../../components/ui/Spinner';
import { downloadDataURL, newId, slugify } from '../../lib/images';
import { MOODBOARD_MAX_IMAGES, MOODBOARD_ORIENTATIONS, renderMoodboard } from '../../lib/moodboard';
import type { MoodboardOrientation } from '../../lib/moodboard';
import { buildMoodboardPrompt } from '../../lib/prompts';
import { poolFromProject, useProjectStore } from '../../store/useProjectStore';
import type { BoardAspectKey } from '../../store/generation';
import type { GeneratedImage } from '../../types';
import { useGenerate, usePresentationAdder } from '../hooks';

/**
 * Feature 05 · Mood Board — two ways to make a board:
 *
 * - **AI board** (default): upload any image — a render, sketch or photo — or
 *   pick one of your outputs, and the engine extracts its design DNA into a
 *   professional flat-lay material & mood board (labelled samples, furniture
 *   suggestions, colour dots, a material palette strip and a vibe line).
 * - **Collage**: compose selected outputs into a branded grid board on canvas
 *   (frontend-only, no generation call).
 */
export function MoodboardFeature() {
  const [mode, setMode] = useState<'ai' | 'collage'>('ai');

  return (
    <div>
      <SectionHeader
        index="05"
        eyebrow="Mood Board"
        title="Image → Material & Mood Board"
        description="Upload any image — or pick one of your outputs — and generate a flat-lay material & mood board extracting its materials, colours, fabrics and vibe. Or compose a collage board from your outputs."
      />

      {/* Mode toggle — AI-generated board vs. the canvas collage. */}
      <div className="mb-8 flex w-fit gap-1 rounded-full border border-hairline bg-paper p-1 shadow-sm" role="tablist" aria-label="Board mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'ai'}
          onClick={() => setMode('ai')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-ochre ${
            mode === 'ai' ? 'bg-ochre text-white shadow-btn' : 'text-graphite hover:bg-drafting'
          }`}
        >
          <Wand2 size={15} strokeWidth={1.75} /> AI board
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'collage'}
          onClick={() => setMode('collage')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all focus-visible:outline-ochre ${
            mode === 'collage' ? 'bg-ochre text-white shadow-btn' : 'text-graphite hover:bg-drafting'
          }`}
        >
          <LayoutGrid size={15} strokeWidth={1.75} /> Collage
        </button>
      </div>

      {mode === 'ai' ? <BoardGenerator /> : <CollageComposer />}
    </div>
  );
}

const ASPECTS: { value: BoardAspectKey; label: string }[] = [
  { value: '4:5', label: 'Portrait' },
  { value: '1:1', label: 'Square' },
  { value: '16:9', label: 'Landscape' },
];

/** AI board: any image → flat-lay material & mood board (via the image engine). */
function BoardGenerator() {
  const { input, settings, prompt, promptEdited } = useProjectStore((s) => s.generation.moodboard);
  const project = useProjectStore((s) => s.project);
  const setFeatureInput = useProjectStore((s) => s.setFeatureInput);
  const updateFeatureSettings = useProjectStore((s) => s.updateFeatureSettings);
  const setFeaturePrompt = useProjectStore((s) => s.setFeaturePrompt);
  const removeImage = useProjectStore((s) => s.removeImage);

  const pool = useMemo(() => poolFromProject(project), [project]);

  const suggestedPrompt = useMemo(() => buildMoodboardPrompt(), []);
  useEffect(() => {
    if (!promptEdited && suggestedPrompt !== prompt) setFeaturePrompt('moodboard', suggestedPrompt, false);
  }, [suggestedPrompt, promptEdited, prompt, setFeaturePrompt]);

  const { status, error, warning, outputs, engineReady, run, cancel } = useGenerate('moodboard');
  const { addToPresentation, addedIds } = usePresentationAdder();
  const loading = status === 'loading';

  const handleGenerate = () => {
    if (!input) return;
    void run({
      feature: 'moodboard',
      inputImage: input,
      prompt: prompt.trim() || undefined,
      options: { aspectRatio: settings.aspect },
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Input & controls */}
      <div className="flex flex-col gap-6">
        <div>
          <p className="mono-meta mb-3">Input · any image (render, sketch or photo)</p>
          <ImageDropzone
            value={input}
            onImage={(url) => setFeatureInput('moodboard', url)}
            onClear={() => setFeatureInput('moodboard', null)}
            hint="The board extracts this image's materials, colours, fabrics and mood."
          />
        </div>

        {/* Or pick one of the project's images */}
        {pool.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="mono-meta">Or pick one of your images</span>
            <div className="flex flex-wrap gap-2">
              {pool.slice(0, 18).map((ref) => {
                const active = input === ref.image.url;
                return (
                  <button
                    key={ref.image.id}
                    type="button"
                    aria-pressed={active}
                    title={ref.image.label}
                    onClick={() => setFeatureInput('moodboard', active ? null : ref.image.url)}
                    className={`h-14 w-20 overflow-hidden rounded-lg border transition-all focus-visible:outline-ochre ${
                      active ? 'border-ochre' : 'border-hairline opacity-60 hover:opacity-90'
                    }`}
                  >
                    <img src={ref.image.url} alt={ref.image.label} className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Board shape */}
        <div className="flex flex-col gap-2">
          <span className="mono-meta">Board shape</span>
          <div className="flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => {
              const active = settings.aspect === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateFeatureSettings('moodboard', { aspect: a.value })}
                  className={`pill border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors focus-visible:outline-ochre ${
                    active ? 'border-ochre bg-ochre text-white shadow-btn' : 'border-hairline bg-paper text-graphite hover:bg-drafting'
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt — visible + editable, same as every other generation tab. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="moodboard-prompt" className="mono-meta">
              Prompt · auto-generated
            </label>
            {promptEdited ? (
              <button
                type="button"
                onClick={() => setFeaturePrompt('moodboard', suggestedPrompt, false)}
                className="flex items-center gap-1 text-[0.7rem] text-ochre hover:text-ochre-deep focus-visible:outline-ochre"
              >
                <RotateCcw size={12} strokeWidth={1.75} /> Reset
              </button>
            ) : null}
          </div>
          <textarea
            id="moodboard-prompt"
            value={prompt}
            onChange={(e) => setFeaturePrompt('moodboard', e.target.value, true)}
            rows={4}
            className="resize-none rounded-xl border border-hairline bg-paper px-3.5 py-2.5 text-sm leading-relaxed text-graphite placeholder:text-mist focus-visible:outline-ochre"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            icon={<Sparkles size={16} strokeWidth={1.75} />}
            onClick={handleGenerate}
            loading={loading}
            disabled={!input || loading}
          >
            {loading ? 'Generating…' : 'Generate board'}
          </Button>
          {loading ? (
            <Button variant="secondary" size="sm" icon={<X size={14} strokeWidth={1.75} />} onClick={cancel}>
              Cancel
            </Button>
          ) : null}
          {!input ? (
            <span className="text-xs text-mist">Add an image to begin.</span>
          ) : !engineReady ? (
            <span className="text-xs text-ochre">Add your image-engine key in Settings to generate.</span>
          ) : null}
        </div>
      </div>

      {/* Output */}
      <div className="flex flex-col gap-4">
        <p className="mono-meta">Output · material &amp; mood board</p>
        {error ? <ErrorBanner message={error} onRetry={handleGenerate} /> : null}
        {warning ? (
          <p className="rounded-xl border border-hairline bg-drafting px-3.5 py-2 text-xs leading-relaxed text-graphite">{warning}</p>
        ) : null}
        {loading || outputs.length > 0 ? (
          <OutputGrid
            outputs={outputs}
            loading={loading}
            loadingCount={1}
            onAddToPresentation={addToPresentation}
            addedIds={addedIds}
            onDelete={removeImage}
          />
        ) : !error ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-hairline bg-paper px-6 py-16 text-center">
            <p className="max-w-xs text-sm leading-relaxed text-mist">
              Your material &amp; mood board will appear here — labelled samples, colour palette, material strip and
              vibe, extracted from your image.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Collage: compose selected outputs into a branded grid board on canvas. */
function CollageComposer() {
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

  if (pool.length === 0) {
    return (
      <EmptyState
        icon={Palette}
        title="No images to compose yet"
        description="Generate renders, elevations, axonometrics or interiors on the earlier tabs (or upload images in the presentation) and they'll appear here to arrange into a collage board."
        action={
          <Button icon={<Palette size={15} strokeWidth={1.75} />} onClick={() => setTab('render')}>
            Start on the Isometric tab
          </Button>
        }
      />
    );
  }

  return (
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
                className="rounded-full border border-hairline bg-paper px-3 py-1 text-[0.75rem] font-medium text-graphite hover:bg-drafting focus-visible:outline-ochre"
              >
                Clear
              </button>
            ) : null}
          </div>
          {groups.map((group) => (
            <div key={group} className="flex flex-col gap-2">
              <p className="text-[0.75rem] font-medium text-graphite">{group}</p>
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
                        className={`relative h-16 w-24 overflow-hidden rounded-lg border transition-all focus-visible:outline-ochre ${
                          isSel
                            ? 'border-ochre'
                            : disabled
                              ? 'cursor-not-allowed border-hairline opacity-25'
                              : 'border-hairline opacity-55 hover:opacity-90'
                        }`}
                      >
                        <img src={ref.image.url} alt={ref.image.label} className="h-full w-full object-cover" />
                        {isSel ? (
                          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-md border border-ochre bg-ochre text-[0.6875rem] font-semibold text-white">
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
                  className={`pill border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors focus-visible:outline-ochre ${
                    active ? 'border-ochre bg-ochre text-white shadow-btn' : 'border-hairline bg-paper text-graphite hover:bg-drafting'
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
              className="rounded-xl border border-hairline bg-paper px-3.5 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
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
              className="rounded-xl border border-hairline bg-paper px-3.5 py-2 text-sm text-graphite placeholder:text-mist focus-visible:outline-ochre"
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
        <div className="mt-2 flex min-h-[320px] items-center justify-center rounded-xl border border-hairline bg-drafting p-4">
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
  );
}
