# AND Studio — Internal Visualization Platform

A single-page tool for AND Studio's architects and interior designers: turn
sketches and models into renders, elevations, axonometric views, and client
concept presentations.

**▶ Live demo:** https://argaurshar.github.io/agentsforarch/ — runs in your
browser on the built-in mock engine (no key needed); add a Google Gemini key in
Settings to generate real images with Nano Banana Pro.

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
| 04 | Concept Presentation | Selected outputs from 01–03 + brand identity | AI-generated self-contained HTML deck, or hand-arranged slides exportable to PDF |

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
  (Nano Banana Pro; then Magnific / Flux stubs) or the always-available mock.
  The active engine is shown in the top bar and footer.
- **Storage** (`src/storage/`) is behind a `StorageAdapter` interface with an
  in-memory implementation. Project data never touches `localStorage` /
  `sessionStorage`; the only opt-in use of `localStorage` is remembering the
  Gemini API key/model (see below).
- **State** lives in a Zustand store (`src/store/`), the only path to the
  project model — leaving clean seams for auth and persistence.
- **Presentation generation** (`src/lib/slidesDeck.ts`) runs the vendored
  `frontend-slides` skill through Claude to produce a self-contained HTML deck;
  image placeholder tokens are swapped for embedded data URIs after generation
  so the downloaded file is fully portable. Used only by the Presentation tab.

### Prompts are automatic

Every generation feature ships an auto-generated, model-tuned prompt
(`src/lib/prompts.ts`) that pre-fills the prompt field — users never have to
write one. The field stays fully editable, with a **Reset** to return to the
suggestion; changing a control (style, elevation face, section) regenerates the
suggestion unless you've edited it.

### Generating real images (Nano Banana Pro)

Open **Settings** (the key button, top-right) and paste a Google **Gemini** API
key to switch the engine from the mock to **Nano Banana Pro** (Gemini 3 Pro
Image). Optionally "remember on this device". Because this is a static app with
no backend, your browser calls Google directly with your key — the key never
goes anywhere else. Get a free key at
[Google AI Studio](https://aistudio.google.com/apikey).

The Magnific / Flux env-keyed stubs (`.env` → `VITE_MAGNIFIC_KEY`,
`VITE_FLUX_KEY`) remain as additional adapter seams.

### Building a presentation (frontend-slides skill)

The Concept Presentation tab has two modes:

- **AI deck** (default) — Claude generates a distinctive, self-contained HTML
  presentation from your brand identity and images: a fixed 1920×1080 stage that
  scales to any screen, real motion, and keyboard/touch navigation. Preview it
  inline, download the single `.html` file, open it in a new tab, or print it to
  PDF. Choose a purpose / length / density (all optional, sensible defaults) and
  optionally add talking points — you never have to write a prompt.
- **Manual storyboard** — arrange pooled images into `full` / `two-up` /
  `four-grid` slides by hand (or let Claude compose them), then export a branded
  PDF.

Generation runs the open-source
[frontend-slides](https://github.com/zarazhangrui/frontend-slides) skill by
zarazhangrui. Its instruction and resource files are vendored **verbatim** under
`src/lib/skill/resources/` and sent to Claude (`claude-opus-4-8`) so every deck
follows the skill precisely — its fixed-stage rules, design system, and
animation grammar. Add a **Claude (Anthropic) API key** in Settings to enable
it; the browser calls Anthropic directly with your key. This skill is used
**only** on the Concept Presentation tab.

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
first, the deployment target, PDF branding, and whether a project switcher is
needed now.
