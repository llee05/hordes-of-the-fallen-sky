# Altan Ovoo level

Altan Ovoo (Dariganga) is an authored volcanic-steppe battlefield built around one broad extinct cinder cone.
Its 6,400 × 4,000-unit playable rectangle matches Orkhon Valley's approved scale while leaving the camera, combat rules, saves, interface, and existing elevation system unchanged.
Run `npm run dev` or `npm run dev:web`, press **F8**, and choose **Altan Ovoo**.

## Layout

`src/game/data/altanOvoo.ts` is the single source for the level's centre-relative coordinates, where +x is east and +y is south.

- The player camp sits on open lower steppe at (-2050, 1050), clear of the quadrant seams and surrounded by a 520-unit spawn-safe clearing.
- One irregular cinder-cone plateau forms the upper tier, 240 units above the lower steppe.
- Broad cuts through the south-west and east cliff rims provide the two walkable ramps.
- The main trail winds from camp through the south-west ramp to the sacred summit near the north.
- A connected upper route passes the central spirit site, descends the east ramp, and reaches the spring.
- Lower-steppe routes join camp, spring, the horse meadow, and the balbal site.
- The spring feeds a narrow stream toward the sandy southern edge.

Every authored trail ends at a named place or joins another trail.
There are no worn tracks that stop in open ground.

## Hybrid terrain and scenery

The level uses the existing hybrid renderer.
Ground paintings project over elevation geometry while cliffs, ramps, water, trees, landmarks, actors, and collision remain separate game objects.
The upper cone therefore uses the same manuscript-style painted-ground language as the lower steppe instead of a smooth moss material.

Existing Orkhon Valley scenery supplies the sacred ovoo, prayer flags, standing stones, relic fires, reeds, autumn trees and shrubs, basalt scree, and boulders.
Standing stones mark the balbal location until dedicated statue art exists.
Spirit sites use stones and relic fires as terrain landmarks rather than introducing new encounters.
Dense rock ridges and autumn clusters frame the battlefield, but the camp clearing, trails, ramps, spring edge, and broad combat lanes stay open.
`world3d/altanOvooDressing.ts` builds those clusters deterministically across the whole battlefield before clipping them into render chunks, so their placement cannot change at chunk boundaries.

## Painted ground

Four 1,600 × 1,000 macro paintings project over the 3,200 × 2,000 north-west, north-east, south-west, and south-east quadrants.
The renderer blends their internal joins and adds the shared 1,024² paper-grain detail layer in world space.
An irregular outer feather joins the playable painting to a seamless grass crop in the off-playfield terrain visible behind the northern camera limit.
Cliffs, ramp flanks, water, dressing, landmarks, actors, collision, and shadows remain separate geometry or sprites.

The development-only `?altanOvooPaintedGround=0` query keeps the authored terrain on its tiled fallback for diagnosis.
The four quadrant uploads occupy 34,131,696 bytes (32.55 MiB) with complete mip chains.
Including the detail layer they occupy 39,724,100 bytes (37.88 MiB); the 256² fallback grass tile adds 349,524 bytes (0.33 MiB).

`npm run visual:altan` provides the same fixed-camera screenshot-only capture workflow as Orkhon when a browser capture run is explicitly approved.

## Points of interest and follow-ups

Points of interest are scenery in this level and do not add new gameplay systems.
The following remain separate follow-ups:

- a summit ritual objective;
- elite threats or apparitions at spirit sites;
- balbal lore and rewards;
- spring recovery or buffs;
- wild-horse and swan behaviour;
- dedicated balbal statue and spirit-wolf artwork.

The runtime selects this authored terrain and dressing for Altan Ovoo.
For development diagnosis, `?altanOvooLevel=generated` restores the former generated composition without the authored spring, dressing, or painted projection.
