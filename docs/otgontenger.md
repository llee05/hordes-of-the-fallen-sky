# Mount Otgontenger level

Mount Otgontenger is an authored alpine-valley battlefield inspired by the ice-capped Otgontenger
massif, its steep glacial valleys, alpine water, and larch slopes. Its 6,400 × 4,000-unit playable
rectangle matches the approved Orkhon Valley and Altan Ovoo scale while leaving the camera,
combat, saves, interface, and existing terrain systems unchanged. Run `npm run dev`, press **F8**,
and travel to **Mount Otgontenger**.

## Layout

`src/game/data/otgontenger.ts` is the single source for centre-relative level coordinates, where
+x is east and +y is south.

- The starting camp sits on open lower meadow at (-1900, 900), away from quadrant joins, water,
  and cliffs, with a 560-unit spawn-safe clearing.
- One irregular alpine bench forms the upper tier, 240 units above the lower valley.
- Broad western and eastern ramp cuts connect the two tiers.
- The camp trail climbs through the west ramp to a snow overlook, then crosses the upper bench and
  descends toward the eastern tarn.
- Lower routes connect the camp, larch hollow, tarn, outflow ford, and moraine gate.
- A glacial tarn on the eastern lower tier feeds a narrow outflow toward the south-east boundary.
- Snow domes sit on the impassable northern edge as a distant frame rather than a summit route.

Every painted track ends at a named terrain site or joins another track. The central lower meadow,
upper bench, and approaches to both ramps remain broad enough for horde combat.

## Hybrid terrain and scenery

The level uses the shared authored-terrain renderer. Four ground paintings project across the
elevation geometry; cliffs, ramp flanks, water, scenery, landmarks, actors, collision, lighting,
and shadows remain separate runtime objects. The upper bench is therefore painted in the same
manuscript language as the lower meadow instead of reading as a smooth generated material.

Bundled scenery provides the distant snowy massif, larch groups, moraine scree, pale boulders,
shrubs, wildflowers, standing stones, and trail markers. `world3d/otgontengerDressing.ts` builds
those placements deterministically over the complete map before render-chunk clipping. It keeps
the camp, tracks, ramps, tarn bank, outflow, landmarks, and main combat lanes clear.

## Painted ground

The north-west, north-east, south-west, and south-east quadrants each use a 1,600 × 1,000 ground
painting over 3,200 × 2,000 world units. The four joins use the shared world-space seam blend, a
1,024² detail layer supplies close brush grain, and an irregular outer feather joins the paintings
to the tiled off-playfield terrain.

The paintings contain ground only: alpine grass, old snow, gravel, scree, moraine earth, trail
wear, and the dry tarn bank. The live renderer supplies the water and all vertical scenery, so
painted features stay aligned with their terrain and collision counterparts.

The four paintings occupy 34,131,696 RGBA upload bytes (32.55 MiB) with complete mip chains.
Including the detail layer they occupy 39,724,100 bytes (37.88 MiB). In the same-device SwiftShader
350-enemy profile, authored World3D rendering measured 133.767 ms against 200.333 ms for the
preserved generated fallback, a 33.2% reduction and comfortably inside the 10% regression budget.

For development diagnosis, `?otgontengerPaintedGround=0` keeps the authored layout on its tiled
ground fallback. `?otgontengerLevel=generated` restores the former generated terrain composition.

## Points of interest and follow-ups

Points of interest are terrain and scenery only. These remain separate gameplay or art follow-ups:

- a summit-facing ritual or weather objective at the snow overlook;
- an alpine-tarn recovery effect, threat, or reward;
- avalanche, thin-ice, or glacial-wind hazards;
- ibex or other alpine wildlife behaviour;
- dedicated Otgontenger massif artwork if the shared snow-dome cutout is later replaced.
