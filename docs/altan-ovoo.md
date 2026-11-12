# Altan Ovoo level

Altan Ovoo (Dariganga) is an authored volcanic-steppe battlefield built around one broad extinct cinder cone.
Its 6,400 × 4,000-unit playable rectangle matches Orkhon Valley's approved scale while leaving the camera, combat rules, saves, interface, and existing elevation system unchanged.

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

## Points of interest and follow-ups

Points of interest are scenery in this level and do not add new gameplay systems.
The following remain separate follow-ups:

- a summit ritual objective;
- elite threats or apparitions at spirit sites;
- balbal lore and rewards;
- spring recovery or buffs;
- wild-horse and swan behaviour;
- dedicated balbal statue and spirit-wolf artwork.

The generic Altan Ovoo composition remains the fallback until the authored terrain and painted-ground projection are registered with the runtime.
