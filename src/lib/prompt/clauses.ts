// Shared prompt clauses.
//
// These were module-private inside a single 494-line prompts.ts. With ~46 more
// tools coming, every builder needs to reach them, and a clause that gets
// copy-pasted instead of imported is how two tools silently drift apart.
//
// The text here is BYTE-IDENTICAL to what it was. qa/verifyEngines.cjs asserts
// on exact strings ("outer wall silhouette", "LOCK THE SHELL", "applied purely
// as illumination"), and TypeScript cannot see a changed prompt — so moving text
// and rewording it are separate commits, deliberately.

/**
 * What a tool sends when it has no prompt of its own. Lived in
 * providers/shared.ts until qa/registryLint.cjs flagged it — the transport layer
 * should carry no prompt text at all.
 */
export const FALLBACK_PROMPT =
  'Reimagine this architectural input as a polished presentation image while preserving its geometry and proportions.';

export const NO_TEXT = 'Do not add any watermark, signature, caption or stray text to the image.';

// Reference-chaining: when a pooled image is picked as a style reference it rides
// alongside the input as a second image, and this clause tells the model to match
// its visual language so a whole set shares one palette/materials/mood.
export const STYLE_REF_CLAUSE =
  'Match the overall material palette, colours, textures, finish and mood of the attached reference image so this output belongs to the same visual family — while keeping this drawing’s exact geometry, layout, viewpoint and composition unchanged.';

// The footprint contract. The model does not trace a drawing — it forms an
// understanding of it and redraws from scratch, so wherever the instructions are
// silent it falls back on its prior, and its prior for "floor plan" is a
// rectangle. The old wording protected the INTERIOR only (rooms, walls, openings)
// and never once named the building's outline, so an L-shape or a bay window —
// exactly the features that contradict the prior hardest — got squared off.
// Naming each irregularity, and forbidding the observed failure explicitly, is
// what gives the model something to arbitrate with.
export const FOOTPRINT_READ =
  'STEP 1 — READ THE PLAN FIRST. Before drawing anything, trace the outer perimeter and note whether it is a plain ' +
  'rectangle or irregular: L-shaped, T-shaped, U-shaped, stepped, chamfered, or carrying an angled or curved bay window. ' +
  'Count the rooms. Note each room’s position relative to the others, and the position of every door and window in every wall.';

export const FOOTPRINT_LOCK =
  'STEP 2 — LOCK THE GEOMETRY. Reproduce that exact footprint. Seen from directly above, the outer wall silhouette of ' +
  'your output must be identical in shape to the outline of the input plan — every corner, every set-back, every angled ' +
  'or splayed wall, every bay window. Do NOT simplify an irregular footprint into a rectangle or a plain box. Keep the ' +
  'same number of rooms, in the same relative positions, at the same relative sizes. Keep every internal wall, door ' +
  'opening and window opening exactly where the plan puts it. Do not rotate or mirror the plan.';

export const FOOTPRINT_CHECK =
  'Before you finish, compare your output’s outer outline against the input plan’s outline. If they are not the same ' +
  'shape, rebuild the geometry — matching the plan’s footprint, room count and room positions matters more than any ' +
  'styling instruction above.';

// The architecture lock for the interior tab. The previous wording asserted a
// general "walls, windows, doors … must not change" and then, in the same
// sentence, asked for "curtains" — a direct contradiction. The model resolved it
// the only way it could: it hung drapery on blank walls, which reads as windows
// that were never there (the reported bug). Three moves fix it — read the
// openings before touching anything, enumerate the specific alterations that are
// forbidden rather than asserting a soft blanket rule, and never name a
// wall-mounted element in the additive list.
export const SHELL_READ =
  'STEP 1 — READ THE ROOM FIRST. Before you change anything, count the windows, doors and openings in this photo and ' +
  'note exactly where each one sits, how wide and how tall it is, and what frames it. Note which walls are blank. Note ' +
  'where the walls meet, where the ceiling and floor lines run, and where the camera is standing.';

export const SHELL_LOCK =
  'STEP 2 — LOCK THE SHELL. The room’s architecture is fixed input, not part of what you are designing. Do NOT add, ' +
  'remove, move, widen, narrow, raise, lower or reshape any window, door, doorway, arch, opening, glazed panel or ' +
  'skylight, and do NOT change its frame, mullions or glazing. A wall that is blank in the photo stays blank — never ' +
  'place a window, a glazed panel, a curtain, a blind, a drape or a fake opening on it. Keep every wall exactly where it ' +
  'is: add and remove no partitions, columns, beams, niches, coves, ledges, panelling or built-in joinery. Keep the ' +
  'ceiling height, the ceiling and floor lines, the camera position, the lens and the crop exactly as shown, and leave ' +
  'whatever is visible outside the windows unchanged.';

// Window treatments are the specific trap: they are the one "soft furnishing"
// that is read as architecture, because a curtain implies the window behind it.
export const NO_NEW_DRAPERY =
  'Treat window treatments as architecture, not as décor: if a window has no curtain, blind or shade in the input photo, ' +
  'leave it bare. Only restyle a curtain or blind that is already there.';

// The closing audit, and therefore the instruction the model weights most
// heavily. It used to check OPENINGS ONLY. Live run 12 emptied a room perfectly
// and then handed back a straight-on view whose single casement had become three
// panes — the camera lock was in SHELL_LOCK, buried mid-prompt, and nothing at
// the end asked the model to check it. That ordering matters, because the two
// failures are almost certainly one failure: move the camera and the window wall
// has to be re-rendered from a new angle, at which point the window gets rebuilt
// from scratch. So the camera is now audited FIRST and named as the thing that
// causes the rest.
export const SHELL_CHECK =
  'Before you finish, run two checks against the input photo. FIRST, the camera: stand exactly where the input photo ' +
  'was taken from. If your view is wider, tighter, straighter-on or shifted to either side — if any wall, corner or ' +
  'opening sits at a different angle or a different place in the frame than it does in the input — you have moved, and ' +
  'you must rebuild the shot from the original position before anything else. Moving the camera forces you to redraw ' +
  'the walls, and redrawn walls are where invented windows come from. SECOND, and only once the camera matches, ' +
  'compare opening by opening. If any window or door has appeared, vanished, moved or changed size or its number of ' +
  'panes, or if a wall that was blank now carries a window, a glazed panel or a curtain, rebuild it — matching the ' +
  'room’s existing architecture matters more than any styling instruction above.';
