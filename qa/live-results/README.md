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

Six more runs, 2026-09-04, same model. **5 PASS · 1 FAIL.** Reproduce with
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
| V6 | Upscale for Print | Resolve detail, or invent it? | **FAIL — new bug, fixed** |

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
so the gate that missed this now catches it. **The fix itself is not yet
verified live.**

## What still holds after eleven more images

- Labels the model is *asked to write* stay correctly spelled (V2's five layer
  captions). Text on a *depicted object* stays gibberish (V4's coffee-table
  book spines). The round-1 finding survives contact.
- Exterior geometry locks are reliable (V1, V2). Interior camera locks are
  better but still not exact — V3 holds the window and the viewpoint but sits
  slightly lower, and the input's left-edge bookcase returned as a door
  architrave. V4 lost the input's ceiling pendant. The `accuracyWarning` on
  these tools stays earned.
