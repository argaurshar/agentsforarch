import { ArrowUpRight, Download, FileDown, FileUp, Images, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Lightbox } from '../../components/Output/Lightbox';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
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
};

const ICON_BTN =
  'flex items-center justify-center border border-hairline bg-paper p-1.5 text-graphite hover:bg-drafting focus-visible:outline-ochre';

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
    <figure className="group flex flex-col border border-hairline bg-paper transition-colors hover:border-ochre/50">
      <button
        type="button"
        onClick={onView}
        className="overflow-hidden border-b border-hairline bg-drafting focus-visible:outline-ochre"
        title="View full screen"
        aria-label={`View ${item.image.label} full screen`}
      >
        <img src={item.image.url} alt={item.image.label} className="max-h-48 w-full object-contain" />
      </button>
      <figcaption className="flex flex-col gap-2 px-3 py-3">
        <span className="mono-meta truncate" title={item.prompt ? `Prompt: ${item.prompt}` : item.image.label}>
          {item.image.label}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {item.feature ? (
            <button
              type="button"
              onClick={() => sendToFeature(item.feature as FeatureKind, item.image.url)}
              className={`${ICON_BTN} gap-1 px-2 font-mono text-[0.6rem] uppercase tracking-[0.12em]`}
              title={`Reuse as the ${FEATURE_LABEL[item.feature]} input`}
            >
              <ArrowUpRight size={13} strokeWidth={1.75} /> Reuse
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => downloadDataURL(item.image.url, `${slugify(item.image.label)}.jpg`)}
            className={ICON_BTN}
            title="Download"
            aria-label={`Download ${item.image.label}`}
          >
            <Download size={15} strokeWidth={1.75} />
          </button>
          {confirmDelete ? (
            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => removeImage(item.image.id)}
                className="border border-ochre bg-paper px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ochre hover:bg-drafting focus-visible:outline-ochre"
              >
                Delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={ICON_BTN} title="Cancel" aria-label="Cancel delete">
                <X size={14} strokeWidth={1.75} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={`${ICON_BTN} ml-auto`}
              title="Delete this image"
              aria-label={`Delete ${item.image.label}`}
            >
              <Trash2 size={15} strokeWidth={1.75} />
            </button>
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
        <p className="mb-6 border border-ochre bg-drafting px-3 py-2 text-xs leading-relaxed text-ochre">{importError}</p>
      ) : null}
      {imported ? (
        <p className="mb-6 border border-hairline bg-drafting px-3 py-2 text-xs leading-relaxed text-graphite">
          Project imported — all its images are below, and every tab has been reset to the imported project.
        </p>
      ) : null}

      {total === 0 ? (
        <EmptyState
          icon={Images}
          title="Nothing here yet"
          description="Images you generate on any tab (or upload into the presentation) collect here automatically. You can also import a previously exported project file."
          action={
            <Button icon={<FileUp size={15} strokeWidth={1.75} />} onClick={() => importRef.current?.click()}>
              Import a project file
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          <p className="mono-meta text-mist">
            {total} image{total === 1 ? '' : 's'} in this project
          </p>
          {groups.map(([group, items]) => (
            <div key={group}>
              <p className="mono-meta mb-3">{group}</p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
