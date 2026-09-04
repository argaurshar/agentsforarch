# AND Studio — one image in, thirty drawings out

Drop a plan, a sketch or a photo of a room. Two clicks later you have the
isometric, the elevation, the section, the diagram or the material board.
Thirty architectural transformations, all of them running in your browser.

The name and the promise live in exactly one file, `src/lib/brand.ts`, and the
tool count in them is read from the registry rather than typed. The static
`<meta>` tags in `index.html` are the one surface that cannot import it — a
crawler reads them before any JavaScript runs — so `registryLint` recomputes
them and fails when they drift.

**▶ Live app:** https://argaurshar.github.io/agentsforarch/ — a fully functional
tool. It needs one of your own API keys to generate: a Google **Gemini** key
(Nano Banana Pro) **or** a kie.ai key (Nano Banana 2). You are asked for it at
your first generation, not on arrival, and it is remembered afterwards. Both are
free to get, stay in your browser, and are never sent anywhere but Google /
kie.ai. The key button in the top bar is there if you would rather set it up
first, or switch engines.

Built to the internal build spec (`build.mb`).

## Quick start

The app generates **real** output only — there is no demo/placeholder engine.
Bring a Gemini or kie.ai key; it is asked for the first time you generate.

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
npm run qa         # static gates — no browser, no API calls, no cost
npm run qa:e2e     # browser suite against `npm run preview`, network mocked
node qa/makeOgCard.cjs  # regenerate public/og.jpg (committed; run after a rename)
```

`qa:e2e` carries the one assertion the front door exists to satisfy: **from an
empty page, two clicks reach a result.** It counts the clicks rather than
describing the flow, because a flow description stays true while the count
doubles.

`npm run qa` is what CI runs, and it exists because **TypeScript cannot see a
changed prompt string**. Five gates, each catching something the others cannot:

| Gate | Catches |
|---|---|
| `designLint` | design-system drift — an unregistered type size, a squared-off panel, a zeroed radius or shadow scale, a suppressed focus ring |
| `registryLint` | a tool that is incomplete, unreachable, missing from a derived table, or offered for an image it cannot read |
| `verifyContracts` | a tool whose own default prompt no longer satisfies the contract it declares |
| `verifyQuick` | a control the user can tap that changes nothing about the request |
| `promptSnapshot` | any prompt whose wording changed, across every enumerated variant |
| `promptContradictions` | a prompt that asks for a thing and forbids it in the same breath |

`verifyQuick` is the newest and it earned its place on its first run, finding
two axes whose options built byte-identical requests. One was a gate bug (an
engine parameter that never reaches the prompt); the other was real — an "apply
to one named element" chip that does nothing until an element is named, in a
sheet with nowhere to name one.

The contradiction gate is the least obvious and the most valuable. The two worst bugs this
app has shipped were both self-contradictory prompts, not missing ones — a
prompt can satisfy every contract and pass the snapshot while instructing the
model to do and not do the same thing.

## Two clicks

The app opens on a drop zone, and that is the whole front door. Drop a plan, a
sketch or a photo of a room — or paste one, shoot one, or tap a sample — and it
shows you what that image can become. Tap one of those. That is the result.

```
drop / paste / shoot          →  "This is a…"  →  "Make it…"  →  the result
(or tap a bundled sample)        one chip row     a shortlist    + what's next
```

What a result can become next comes from what its tool **produces**, not what
went into it (`outputKind`): a rendered elevation made from a sketch is a
*building*, so it is offered the building tools rather than the sketch tools it
has already been through. Tools whose output the app has no input kind for — a
section, a sheet, a diagram, a board — say so by ending the chain rather than
pretending.

The chip is a **guess**, made from the pixels — ink on white is a drawing, a
bright top edge is outside, flat and green-grey is satellite — and it is one tap
to correct. It costs nothing and calls nothing; the alternative was a paid
vision request on every drop, to decide something the user already knows.

The shortlist is **derived**. Every tool declares which kinds of image it can
read (`inputKind` on its registry entry), so dropping a floor plan filters
thirty tools to seven without anyone navigating a taxonomy. A new tool joins the
right shortlists by declaring what it reads — the same property that makes the
nav rows and the prompt snapshot derived rather than maintained.

Your **API key is asked once**, at your first generation, in the slot where the
result will appear — not by a drawer that opens itself before you have seen the
app. It is remembered by default, so coming back costs nothing. There is a
switch to turn that off for a shared machine.

### The samples need no key at all

This app ships twenty-one real input→output pairs it produced itself. So when
the input **is** one of those bundled images and the tool **is** the one that
made the pair, the result already exists: the card is marked *No key needed* and
tapping it hands the finished image over instantly, with no request and no cost.

Two of those chain and stay free:

```
a sketch  →  Render an elevation  →  Turn it axonometric
a room    →  Redesign it          →  Board it
```

Every result served this way says so on screen — *"This one was prepared
earlier… your own image runs for real"* — and offers **Try it on your own
image** as its primary action. A demo that lets someone believe their own file
came back in 200ms for free is a lie, not a feature, so `qa:e2e` asserts the
wording as well as the behaviour.

The map is **derived from the worked examples**, not hand-written: a new example
becomes a new instant path by existing, and a renamed asset cannot leave a
dangling filename behind. `registryLint` checks every referenced asset is
actually shipped, and that every sample on the drop zone has at least one tool
that can answer it for free.

### Tweaking a result

A result is rarely the last word, so it has a **Tweak** sheet — and the sheet
holds two different runs rather than one ambiguous "Regenerate":

| | What it changes | What it runs on |
|---|---|---|
| **Settings** | the recipe — a different light, face, palette, hatching | your original image, again |
| **Change this image** | the output — warmer light, more glass, remove the people | the result on screen |

Collapsing those into one button would mean guessing which you meant, and the
same words produce visibly different images depending on the answer.

**Nothing fires on change.** The plan for this step said "regenerate on change";
on a tool that bills per image, a chip row that spends money on every tap is a
trap. Each section has its own button and says what it is about to do, and
`qa:e2e` asserts that changing a setting and picking a refine chip both leave
the network untouched.

The settings in the sheet are the tool's **declared axes** (`quick` on its
registry entry), and the tool's own screen renders them from the same
declaration through one `<QuickControls>`. That is the whole reason the field
exists: two hand-written copies of "Light: golden / overcast / midday" is the
parallel table this codebase keeps deleting, and the second copy is the one that
would silently lose an option. `registryLint` fails a screen that hand-writes a
control for a key its registry entry already declares.

Not everything is an axis. Free-text fields, ordered multi-selects, scene
sliders and extra dropzones stay on the tool screen, because a one-tap chip
cannot express them — and an axis that only matters once a text field is filled
is not self-sufficient enough to belong in a sheet that has no text field.

### Sharing a result

A result is the only thing here worth sending someone, and it can travel two
ways.

**The picture.** *Share* composes a square before/after card in a canvas — the
pair, the verb, the name, the address — and hands it to the OS share sheet.
Where there is no share sheet it goes to the clipboard as a PNG; where the
clipboard is refused it downloads. Three paths, tried in order, because no one
of them exists everywhere and the feature detections lie: desktop Chrome defines
`navigator.share` and then rejects files.

**The link.** A result made from your own image cannot travel in a URL — the
image is yours, and it is megabytes — so the link carries the *recipe* instead:

```
#/do/axonometric                        open the studio with this tool queued
#/do/axonometric?from=elev-rendered.jpg …and start from this bundled image
```

The second shape is the one that spreads: it lands a stranger on the exact
prepared result, with no key, no upload and no account, and *Try it on your own
image* is the button under it. The first shape is what a link to your own result
becomes — the tool is queued and says so, so the recipient's first drop goes
straight to the answer in one click instead of two.

`from` is validated against the assets actually shipped, and every malformed
shape — an unknown tool, a text-only tool, an asset that was renamed — lands on
the drop zone rather than a blank screen. That matters more here than anywhere
else in the app: a shared URL is the one address nobody can fix by hand.

Link previews are a real file, not a promise: `qa/makeOgCard.cjs` renders
`public/og.jpg` from `plan-input.jpg` and the isometric this app made from it,
reading the name and the tool count out of the source so the card cannot claim
something the registry no longer supports.

## The tools

Thirty generation tools, also grouped by the stage of the job they belong to.
**All tools** is the index: every one of the thirty, in its category, with what
it reads. Each category there links to its **tool rail** — tick as many tools as
you want, drop **one** image, and press **Synthesize** — they all run on it, one
at a time, each with its own settings.

That index replaced a "project dashboard" whose nav row promised *"Every tool,
with full controls"* and listed **four of thirty**: it was a pipeline map over
the tools that happened to declare a `stage` field, and the promise had been
wrong since the fifth tool shipped. Nothing caught it, because nothing tied the
destination's contents to the registry — the filter was legitimate code doing
exactly what it said. Two rules do now: `registryLint` fails an index that
filters its tools, and `qa:e2e` counts what the screen lists against
`FEATURE_KEYS`.

Its other jobs went where they were already being done better: the front door is
the way in, the chain row tells the pipeline story from what each tool actually
*produces*, and the Gallery holds the outputs. `stage` went with it — with its
only reader gone it was a write-only field on four tools, the same shape as
`sceneShow` before it.

Each tool also has its own screen (`Open for full settings`, or `#/<tool>`) where
every control lives, including the prompt. The front door and the tool screen run
the same code and share the same output: tapping a card *is* running that tool.

| Category | Tools |
|---|---|
| **Concept & Form** | Massing Study · Sketch to Render |
| **Plans & Drawings** | Sketch to CAD Plan · Isometric · Elevation · Axonometric · CAD Elevation · Section · Render to Plan |
| **Site & Urban** | Bird's Eye View · Urban Context |
| **Visualization** | Wireframe to Render · Render Refinement · Atmosphere & Light · Facade Material Study · Add Human Scale · Multi-View Sheet · Reflection Control · Upscale for Print · Watercolour Sketch |
| **Interiors** | Interior Design · Declutter · Place Object · Targeted Edit · FF&E Spec Sheet |
| **Diagrams & Boards** | Floor Analysis · Program Diagram · Exploded Axonometric · Annotation Sketch · Material & Mood Board |

The nav is **three** destinations: **Start** (the front door), **All tools**
(the index above) and **Gallery** (every generated and uploaded image, with
reuse / download / delete, and whole-project export/import as a single file —
the no-backend persistence answer). It used to be nine — six of them category
rows, which were the right answer when the nav *was* the way in. Nobody
navigates a taxonomy to find a tool now, so the categories moved one route along
into the index, where they still each link to their own batch screen.
The `#` is the tool's number **within its category**, which is what the app's
section header shows. It is derived from position, so it can never disagree.

| # | Tool | Input | Output |
|---|------|-------|--------|
| 01 | Brief → Massing Study | **No image at all** — a typed brief, plot size, density and context | A white study **massing model**, photographed three-quarter aerial. Deliberately no materials, glazing or entourage: a massing study earns its keep by refusing to answer questions it is too early to ask |
| 02 | Hand Sketch → Finished Image | A photo or scan of a rough sketch | The same drawing resolved — as an illustration, a photoreal render, or a hybrid that keeps your linework over the colour. Its whole discipline is refusal: same viewpoint, same masses, **no wing, tower or storey you did not draw** |
| 01 | Hand Sketch → CAD Plan | A napkin sketch or marker-on-trace plan | A precise 2D plan: straightened walls with poché, door swing arcs, window breaks, optional fixtures. It **draws up** the sketch rather than redesigning it — the same footprint contract that fixed the squared-off isometric |
| 02 | Floor Plan → 3D Isometric | 2D floor plan | **3D isometric "dollhouse" cutaway** or a **fully furnished top-down 2D marketing plan** — plus **Compare styles** (one plan × up to 4 design languages in one batch) and a before/after compare |
| 03 | Sketch / Model → Elevation | Sketch or SketchUp screenshot | Rendered elevation, styled by a **design theme** (Contemporary / Modern / Traditional / Boho chic) **or an uploaded mood board** |
| 04 | Elevation **or 3D Model** → Axonometric | An elevation image, **or** a SketchUp / Revit / Rhino viewport screenshot | True 3D axonometric + section-axonometric views in **realistic / line-art / black-&-white**, one per viewpoint. Say which input you gave it: from an elevation the depth behind the face is **inferred** (and the output says so), from a model it is **read off the image** and flattening the perspective is the whole job |
| 05 | 3D Model → CAD Elevation | A SketchUp / Revit / Rhino viewport screenshot | The **measured line elevation** for the drawing set — perspective flattened out, level lines, optional material hatching and dimension chains. Distinct from 03, which renders an elevation for a client |
| 06 | Architectural Section | A 3D view, render or plan | A **vertical cut** through the building: floor slabs and cut walls in solid poché, room interiors and the stair beyond, real ceiling heights, optional figures for scale |
| 07 | 3D View → Floor Plan | A render, 3D view or photograph | The **floor plan the image implies** — the pipeline run backwards. Carries a visible accuracy warning: one viewpoint cannot show a whole plan, so part of it is inference |
| 01 | Satellite Screenshot → Aerial Photograph | A Google Earth or Maps screenshot | A cinematic drone shot of the same place. Strips the map interface — pins, search bar, watermarks, road labels — then invents the elevation a top-down image cannot show. Carries an accuracy warning: heights and planting are inferred |
| 02 | Isolated Building → Real Street | A render or photo of the building alone | The same building, untouched, in a street of the chosen density and city. Carries an accuracy warning — the neighbours are invented, not surveyed |
| 01 | Wireframe → Photoreal Render | A wireframe, clay or shaded viewport | A finished render with materials, light and setting. The modelled geometry is fixed input — it will not add a window to balance the elevation |
| 02 | Draft Render → Finished Render | A rough, quick or AI render | The **same image, produced properly**: resolved materials, correct contact shadows, believable glass. Changes nothing about the design, view or light |
| 03 | Re-light the Render | Any finished render | Golden hour, overcast, dusk, winter — the scene vocabulary pointed at an image that **already exists** rather than a new one |
| 04 | Facade Material Study | A render or photo of the facade | The same building in a different cladding. The openings are locked hard: **a new material does not get new windows** |
| 05 | Add Life and Human Scale | A finished render, ideally empty | People, vehicles and planting. Figures measured against door height rather than sized by eye, occupied rather than posed |
| 06 | Multi-View Presentation Sheet | A render or photo of the building | Several views on one sheet. Carries an accuracy warning — the hard part is that every panel must be **the same building**, not four similar ones |
| 07 | Reflection Control | A render with glazing | Transparent enough to look occupied, or mirrored enough to disappear. Reflections break at every mullion and vary pane by pane |
| 08 | Upscale for Print | The approved image | A print master that **resolves** detail rather than inventing it. Sends `resolution` on the kie.ai engine; on Gemini the screen says so rather than under-delivering |
| 09 | Render → Watercolour | Any render, elevation or photograph | The same building painted in watercolour. Useful **because** it looks unfinished — a wash invites comment on the idea where a photoreal render invites argument about the brick. The paint is loose; the geometry is not |
| 01 | Room Photo → Interior Design | Photo of a room (furnished or empty) | **Restyled / staged / renovated interior** in a chosen design theme, or from an uploaded mood board, with interior-specific refine chips |
| 02 | Messy Room → Empty Shell | Photo of a cluttered room | The **bare architectural shell**, ready to re-stage — everything movable removed and the surfaces behind it repaired, with fitted joinery optionally kept |
| 03 | Place Object | Room photo **+ a product shot** | That **exact** product placed in the room — furniture (contact shadow), a light fitting (switched on, lighting the room) or artwork (mounted flat to the wall) |
| 04 | Targeted Edit | Any interior photo | **One named thing changed** and nothing else — no mask, the target is described in words |
| 05 | FF&E Spec Sheet | A finished interior | A **knolled flat-lay component inventory** of that room on white, each item captioned with its material or finish |
| 01 | Floor Plan → Analysis Diagram | A floor plan | The plan in light grey with **exactly one** analysis over it — circulation, zoning, daylight or structure. One layer at a time on purpose: four at once is a colourful mess, four runs is a series |
| 02 | Building → Program Breakdown | A render, elevation or photo of the whole building | The floors separated and labelled with what each one is for. The hard part is that each slab must stay recognisably **this** building rather than a generic stack that shares a colour scheme |
| 03 | Building → Exploded Axonometric | A render, model view or photo | Roof, frame, floor plates, envelope and ground pulled apart along one axis, in true axonometric projection. Distinct from 02: that one names floors, this one shows how it assembles |
| 04 | Image → Annotated Diagram | Any render, section, plan or photograph | Arrows, flow lines and labels drawn **on** your image — circulation, ventilation, sun path, program, structure or your own subject. The base image is locked so the comparison still holds |
| 05 | Material & Mood Board | Any image (render, sketch or photo) — or up to 9 outputs in Collage mode | **AI board** (default): a flat-lay material & mood board **extracted from the image** — labelled samples, furniture suggestions, colour dots, a 5-swatch palette strip and a vibe line. **Collage**: the branded canvas grid board |

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
  (Contemporary, Bauhaus, Indian vernacular, Brutalist, Minimalist, Biophilic,
  Futuristic, Mediterranean, Scandinavian, Japanese, Art Deco, plus a Custom
  free-text field) reshapes the
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
that engine's API key. The panel never opens itself — the key is asked at your
first generation instead, in the slot where the result will appear. This is the
way in if you would rather set it up first, or switch engines:

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
