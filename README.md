# AND Studio — Internal Visualization Platform

A single-page tool for AND Studio's architects and interior designers: turn
sketches and models into renders, elevations, axonometric views, interior
redesigns and material boards.

**▶ Live app:** https://argaurshar.github.io/agentsforarch/ — a fully functional
tool. It needs one of your own API keys to generate: a Google **Gemini** key
(Nano Banana Pro) **or** a kie.ai key (Nano Banana 2). Connect it from the key
button in the top bar — on desktop that panel also opens by itself on the first
visit; on a phone it does not, so the dashboard and its worked examples land
first. Both are free to get, stay in your browser, and are never sent
anywhere but Google / kie.ai.

Built to the internal build spec (`build.mb`).

## Quick start

The app generates **real** output only — there is no demo/placeholder engine.
Bring a Gemini or kie.ai key and add it in **Settings** on first run.

```bash
npm install
npm run dev
```

Then open the printed local URL.

### Other scripts

```bash
npm run build      # type-check (strict) + production build
npm run typecheck  # type-check only
npm run preview    # preview the production build
```

## The tools

Fourteen generation tools, grouped by the stage of the job they belong to. Pick a
category in the sidebar and you get its **tool rail**: tick as many tools as you
want, drop **one** image, and press **Synthesize** — they all run on it, one at a
time, each with its own settings. Nothing is ever locked, disabled or gated
behind another tool.

Each tool also has its own screen (`Open for full settings`, or `#/<tool>`) where
its controls live and where it can be run on its own.

| Category | Tools |
|---|---|
| **Concept & Form** | Massing Study |
| **Plans & Drawings** | Sketch to CAD Plan · Isometric · Axonometric · Elevation · CAD Elevation · Section · Render to Plan |
| **Interiors** | Interior Design · Declutter · Place Object · Targeted Edit · FF&E Spec Sheet |
| **Diagrams & Boards** | Material & Mood Board |

Plus two fixed destinations: **Home** (project dashboard — pipeline map with
live counts and thumbnails, recent outputs, getting-started steps and a bundled
**sample floor plan**) and **Gallery** (every generated and uploaded image, with
reuse / download / delete, and whole-project export/import as a single file —
the no-backend persistence answer).
The `#` is the tool's number **within its category**, which is what the app's
section header shows. It is derived from position, so it can never disagree.

| # | Tool | Input | Output |
|---|------|-------|--------|
| 01 | Brief → Massing Study | **No image at all** — a typed brief, plot size, density and context | A white study **massing model**, photographed three-quarter aerial. Deliberately no materials, glazing or entourage: a massing study earns its keep by refusing to answer questions it is too early to ask |
| 01 | Hand Sketch → CAD Plan | A napkin sketch or marker-on-trace plan | A precise 2D plan: straightened walls with poché, door swing arcs, window breaks, optional fixtures. It **draws up** the sketch rather than redesigning it — the same footprint contract that fixed the squared-off isometric |
| 02 | Floor Plan → 3D Isometric | 2D floor plan | **3D isometric "dollhouse" cutaway** or a **fully furnished top-down 2D marketing plan** — plus **Compare styles** (one plan × up to 4 design languages in one batch) and a before/after compare |
| 04 | Sketch / Model → Elevation | Sketch or SketchUp screenshot | Rendered elevation, styled by a **design theme** (Contemporary / Modern / Traditional / Boho chic) **or an uploaded mood board** |
| 03 | Elevation → Axonometric | Elevation image | True 3D axonometric + section-axonometric views in **realistic / line-art / black-&-white**, one per viewpoint |
| 05 | 3D Model → CAD Elevation | A SketchUp / Revit / Rhino viewport screenshot | The **measured line elevation** for the drawing set — perspective flattened out, level lines, optional material hatching and dimension chains. Distinct from 03, which renders an elevation for a client |
| 06 | Architectural Section | A 3D view, render or plan | A **vertical cut** through the building: floor slabs and cut walls in solid poché, room interiors and the stair beyond, real ceiling heights, optional figures for scale |
| 07 | 3D View → Floor Plan | A render, 3D view or photograph | The **floor plan the image implies** — the pipeline run backwards. Carries a visible accuracy warning: one viewpoint cannot show a whole plan, so part of it is inference |
| 01 | Room Photo → Interior Design | Photo of a room (furnished or empty) | **Restyled / staged / renovated interior** in a chosen design theme, or from an uploaded mood board, with interior-specific refine chips |
| 02 | Messy Room → Empty Shell | Photo of a cluttered room | The **bare architectural shell**, ready to re-stage — everything movable removed and the surfaces behind it repaired, with fitted joinery optionally kept |
| 03 | Place Object | Room photo **+ a product shot** | That **exact** product placed in the room — furniture (contact shadow), a light fitting (switched on, lighting the room) or artwork (mounted flat to the wall) |
| 04 | Targeted Edit | Any interior photo | **One named thing changed** and nothing else — no mask, the target is described in words |
| 05 | FF&E Spec Sheet | A finished interior | A **knolled flat-lay component inventory** of that room on white, each item captioned with its material or finish |
| 01 | Material & Mood Board | Any image (render, sketch or photo) — or up to 9 outputs in Collage mode | **AI board** (default): a flat-lay material & mood board **extracted from the image** — labelled samples, furniture suggestions, colour dots, a 5-swatch palette strip and a vibe line. **Collage**: the branded canvas grid board |

Every tool accepts its input by direct upload, independent of anything else in
the session — Axonometric works from a directly uploaded elevation without
running Elevation first.

### Inputs

Most tools take one image. Three capabilities go beyond that, and each is worth
knowing about:

- **A second image of its own.** Place Object needs the room *and* the product
  shot, and the prompt addresses them by position — "the FIRST image… the
  SECOND". Tools declare their extra input slots, and the shell renders one
  labelled dropzone each.
- **No image at all.** Massing Study generates from a typed brief. With no input
  image holding the model to anything, whatever you leave unsaid gets invented
  plausibly and confidently — which is why that screen is a form with specific
  fields rather than one free-text box.
- **A marked region.** Targeted Edit lets you drag a red box over the area to
  work on, because language alone cannot point. The box is burned into the pixels
  only when you press Generate, so your original is never touched and the mark
  can be redrawn freely — and the prompt tells the model in as many words that
  the rectangle is an annotation to erase, not part of the scene.

### Batch runs and cost

Synthesize is a paid generation per selected tool, on your own key, so the count
is never hidden. Up to three tools runs on the click; above that the button
states the count and asks first, and **Select all** always asks. Runs are
sequential and cancelling keeps whatever has already been generated.

A tool that needs more than the shared image — Place Object wants a product shot
of its own — says so in the rail and sends you to its own screen instead of
silently doing something else.

## Architecture

- **React 18 + TypeScript (strict)**, **Vite**, **Tailwind CSS**, **Zustand**,
  **react-dropzone**, **lucide-react**.
- **Image providers** (`src/providers/`) sit behind a single `ImageProvider`
  adapter. No component calls an image API directly — they resolve a provider
  via `getActiveProvider()`, which returns the first configured real provider
  (Nano Banana Pro or kie.ai Nano Banana 2 per the Settings engine picker; then Magnific / Flux stubs), or `null` when no key is set so
  the UI can prompt for one. The active engine is shown in the top bar and footer.
- **Storage** (`src/storage/`) is behind a `StorageAdapter` interface with an
  in-memory implementation. Project data never touches `localStorage` /
  `sessionStorage`; the only opt-in use of `localStorage` is remembering the
  Gemini API key/model (see below).
- **State** lives in a Zustand store (`src/store/`), the only path to the
  project model — leaving clean seams for auth and persistence.

### Prompts are automatic

Every generation feature ships an auto-generated, model-tuned prompt
(`src/lib/prompts.ts` + `src/lib/scene.ts`) that pre-fills the prompt field —
users never have to write one. The field stays fully editable, with a **Reset**
to return to the suggestion; changing any control regenerates the suggestion
unless you've edited it.

### Scene controls, refine loop & pipeline (no prompting for basics)

- **Scene controls** — one-click chips/selects for **architecture style,
  materials, lighting / time of day, season, mood, context, interior vs exterior,
  and people** assemble the prompt automatically (`src/components/Scene/SceneControls.tsx`).
  Change a material or the time of day without touching the prompt.
- **Architecture styles** — a one-click **Architecture style** picker
  (Contemporary, Bauhaus, Indian vernacular, Brutalist, Minimalist, Mediterranean,
  Scandinavian, Japanese, Art Deco, plus a Custom free-text field) reshapes the
  design language of the isometric plan render (`ARCH_STYLES` in `src/lib/scene.ts`).
- **Feature 01 · Floor Plan → 3D Isometric** — upload a 2D floor plan and it becomes
  a 3D isometric "dollhouse" cutaway (walls extruded, furniture in 3D, strict 45°
  camera, no roof, exact layout preserved). The only choices are **Architecture style**
  and **Materials** — no prompt to write. Every generation tab has a draggable
  **before/after slider**, and a single result is shown full-width at the same size as
  the input.
- **Refine loop** — every output has a **Refine** action that loads it back as
  the input with quick-action chips (warmer light, more glass, add greenery,
  remove people, simplify façade, …) and free text; the edit keeps the exact
  composition, geometry and camera and changes only what you picked. Refined
  outputs can be refined again.
- **Cross-feature pipeline** — **Send to Elevation / Axonometric** on any output
  seeds the next feature's input directly (no download/re-upload). Elevation also
  has an **All faces (Front · Side · Rear)** batch.
- **Reference-chaining** — a **Match a reference style** picker on the Isometric,
  Elevation and Interior tabs lets you pick any earlier output as a style reference;
  it rides alongside the input as a second image so a whole set (render → elevation →
  interior) shares one palette, materials and mood. A tab's own uploaded mood board
  takes precedence, and it's mutually exclusive with Compare styles.
- **Lightbox viewer** — click any output (or gallery image) for a full-screen
  viewer with zoom, drag-pan, arrow-key navigation, download, and **Crop for
  social** — export the image to **1:1 / 4:5 / 9:16 / 16:9** with a brand footer,
  ready to post.
- **Mood board** — the **Mood Board** tab composes up to nine pooled outputs into a
  single branded material & mood board on canvas (serif header, adaptive cover-fit
  grid with a centred partial last row, brand-accent footer) in Portrait / Landscape
  / Square, in a palette you control. Download it as a PNG or **Save to project**
  to reuse it — no generation call, entirely client-side (`src/lib/moodboard.ts`).
- **Deep links** — every tab has a URL (`#/interior`), so links are shareable and
  the browser back/forward buttons move between tabs.

Generation state (input, settings, outputs) lives in the store, so an in-flight
run survives a tab switch and can be **Cancelled**; a partial batch failure keeps
the images that succeeded. Nothing is persisted (in-memory by design) — a
`beforeunload` warning guards against losing work.

### Generating real images (two engines)

Open **Settings** (the key button, top-right), pick an **engine**, and paste
that engine's API key. On a desktop-width screen the panel opens by itself on
the first visit, since it sits beside the dashboard rather than over it; below
Tailwind's `md` breakpoint it is full-screen, so it stays closed until you tap
the button:

- **Google Gemini** — **Nano Banana Pro** (Gemini 3 Pro Image), called directly
  with your Gemini key. Get a free key at
  [Google AI Studio](https://aistudio.google.com/apikey).
- **kie.ai** — **Nano Banana 2** via kie.ai's task API (upload → createTask →
  poll → result), using your kie.ai key and credits. Get a key at
  [kie.ai](https://kie.ai/api-key).

Optionally "remember on this device". Because this is a static app with no
backend, your browser calls the chosen engine directly with your key — the key
never goes anywhere else. Until a key is set, the top bar shows **Connect key**
and Generate prompts you to add one.

The Magnific / Flux env-keyed stubs (`.env` → `VITE_MAGNIFIC_KEY`,
`VITE_FLUX_KEY`) remain as additional adapter seams.

## Design language

Warm "drafting-instrument" palette (Bone background, Ink, single Ochre accent),
square corners only, hairline borders instead of shadows, serif headings
(Fraunces), and a mono Ochre eyebrow (`01  /  SKETCH TO RENDER`) opening every
section. Fully responsive — a left rail on desktop collapses to a hamburger
drawer on mobile.

## Open questions

A few items from the spec (§12) are intentionally left for the studio to
confirm — see the pull request description: the Feature 03 label
("Axonometric" vs "Ergonomical Perception"), which real provider goes live
first, the deployment target, and whether a project switcher is needed now.
