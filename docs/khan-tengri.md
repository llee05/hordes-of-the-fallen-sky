# Khan Tengri level

Khan Tengri is an authored glacier-margin battlefield inspired by the marble pyramid of the
central Tian Shan, the Inylchek glaciers, and their broad moraine valleys. Its 6,400 × 4,000-unit
playable rectangle matches Orkhon Valley and Altan Ovoo while leaving the camera, combat rules,
saves, interface, and elevation system unchanged. Run `npm run dev` or `npm run dev:web`, press
**F8**, and choose **Khan Tengri**.

## Layout

`src/game/data/khanTengri.ts` is the source for centre-relative level coordinates, where +x is east
and +y is south.

- The camp sits on the open lower moraine at (-2050, 1050), clear of both painting seams and within
  a 540-unit spawn-safe clearing.
- One irregular lateral-moraine terrace forms the upper tier, 240 units above the lower outwash.
- Broad western and eastern cuts provide two walkable ramps through the terrace edge.
- The main trail climbs past a western overlook, follows the marble-pyramid view across the upper
  terrace, crosses the Chapaev crag gap, and descends toward the blue-ice margin.
- The lower trail closes a broad combat loop through the erratic field and camp.
- A western approach reaches the moraine gate, and a short eastern branch reaches the named
  meltwater fan.
- A narrow glacier-fed channel follows the eastern edge, away from the camp clearing and main
  combat lanes.

Every authored trail either reaches a named terrain place or joins another trail. The summit is
not a climbable objective: one distant pyramid and the upper glacier frame the northern edge while
the playable ground stays on moraine terraces and outwash.

## Hybrid terrain and scenery

The shared hybrid renderer projects painted ground over elevation geometry while cliffs, ramps,
water, landmarks, actors, collision, and shadows remain separate. The upper moraine therefore
uses the same lavender scree, snow, and blue-grey rock language as the lower floor rather than a
smooth generic material.

Existing bundled scenery supplies a small marble-pyramid edge frame, angular crags, standing
stone, and boulders. The glacier tongue stays in the ground painting because the available large
glacier cutout does not register cleanly against this elevation geometry. Sparse deterministic
rock groups frame the outer battlefield without trees or alpine vegetation; the camp clearing,
trails, ramps, water edge, and broad horde lanes remain open. `world3d/khanTengriDressing.ts`
builds this dressing for the whole level before clipping it into render chunks, keeping placement
stable at chunk boundaries.

## Painted ground

Four 1,600 × 1,000 macro paintings project over the 3,200 × 2,000 north-west, north-east,
south-west, and south-east quadrants. They share one assembled 16:10 composition so the terrace,
tracks, glacier edge, and meltwater line continue across joins. The renderer blends internal joins,
adds the approved 1,024² paper-grain detail layer in world space, and feathers the playable image
into the off-playfield fallback.

The development-only `?khanTengriPaintedGround=0` query keeps the authored geometry on its tiled
`khan-tengri.png` fallback for diagnosis. The four quadrant uploads occupy 34,131,696 bytes
(32.55 MiB) with complete mip chains. Including the detail layer, painted ground occupies
39,724,100 bytes (37.88 MiB).

`npm run visual:khan-tengri` provides a fixed-camera screenshot-only capture workflow when a
browser capture run is explicitly approved.

## Points of interest and follow-ups

Points of interest are terrain and scenery only; this level adds no new gameplay systems. The
following remain separate follow-ups:

- a marble-pyramid overlook objective;
- elite threats at the Chapaev crag gap or blue-ice margin;
- glacier and moraine lore rewards;
- meltwater recovery or traversal effects;
- dedicated Khan Tengri peak, glacier, and icefall artwork.

For development diagnosis, `?khanTengriLevel=generated` restores the former generated composition
without the authored paths, meltwater, landmarks, dressing, or painted projection.
