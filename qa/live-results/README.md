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
