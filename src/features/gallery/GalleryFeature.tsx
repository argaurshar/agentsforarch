import { ArrowUpRight, Download, FileDown, FileUp, Images, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbox } from '../../components/Output/Lightbox';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { IconButton } from '../../components/ui/IconButton';
import { Notice } from '../../components/ui/Notice';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { downloadDataURL, slugify } from '../../lib/images';
import { downloadProjectFile, parseProjectFile } from '../../lib/projectFile';
import { useProjectStore } from '../../store/useProjectStore';
import type { FeatureKind, GeneratedImage } from '../../types';

const FEATURE_LABEL: Record<FeatureKind, string> = {
  render: 'Isometric',
  elevation: 'Elevation',
  axonometric: 'Axonometric',
  interior: 'Interior',
  moodboard: 'Material board',
};

/** How long the "project imported" confirmation stays on screen. */
const IMPORTED_NOTICE_MS = 6000;

interface GalleryItem {
  image: GeneratedImage;
  group: string; // display group heading
  feature: FeatureKind | null; // null = direct upload (no restore target)
  prompt?: string;
  createdAt: number;
}

function GalleryCard({ item, onView }: { item: GalleryItem; onView: () => void }) {
  const sendToFeature = useProjectStore((s) => s.sendToFeature);
  const removeImage = useProjectStore((s) => s.removeImage);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <figure className="group flex flex-col overflow-hidden rounded-card border border-hairline bg-paper shadow-card transition-all hover:-translate-y-0.5 hover:border-ochre/50 hover:shadow-card-lg">
      <button
        type="button"
        onClick={onView}
        className="aspect-[4/3] w-full overflow-hidden border-b border-hairline bg-drafting"
        title="View full screen"
        aria-label={`View ${item.image.label} full screen`}
      >
        {/* Fixed ratio: mixed intrinsic heights left ragged dead space under the
            shorter cards while the grid stretched every row to equal height. */}
        <img
          src={item.image.url}
          alt={item.image.label}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </button>
      <figcaption className="flex flex-col gap-3 px-4 py-4">
        <span
          className="truncate text-label text-graphite"
          title={item.prompt ? `Prompt: ${item.prompt}` : item.image.label}
        >
          {item.image.label}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {item.feature ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowUpRight size={14} strokeWidth={1.75} />}
              onClick={() => sendToFeature(item.feature as FeatureKind, item.image.url)}
              title={`Reuse as the ${FEATURE_LABEL[item.feature]} input`}
            >
              Reuse
            </Button>
          ) : null}
          {/* title keeps the short form; the accessible name is unchanged. */}
          <IconButton
            icon={<Download size={16} strokeWidth={1.75} />}
            label={`Download ${item.image.label}`}
            title="Download"
            onClick={() => downloadDataURL(item.image.url, `${slugify(item.image.label)}.jpg`)}
          />
          {confirmDelete ? (
            <span className="ml-auto flex items-center gap-2">
              <Button variant="danger" size="sm" onClick={() => removeImage(item.image.id)}>
                Delete
              </Button>
              <IconButton
                icon={<X size={16} strokeWidth={1.75} />}
                label="Cancel delete"
                title="Cancel"
                onClick={() => setConfirmDelete(false)}
              />
            </span>
          ) : (
            <IconButton
              icon={<Trash2 size={16} strokeWidth={1.75} />}
              label={`Delete ${item.image.label}`}
              title="Delete this image"
              tone="danger"
              className="ml-auto"
              onClick={() => setConfirmDelete(true)}
            />
          )}
        </div>
      </figcaption>
    </figure>
  );
}

export function GalleryFeature() {
  const project = useProjectStore((s) => s.project);
  const importProject = useProjectStore((s) => s.importProject);
  const importRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  // The confirmation used to have no counterpart to setImported(true), so it sat
  // on the page for the rest of the session.
  useEffect(() => {
    if (!imported) return undefined;
    const t = window.setTimeout(() => setImported(false), IMPORTED_NOTICE_MS);
    return () => window.clearTimeout(t);
  }, [imported]);

  // Every image in the project, newest asset first, grouped for display.
  const groups = useMemo(() => {
    const items: GalleryItem[] = [];
    for (const asset of [...project.assets].sort((a, b) => b.createdAt - a.createdAt)) {
      for (const image of asset.outputs) {
        items.push({
          image,
          group: `${FEATURE_LABEL[asset.feature]}s`,
          feature: asset.feature,
          prompt: asset.prompt,
          createdAt: asset.createdAt,
        });
      }
    }
    for (const image of project.uploads) {
      items.push({ image, group: 'Uploaded', feature: null, createdAt: image.createdAt });
    }
    const byGroup = new Map<string, GalleryItem[]>();
    for (const item of items) {
      const list = byGroup.get(item.group) ?? [];
      list.push(item);
      byGroup.set(item.group, list);
    }
    return [...byGroup.entries()];
  }, [project.assets, project.uploads]);

  const total = groups.reduce((n, [, list]) => n + list.length, 0);
  // Flat, group-ordered list for the lightbox; each card knows its flat index.
  const flat = groups.flatMap(([, list]) => list);

  const onImportFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setImportError(null);
    setImported(false);
    try {
      const text = await file.text();
      const parsed = parseProjectFile(text);
      importProject(parsed);
      setImported(true);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not import that file.');
    }
    if (importRef.current) importRef.current.value = '';
  };

  return (
    <div>
      <SectionHeader
        index="06"
        eyebrow="Gallery · Save / Load"
        title="Gallery"
        description="Everything generated or uploaded in this project. Reuse any image as an input, download it, or save the whole project to a file and load it back later — on any machine."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              icon={<FileDown size={16} strokeWidth={1.75} />}
              onClick={() => downloadProjectFile(project)}
            >
              Export project
            </Button>
            <Button variant="secondary" icon={<FileUp size={16} strokeWidth={1.75} />} onClick={() => importRef.current?.click()}>
              Import project
            </Button>
          </div>
        }
      />

      {importError ? (
        <div className="mb-6">
          <ErrorBanner message={importError} onRetry={() => importRef.current?.click()} />
        </div>
      ) : null}
      {imported ? (
        <div className="mb-6">
          <Notice
            tone="success"
            message="Project imported — all its images are below, and every tab has been reset to the imported project."
            onDismiss={() => setImported(false)}
          />
        </div>
      ) : null}

      {total === 0 ? (
        <EmptyState
          icon={Images}
          title="Nothing here yet"
          description="Images you generate on any tab collect here automatically. You can also import a previously exported project file."
          action={
            <Button icon={<FileUp size={15} strokeWidth={1.75} />} onClick={() => importRef.current?.click()}>
              Import a project file
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          <p className="text-caption text-mist">
            {total} image{total === 1 ? '' : 's'} in this project
          </p>
          {groups.map(([group, items]) => (
            <div key={group}>
              <p className="section-heading mb-3">{group}</p>
              {/* lg step included: 2→4 columns ballooned the cards between 1024 and 1280px. */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <GalleryCard
                    key={item.image.id}
                    item={item}
                    onView={() => setViewIndex(flat.findIndex((f) => f.image.id === item.image.id))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewIndex !== null && flat.length > 0 ? (
        <Lightbox
          images={flat.map((f) => f.image)}
          index={Math.min(viewIndex, flat.length - 1)}
          onClose={() => setViewIndex(null)}
          onIndex={setViewIndex}
        />
      ) : null}

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => void onImportFile(e.target.files)}
      />
    </div>
  );
}
