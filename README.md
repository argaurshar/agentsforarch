# AND Studio — Internal Visualization Platform

A single-page tool for AND Studio's architects and interior designers: turn
sketches and models into renders, elevations, axonometric views, and client
concept presentations.

Built to the internal build spec (`build.mb`).

## Quick start

Runs with **zero configuration and zero API keys** against a built-in mock
image provider.

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

## The four features

All four are always available from the sidebar, in any order — none is locked,
disabled, or gated behind another.

| # | Feature | Input | Output |
|---|---------|-------|--------|
| 01 | Sketch / Plan → Render | Hand sketch or floor plan | Styled architectural render (with before/after compare) |
| 02 | Sketch / Model → Elevation | Sketch or SketchUp screenshot | Elevation design render |
| 03 | Elevation → Axonometric | Elevation image | Axonometric + section-axonometric views, one per viewpoint |
| 04 | Concept Presentation | Selected outputs from 01–03 | Arranged slides, exportable to PDF |

Each feature accepts its input by direct upload, independent of anything else
in the session. Feature 03 works from a directly uploaded elevation without
running feature 02 first. Feature 04 is reachable with zero generated images
and shows a helpful empty state.

## Architecture

- **React 18 + TypeScript (strict)**, **Vite**, **Tailwind CSS**, **Zustand**,
  **react-dropzone**, **jspdf**, **lucide-react**.
- **Image providers** (`src/providers/`) sit behind a single `ImageProvider`
  adapter. No component calls an image API directly — they resolve a provider
  via `getActiveProvider()`, which returns the first configured real provider
  (Magnific / Flux — stubs here) or the always-available mock. The active
  provider name is shown in the footer.
- **Storage** (`src/storage/`) is behind a `StorageAdapter` interface with an
  in-memory implementation. No `localStorage` / `sessionStorage` is used
  anywhere; a durable adapter can drop in later.
- **State** lives in a Zustand store (`src/store/`), the only path to the
  project model — leaving clean seams for auth and persistence.

### Wiring a real provider

Copy `.env.example` to `.env` and set a key:

```bash
# VITE_MAGNIFIC_KEY=...
# VITE_FLUX_KEY=...
```

The app auto-selects the first configured provider. The real providers are
stubs in this build (they throw until implemented); the mock always works.

## Design language

Warm "drafting-instrument" palette (Bone background, Ink, single Ochre accent),
square corners only, hairline borders instead of shadows, serif headings
(Fraunces), and a mono Ochre eyebrow (`01  /  SKETCH TO RENDER`) opening every
section.

## Open questions

A few items from the spec (§12) are intentionally left for the studio to
confirm — see the pull request description: the Feature 03 label
("Axonometric" vs "Ergonomical Perception"), which real provider goes live
first, the deployment target, PDF branding, and whether a project switcher is
needed now.
