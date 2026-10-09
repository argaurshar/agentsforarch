# Test fixtures

`guide/` holds inputs from the paid guide *51+ Nano Banana 2 Workflows for
Architects & Interior Designers*. They are **test-only**: git-ignored, never
committed, never used as a published example (this repository is public, and
several are Google Maps / Earth screenshots that cannot be republished).

A live run names one as `guide:<file>` (see `qa/liveRuns.ts`). If the file is
missing the harness stops before sending anything, so nothing is billed.

## Getting them

They come from the guide's Notion pages (signed file URLs, valid for minutes),
so they are fetched by whoever runs the tests, not by a script in this repo.
Save each as JPEG, longest side 1600 px, under the name below.

| File | Guide use case | Used by |
|---|---|---|
| `uc09-input1.jpg` | #09 interior wireframe | O2 · Wireframe to Render (interior) |
| `uc25-input1.jpg`, `uc25-input2.jpg` | #25 room + artwork | O3 · Place Object |
| `uc32-input1.jpg` | #32 top-down satellite | O1 · Bird's Eye View; Z1 · Vector Site Map |
| `uc04-input1.jpg` | #04 interior | Magazine Layout |
| `uc06-input1.jpg` | #06 mood collage | Moodboard to Space |
| `uc14-input1.jpg` | #14 final form | Concept Diagram |
| `uc19-input1.jpg` | #19 facade | Systems Cutaway |
| `uc20-input1.jpg` | #20 marked facade | Ground-Floor Program |
| `uc21-input1.jpg` | #21 interior render | Red-Pen Review |
| `uc29-input1.jpg`, `uc33-input1.jpg` | #29, #33 renders | Reframe & Extend |
| `uc44-input1.jpg` | #44 Maps screenshot, site in red | Z2 · Site Analysis Diagram |
| `uc46-input1.jpg`, `uc46-input2.jpg` | #46 site + building | Z3 · Place in Real Site |
| `uc47-input1.jpg` | #47 final render | Construction Phasing |
| `uc51-input1.jpg` | #51 tower | Systems Cutaway (green systems) |
| `uc54-input1.jpg` | #54 render | Marketing Board |
| `uc56-input1.jpg` | #56 top-down map | Z4, Z5 · 3D Site Analysis |
| `uc56-output1.jpg` | #56 the guide's own circular diagram | Z5 · as the optional reference |
| `uc58-input1.jpg` | #58 Earth screenshot | Z6 · Urban Layer Maps (Z7 stacks Z6's output) |
| `uc59-input1.jpg` | #59 terracotta jali photo | Y4 · Bio-Mimicry Concept Board; Material Poster |
| `uc60-input1.jpg` | #60 bubble diagram | Bubble to Plan (a second check; Y2 uses our own `bubble-input.jpg`) |

Also present but unused so far: `uc08` (oblique aerial photo — not the
top-down input Bird's Eye asks for), `uc23`, `uc24`, and `uc55` (#55's
input is a finished building render, which cannot test "translate, do not
copy" — Y4 uses the jali photo instead).
