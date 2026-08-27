// Prompt builders for the Interiors category.
//
// All of these edit a photograph of a real room, so they share one hard rule:
// the architecture is fixed input, not part of what is being designed. That
// lesson was learned the expensive way — the staging prompt once asked for
// "curtains" in the same sentence as "windows must not change", and the model
// resolved the contradiction by hanging drapery on blank walls, which read as
// windows that were never there.
//
// Every builder therefore uses the same staged structure as the isometric and
// interior fixes: READ the room, LOCK what is not yours to change, and only
// THEN do the one thing the tool is for.

import { NO_NEW_DRAPERY, NO_TEXT, SHELL_CHECK, SHELL_LOCK, SHELL_READ } from './clauses';

/** What kind of object is being placed. Same transformation, different noun. */
export type PlaceObjectKind = 'furniture' | 'lighting' | 'artwork';

/** Where a piece of furniture sits relative to what is already in the room. */
export type PlacementMode = 'replace' | 'add';

// --- Declutter to shell -----------------------------------------------------

/**
 * A messy site photo → the empty architectural shell, ready to re-stage.
 *
 * The natural first step of a renovation pitch, and the natural upstream tool
 * for Stage Empty Room. Removing objects is the easy half; the hard half is
 * repairing what was behind them without inventing new architecture, which is
 * why this carries the full shell lock rather than a lighter one.
 */
export function buildDeclutterPrompt(a: { keepBuiltIns: boolean }): string {
  const parts: string[] = [
    'You are stripping a real, existing room back to its empty architectural shell so it can be re-designed. ' +
      'You are not redesigning anything — you are only removing what is movable and repairing what was behind it.',
    SHELL_READ,
    SHELL_LOCK,
    NO_NEW_DRAPERY,
    'STEP 3 — ONLY THEN CLEAR IT. Remove every free-standing and movable thing: furniture, rugs, lamps, cushions, ' +
      'plants, boxes, tools, rubbish, personal possessions, wall art, and any clutter on surfaces. Where an object stood, ' +
      'repair the floor and wall behind and beneath it so the surface continues exactly as it does elsewhere in the ' +
      'photo — same material, same colour, same wear, same joint lines. Do not invent a new floor or a feature wall.',
  ];
  parts.push(
    a.keepBuiltIns
      ? 'Keep the fitted joinery in place — built-in wardrobes, fitted kitchen units, shelving that is fixed to the ' +
          'structure, radiators and switches all stay exactly as they are. Only free-standing items leave.'
      : 'Remove fitted joinery too — wardrobes, kitchen units and fixed shelving — and make good the wall and floor ' +
          'behind them. Keep radiators, sockets, switches and any services that are part of the building.',
  );
  parts.push(
    'The result is a clean, well-lit, completely empty room photographed from the identical camera position, ' +
      'in the same daylight as the input.',
    SHELL_CHECK,
    NO_TEXT,
  );
  return parts.join(' ');
}

// --- Place object -----------------------------------------------------------

const OBJECT_NOUN: Record<PlaceObjectKind, string> = {
  furniture: 'furniture piece',
  lighting: 'light fitting',
  artwork: 'artwork',
};

/**
 * A second image → that exact object, placed into the room.
 *
 * One tool rather than three. Furniture, lighting and artwork are the same
 * transformation with a different noun and a different physical consequence
 * (contact shadow / emitted light / wall mounting). Three near-identical entries
 * in the tool rail would be noise.
 *
 * The single hardest instruction here is that the object must be THE object in
 * the second image, not something like it. Models default to "in the style of",
 * so identity is stated first and repeated in the closing check.
 */
export function buildPlaceObjectPrompt(a: {
  kind: PlaceObjectKind;
  placement: PlacementMode;
  /** Free text: what to replace, or where to put it. */
  target: string;
}): string {
  const noun = OBJECT_NOUN[a.kind];
  const where = a.target.trim();

  const parts: string[] = [
    `TWO IMAGES ARE ATTACHED. The FIRST is a photograph of a real room. The SECOND is the ${noun} to place into it.`,
    `Reproduce the ${noun} from the second image EXACTLY: the same design, proportions, materials, colour and finish. ` +
      `It is that specific product, not something in its style — do not redesign it, restyle it, or substitute a similar one.`,
    SHELL_READ,
    SHELL_LOCK,
  ];

  if (a.placement === 'replace') {
    parts.push(
      `STEP 3 — ONLY THEN SWAP IT. Remove ${where || `the existing ${noun}`} from the room and put the ${noun} from the ` +
        'second image in its place, at the same position and facing the same way. Scale it correctly against the room ' +
        'and align it to the existing perspective and vanishing points.',
    );
  } else {
    parts.push(
      `STEP 3 — ONLY THEN PLACE IT. Add the ${noun} from the second image ${where || 'in the most natural position for it'}. ` +
        'Scale it correctly against the room — use the ceiling height, door height and existing furniture as the ' +
        'measure — and align it to the existing perspective and vanishing points.',
    );
  }

  // Each object type has a different physical consequence, and getting it wrong
  // is what makes a composite read as pasted-on.
  if (a.kind === 'furniture') {
    parts.push(
      'Ground it properly: a soft contact shadow where it meets the floor, occlusion where it passes behind or in ' +
        'front of anything, and reflections on nearby glossy surfaces consistent with the room’s existing light.',
    );
  } else if (a.kind === 'lighting') {
    parts.push(
      'Light it properly: the fitting is switched ON. Show its emitted light falling on the surrounding ceiling, walls ' +
        'and furniture, with a colour temperature and falloff that match the fitting itself, and a soft glow around the ' +
        'lamp. The rest of the room’s existing light stays as it was — this fitting adds to it, it does not replace it.',
    );
  } else {
    parts.push(
      'Mount it properly: flat against the wall plane, in correct perspective, with a subtle drop shadow and a hint of ' +
        'sheen consistent with the room’s light. Keep the wall colour and finish around it exactly as they are.',
    );
  }

  parts.push(
    'Change NOTHING else. Every other object, surface, finish and light in the room stays exactly as it is, and the ' +
      'camera does not move.',
    'Photorealistic interior photograph, physically based lighting, natural colour grade, ultra-detailed.',
    `Before you finish, check two things: that the ${noun} in your output is recognisably the same product as the one in ` +
      'the second image, and that nothing else in the room has changed. If either fails, redo it.',
    NO_TEXT,
  );
  return parts.join(' ');
}

// --- Targeted element swap --------------------------------------------------

/**
 * Change one named thing, leave everything else alone.
 *
 * The generic "precise edit" pattern. There is no mask — the target is
 * identified in language — so the instruction that carries the weight is the
 * negative one, and it is stated twice.
 */
export function buildTargetedSwapPrompt(a: {
  element: string;
  replacement: string;
  /** A red rectangle has been drawn on the input around the target. */
  marked?: boolean;
}): string {
  const element = a.element.trim() || 'the element indicated';
  const replacement = a.replacement.trim();

  const parts: string[] = [
    `Make ONE change to this photograph: ${element} becomes ${replacement || 'the new version described below'}.`,
  ];

  // An unexplained red box is just something for the model to reproduce
  // faithfully in its output. Naming it as an annotation — and saying to erase
  // it — is what turns it from a drawn object into a pointer.
  if (a.marked) {
    parts.push(
      'A RED RECTANGLE has been drawn on the input image to show you exactly where to work. That rectangle is an ' +
        'annotation, not part of the scene: make your change inside it, and do NOT draw the red rectangle, any part ' +
        'of it, or any outline in its place into your output. The finished image contains no red box.',
    );
  }

  parts.push(
    SHELL_READ,
    `STEP 2 — LOCK EVERYTHING ELSE. This is a targeted edit, not a redesign. Every part of the image other than ` +
      `${element} must come through completely unchanged: the other furniture and objects, all surfaces and finishes, ` +
      'the wall colour, the flooring, the windows and doors, the lighting and its direction, the shadows, the camera ' +
      'position, the lens and the crop. Do not "improve" anything you were not asked to change.',
    `STEP 3 — ONLY THEN MAKE THE CHANGE. Replace ${element} with ${replacement || 'the requested version'}, matching the ` +
      'existing perspective, scale, lighting direction and shadow softness so the result is indistinguishable from a ' +
      'photograph of the room with that change already made.',
    'Photorealistic, physically based lighting, natural colour grade, ultra-detailed.',
    `Before you finish, compare your output against the input everywhere EXCEPT ${element}. Any other difference is a ` +
      'mistake — redo it.',
    NO_TEXT,
  );
  return parts.join(' ');
}

// --- FF&E spec sheet --------------------------------------------------------

/**
 * A finished room → its "kit of parts", laid out and labelled.
 *
 * Unlike everything else in this file, this output is DELIBERATELY not a room:
 * it is a knolled inventory on white. It also deliberately contains text, so it
 * gets a spell-correctly instruction rather than the shared no-text guard —
 * same exception the mood board makes.
 */
export function buildSpecSheetPrompt(a: { roomLabel: string }): string {
  const room = a.roomLabel.trim() || 'interior';
  return [
    `You are an FF&E consultant. Study the attached ${room} image and deconstruct it into a visual component inventory — ` +
      'the "kit of parts" a client would need to buy to build this room.',
    'Compose a single knolling-style flat-lay on a plain white background: every key element isolated, cut out, and ' +
      'arranged in a clean grid with generous even spacing and soft realistic drop shadows. Top-down, evenly lit, no room ' +
      'context, no perspective.',
    'Include the significant items visible in the input: the main seating, occasional furniture, the light fittings, the ' +
      'rug or floor covering, the window treatment if there is one, a swatch of each wall and floor finish, the principal ' +
      'hardware or metalwork, and two or three accessories.',
    'CRITICAL — every item must be the item actually visible in the input image: the same design, proportions, material, ' +
      'colour and finish. This is an inventory of that room, not a mood board of similar products. Do not invent items ' +
      'that are not in the photograph, and do not omit an item that clearly is.',
    'Label each item with a small, elegant, letter-spaced caption placed beside it — never on top of it — naming the ' +
      'item and its material or finish, e.g. "LOUNGE CHAIR — Bouclé in Warm Ivory", "FLOORING — Wide-Plank Oak", ' +
      '"PENDANT — Brushed Brass".',
    'Typography: refined, small, consistent, generous whitespace — a specification page from a design studio. ' +
      'Photorealistic cut-outs, ultra-detailed. The only text on the sheet are these labels — spell every word correctly.',
  ].join(' ');
}
