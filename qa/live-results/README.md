# Live verification — the 15 risk-first runs

Phase 7 of the plan: live generation for the riskiest prompts only, every
input→output pair kept. Run against Gemini `gemini-3-pro-image-preview` on
2026-09-04. **15 API calls, 15 images, zero errors.**

Reproduce with `qa/liveRuns.ts` (see its header for why it does not drive the
browser). `--dry` prints the billed-call count and sends nothing.

## Result

**12 PASS · 2 PARTIAL · 1 FAIL**

| # | Tool | Risk under test | Verdict |
|---|---|---|---|
| 01 | Massing | Does text-only generation work on an image-editing model at all? | **PASS** |
| 02 | Multi-View Sheet | Do the panels agree with each other? | **PASS** |
| 03 | 3D to CAD Elevation | The rear face is not in the input — reconstructed or hallucinated? | **PASS** |
| 04 | Section | Can a section be cut with no storey heights given? | **PASS** |
| 05 | Render to Plan | The pipeline run backwards | **PASS** |
| 06 | Urban Context | Signage asked for while stray text forbidden | **FAIL** |
| 07 | Floor Analysis (zoning) | A keyed legend from outside the labels branch | **PASS** |
| 08 | Exploded Axonometric (outward) | Guides following a diagonal explode | **PARTIAL** |
| 09 | Annotated Diagram | The one tool that must write real words | **PASS** |
| 10 | Sketch to CAD Plan | A rough sketch without invented rooms | **PASS** |
| 11 | Sketch to Render | Keeping the sketch's masses | **PASS** |
| 12 | Declutter | Keeping the architecture, removing the movable | **PARTIAL** |
| 13 | FF&E Spec Sheet | A flat-lay that must not become a mood board | **PASS** |
| 14 | Facade Material Study | A material swap that leaves geometry alone | **PASS** |
| 15 | Watercolour | A stylised pass that keeps the building | **PASS** |

## The three that did not pass cleanly

**06 · Urban Context — FAIL, and fixed.** The street came back with invented
shopfronts: "CAFE & STA…" legible on the right, a fascia of garbled letterforms
on the left. The cause was in the prompt, not the model. Its street-furniture
list asked for "signage boards", then asked that their lettering "stays
illegible at this distance", while the closing guard banned stray text outright
— three instructions pulling apart, and the model resolved them by writing
words. You cannot ask for a sign and then ask for it to have no words on it.
Fixed by dropping the boards and naming the ground floors as unbranded;
`promptContradictions` now holds the pair, and the rule was watched failing
against the old snapshot before the fix landed.

**08 · Exploded Axonometric — PARTIAL.** Labels correct on leader lines, guides
consistent with the explode, facade faithful to the input's garage, stone and
glazed stair. But the input's flat overhanging roof came back **hipped and
pitched**, and `axis: 'layered'` ("Outward") produced what is essentially the
vertical stack. The second point matters beyond this tool: `verifyQuick` proves
an axis changes the *prompt*, which is all a static gate can prove. It cannot
prove the axis changes the *output*, and here it barely did.

**12 · Declutter — PARTIAL, and the most instructive of the fifteen.** The
strip-out was flawless: every movable object gone, the radiator, skirting, floor
wear and even the wall blemishes preserved. But the camera swung to straight-on
and one casement came back as three panes — **despite the prompt already
carrying the strongest lock language in the app**, including "keep the camera
position, the lens and the crop exactly as shown" and a closing opening-by-
opening re-check. Writing more lock language is not the fix. Both tools now
carry an `accuracyWarning` on the output instead, because a user comparing a
before and after needs to know the geometry is not evidence.

## Smaller observations, not defects

- **02** — my run title said "six panels"; the tool's default is a 2×2 of four.
  That was my error, not the tool's. Panel 3 answers the "flank" slot with a
  second three-quarter view.
- **05** — the plan is derived from a single elevation, so its depth is entirely
  inferred. The tool already warns about exactly this.
- **10** — `sketch-input.jpg` is a sketched *elevation*, so the same caveat
  applies. The three-bay structure still tracks the sketch.
- **11** — the render faithfully kept the sketchbook page and binding around it.
- **13** — "TELEVISION — CRT" is duplicated, and the depicted newspaper's
  masthead is gibberish. The sheet's own labels are all correct.

## What run 09 settles

Nine tools write text onto the image, and the standing worry was that they would
all produce label-shaped gibberish. They do not: run 09 came back with "GARAGE
ACCESS", "MAIN ENTRY", "UPPER LEVEL CIRCULATION" and a three-line colour key,
every word correctly spelled and every leader line pointing at the right
element. Run 07's legend and run 13's spec labels agree. Gibberish appears only
in text the model draws as part of a depicted *object* — a newspaper masthead, a
shopfront fascia — never in text it is asked to write as a label.

## Still unverified

kie.ai could not be tested: `api.kie.ai` returns a 403 CONNECT tunnel failure
through this environment's egress proxy. The three blocked fixtures (satellite
grab, 3D viewport screenshot, product shot) remain outstanding, so the tools
that need them are untested live.

---

# Round 2 — verifying the fixes, and two questions the first fifteen never asked

Seven runs, 2026-09-04, same model. **6 PASS · 1 FAIL, then that failure fixed and re-run.** Reproduce with
`node qa/liveRuns.ts --verify`; the marker fixture comes from
`node qa/makeMarker.cjs`.

Round 1 ended with three fixes and no proof any of them worked. These runs are
that proof, plus the red-marker question the plan named as its biggest unknown.

| # | Tool | Under test | Verdict |
|---|---|---|---|
| V1 | Urban Context | Are the invented shopfronts gone? | **PASS — fix confirmed** |
| V2 | Exploded Axon (outward) | Roof form locked, and does Outward differ? | **PASS — both fixes confirmed** |
| V3 | Declutter | Does the camera hold now it is audited first? | **PASS — regression gone** |
| V4 | Interior (stage) | Did the shared-clause rewrite break staging? | **PASS — blast radius safe** |
| V5 | Targeted Edit | **Is a red rectangle an instruction or a picture?** | **PASS** |
| V6 | Upscale for Print | Resolve detail, or invent it? | **FAIL — new bug** |
| V7 | Upscale for Print | Re-run after the medium lock | **PASS — fix confirmed** |

## V5 settles the plan's biggest open question

The plan listed, among what could not be verified without paid calls, *"the
biggest one — whether the model reads a burned-in red rectangle as an
instruction rather than reproducing it."*

It reads it as an instruction. The output contains **no red rectangle**. The
sofa inside the box went from beige fabric to dark green velvet, and everything
outside it survived untouched — window, net curtains, radiator, CRT television
and stand, floor lamp, Persian rug, newspapers, mugs, both bookcases, the
clutter pile. The crochet blanket and cushions resting *on* the sofa were
preserved and re-composited over the new upholstery. The region marker works.

## V6 — a new failure, of a kind the gates could not see

Fed a black-and-white line elevation, Upscale returned a photorealistic render:
blue sky, lawn, concrete driveway, trees reflected in the glazing, and a garage
door converted from a glazed grid to a solid timber panel.

Three clauses caused it, and all three assumed the input was a photograph:
"real material texture where the input **only suggests it**" (a drawing only
suggests material everywhere), "clean gradients in **the sky**" (a drawing has
no sky, so this asks for one), and a closing `PHOTO_FINISH` flatly declaring the
output a photorealistic architectural photograph.

The registry declares this tool `inputKind: [plan, sketch, room, building,
model, map]` and `outputKind: 'same'` — whose own documentation reads *"an
upscale of a plan is still a plan."* **The prompt was contradicting the tool's
declared contract.**

Fixed with an explicit medium lock ranked above every rendering instruction, and
a finish that names the input's own medium instead of asserting one.
`promptContradictions` gains the pair `do not invent it` + `Photorealistic
architectural photograph`, which was watched failing against the old prompt —
so the gate that missed this now catches it.

**V7 confirms the fix.** The same line elevation came back as line art on white:
no sky, no lawn, no driveway, no materials, no lighting, and the garage door
restored to its glazed 4x5 grid from the solid timber panel V6 invented. Both
images are kept — `run-V6-output.png` is the failure, `run-V7-output.png` the
fix — because a before and after is the only honest way to show a prompt change
worked.

## What still holds after eleven more images

- Labels the model is *asked to write* stay correctly spelled (V2's five layer
  captions). Text on a *depicted object* stays gibberish (V4's coffee-table
  book spines). The round-1 finding survives contact.
- Exterior geometry locks are reliable (V1, V2). Interior camera locks are
  better but still not exact — V3 holds the window and the viewpoint but sits
  slightly lower, and the input's left-edge bookcase returned as a door
  architrave. V4 lost the input's ceiling pendant. The `accuracyWarning` on
  these tools stays earned.

---

# Coverage: what has and has not been run live

**18 of 30 tools** were run live in these two rounds. Four more — Isometric,
Elevation, Axonometric and Mood Board — were live-tested in earlier sessions
(the original five features, before the registry existed).

**Eight have never been run live at all:**

| Tool | Why it has not been run |
|---|---|
| Place Object | **Blocked** — needs a product shot on plain ground |
| Wireframe to Render | **Blocked** — needs a 3D viewport screenshot |
| Bird's Eye View | Testable. A viewpoint change; runs 02 and 03 both showed viewpoint reconstruction works |
| Render Refinement | Testable. "Keep the building, change one thing" — the shape run 14 proved holds |
| Atmosphere & Light | Testable. Same shape as above |
| Add Human Scale | Testable. Same shape as above |
| Reflection Control | Testable. Same shape as above |
| Program Diagram | Testable. Coloured zones plus a keyed legend — the shape run 07 proved |

The six testable ones were deliberately skipped, not overlooked: each repeats a
prompt shape that a round-1 run already exercised, so paying for them buys
confirmation rather than information. That is a judgement, not a guarantee —
every failure this session was found by running something, and the two partials
were both in tools nobody expected to fail.

The two blocked ones cannot be tested until their fixtures exist. Those are the
only tools in the app whose live behaviour is entirely unknown *and* unknowable
from here.

---

# Round 3 — the tools round 1 skipped

Six runs, 2026-09-04, same model. **5 PASS · 1 FAIL, then that failure fixed and
re-run.** Reproduce with `node qa/liveRuns.ts --skipped`.

Round 1 skipped six tools on the argument that each repeated a prompt shape an
earlier run had already exercised. These runs test that argument, using the
NON-DEFAULT, riskiest setting of each rather than the variant most likely to
look fine.

**Bird's Eye is not among them, and is not "skipped".** Its `inputKind` is
`['map']` and its own hint reads "a top-down satellite or Maps screenshot". It
is blocked on the satellite fixture, alongside Place Object and Wireframe to
Render. It had previously been listed as testable, from memory, without reading
its `inputKind`. **Three tools are blocked, not two.**

| # | Tool | Riskiest setting tested | Verdict |
|---|---|---|---|
| W1 | Atmosphere & Light | night + winter + dramatic | **FAIL — roof drift** |
| W2 | Add Human Scale | busy + commercial + vehicles + planting | **PASS** |
| W3 | Reflection Control | mirror | **PASS** |
| W4 | Render Refinement | finish (the strongest level) | **PASS** |
| W5 | Program Diagram | isometric, with levels named | **PASS** |
| W6 | Atmosphere & Light | W1 again, after the fix | **PASS — fix confirmed** |

## The skip reasoning was right four times out of five

W2, W3, W4 and W5 all held, which is what "this repeats a shape run 14 proved"
predicted. W1 did not, and it matters that the one failure was in the tool
making the LARGEST change — the argument was about prompt shape and took no
account of how much of the image a setting forces to be re-rendered.

W3 is worth singling out: mirror glazing kept every frame and mullion in place,
with the reflection breaking at each one, and the building's geometry was
untouched down to the tree-branch shadow on the garage door.

## W1 — and why the obvious diagnosis was wrong

Relit to night, the flat overhanging roof came back hipped and pyramidal, and
the dark grey volume turned pale.

The obvious reading is a missing roof clause. It is not: the prompt already said
"the roof form" in its READ step and "a different roofline" in its closing
check. **Facade Material passes with the identical lock** (run 14, geometry
perfect). Both come from the same `onlyChange()` helper, so the clauses are
byte-identical.

The difference is how much the change forces to be re-rendered. A material swap
in daylight leaves the roof silhouette fully constrained by the existing image.
A relight to night re-renders every pixel, and under a dark sky the roof
outline is the least constrained thing in the frame — so the model falls back on
the commonest roof it knows.

What fixes that is naming the failure rather than the property. Exploded
Axonometric had precisely this drift, was given precisely this prohibition, and
V2 confirmed the flat roof came back flat. That clause is now promoted into
`onlyChange()`, so it protects **all seven** visualization tools that share the
lock — Render Refinement, Atmosphere, Facade Material, Human Scale, Reflection,
Upscale and Watercolour.

**W6 confirms it.** The same night/winter/dramatic run returns a flat roof with
its overhangs and fascias in all three tiers, while the relight still does its
job: warm interior glow, soffit downlights, bare winter trees, frost underfoot.
`run-W1-output.png` and `run-W6-output.png` are both kept.

## Running total

**28 paid generations across three rounds.** Five prompt bugs found; all five
fixed and all five confirmed by re-running the case that failed.

**23 of 30 tools** have now been run live here, plus four more (Isometric,
Elevation, Axonometric, Mood Board) in earlier sessions — **27 of 30**.

**The three that remain are exactly the three blocked on fixtures**, and nothing
else:

| Tool | Needs |
|---|---|
| Bird's Eye View | a top-down satellite or Maps screenshot |
| Wireframe to Render | a SketchUp or 3D viewport screenshot |
| Place Object | a product shot on plain ground (its *second* image; it takes a room photo as its first) |

Every tool that can be tested from this environment has been. These three cannot
be, until those files exist — I cannot fetch them (the egress proxy blocks image
hosts) and generating them would make the fixtures too clean to be a real test,
which is the mistake that let the original squared-off isometric through.
