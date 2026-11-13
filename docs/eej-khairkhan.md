# Eej Khairkhan level

Eej Khairkhan (Govi-Altai) is an authored granite-desert battlefield at the foot of an isolated sculpted massif.
Its 6,400 × 4,000-unit playable rectangle matches Orkhon Valley and Altan Ovoo while leaving the camera, combat, saves, interface and shared elevation system unchanged.
Run `npm run dev` or `npm run dev:web`, press **F8**, and choose **Eej Khairkhan**.

## Layout

`src/game/data/eejKhairkhan.ts` is the source for centre-relative level coordinates, where +x is east and +y is south.

- The live camp sits on open lower desert at (-2150, 1050), clear of both painting seams and surrounded by a 520-unit spawn-safe clearing.
- One broad granite terrace forms the upper tier, 240 units above the lower sandy-gravel apron.
- Wide natural cuts through the western and eastern rim provide the only two ramps.
- The main route loops from camp through the western ramp, the Nine Basins terrain site and granite overlook, then descends the eastern ramp into Spring Hollow.
- A broad lower road joins camp, Central Gravel Court and Spring Hollow.
- A western spur reaches Wind-Carved Court; a south-east track continues from the spring to the caravan approach at the level boundary.
- The much higher massif is scenery along the northern edge, not a third tier or a summit route.

Every authored trail ends at a named terrain place, a ramp, another route or the visible caravan exit.
Broad gravel ground remains open around the camp, lower road and terrace loop for horde movement.

## Real-place translation

The level is a compressed camp in the surroundings rather than a summit ascent or a depiction of worship.
Its isolated granite wall, western rock-basin site, small spring hollow, pale desert apron and sparse dry vegetation follow the research recorded in the Stage 1 layout plan.
Sacred context remains descriptive: the level adds no ritual action, sacred-site reward or calamity origin.

The Nine Basins are a terrain landmark represented by painted granite depressions and the upper route.
Spring Hollow uses the existing source-pool water geometry and a very short overflow groove; it is not a river level.
Existing granite, scrub, pebble, reed and dry-grass sprites provide sparse deterministic dressing.

## Hybrid terrain and painted ground

The shared authored renderer projects four manuscript-style ground paintings over the elevation geometry while cliffs, ramps, water, granite scenery, actors, collision and shadows remain separate objects.
The upper terrace therefore uses the same matte peach-granite, sandy-gravel and vellum-grain language as the lower ground rather than a smooth material.

Four 1,586 × 992 macro paintings cover the 3,200 × 2,000 north-west, north-east, south-west and south-east quadrants.
The shader blends their internal joins, feathers the outer playable edge into a 256² granite fallback and adds the shared 1,024² neutral paper-grain detail layer in world space.
The development-only `?eejKhairkhanPaintedGround=0` query retains the authored geometry on its tiled fallback for diagnosis.
`?eejKhairkhanLevel=generated` restores the former fully generated composition.

The four paintings occupy 33,560,368 bytes (32.01 MiB) on the GPU with complete mip chains.
Including the detail layer they occupy 39,152,772 bytes (37.34 MiB); the 256² fallback adds 349,524 bytes (0.33 MiB).

## Points of interest and follow-ups

The terrain places are scenery and navigation destinations only.
The following remain separate follow-ups:

- interactions, healing, resources or rewards at the Nine Basins or Spring Hollow;
- basin-overflow animation or bespoke linked-pool water;
- petroglyph, hermit-cave or sculpted-rock lore presentation;
- dedicated granite-arch, tamarisk, saxaul and rock-basin artwork;
- ibex, argali, snow-leopard or other desert wildlife behaviour;
- additional granite-shelter combat rules beyond the existing location effect.
