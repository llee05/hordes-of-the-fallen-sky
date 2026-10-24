# Stepped mountain terrain

This describes the retained Phaser presentation. The opt-in [3D terrain slice](world-3d.md)
replaces its flat contour bands with actual height vertices, vertical rock walls,
and depth-tested characters while retaining this renderer for comparison.

Mount Otgontenger uses the existing Phaser renderer, locally bundled textures,
and a deterministic five-tier heightfield. Mountains are continuous terrain with
raised shelves, full cliff faces, and open valleys. They do not use mountain
cutout sprites, standalone 3D models, new bitmap artwork, or a different engine.

## Landforms and materials

`terrain/MountainTerrain.ts` combines domain-warped coherent/ridged noise with two
long, connected mountain spines. It carves an east-west winding pass and a crossing
ravine, flattens the camp basin and the complete caravan corridor, and provides two
wide climbing ramps across the range flanks. This creates connected ridges,
terraces, shelves, ravines, and passes rather than a field of isolated noisy mounds.

`data/terrainBiomes.ts` authors `biome.terraces`, including thresholds, actual shelf
heights, transition width, ramp width, and material weights for each tier. Configs
require at least four ordered heights, non-overlapping transitions, and normalized
material weights. Otgontenger defines:

| Level | Height | Surface                                                       |
| ----- | ------ | ------------------------------------------------------------- |
| 0     | 0.20   | Rocky soil and sparse grass; the protected camp stays grassy. |
| 1     | 0.36   | Exposed stone with alpine scrub.                              |
| 2     | 0.52   | Alpine shelves with stone, scrub, and sheltered snow.         |
| 3     | 0.70   | Bare stone and snow patches.                                  |
| 4     | 0.90   | Snow and ice dominant.                                        |

`rawHeight()` describes the underlying landform. `height()` flattens it into these
shelf heights, retaining continuous grades in the climbing ramps. `sample()` adds
the tier, actual slope and surface normal, cliff strength, concavity, material
weights, and landform classification. Positive concavity increases retained snow
in upland depressions, while steep faces expose more stone. Every query uses
absolute world coordinates, so seeds, chunk order, and eviction never change the
result. Upper terrain is physically higher in the heightfield; surface artwork,
actors, and collision retain the same established 2D ground coordinates.

## Visible height

`terrainCliffBands.ts` clips terrain triangles between the lower and upper
contours of each tier transition. These polygons fill the **entire cliff-face
footprint**, rather than drawing a narrow decorative stripe. Their actual rise,
slope, and ramp mask determine strength. `terrainRelief.ts` renders them with:

- Opaque, directionally shaded rock faces, darker toward the foot of the wall.
- A restrained upper lip separating the raised shelf from the face.
- Contact ambient occlusion immediately beneath every cliff foot.
- Soft olive cast shadows toward the lower right, matching upper-left light.

Ground, shadow, ambient occlusion, face, rim, and debug layers have separate global
depths. Neighbouring ground chunks cannot cover a face or shadow crossing their
boundary. `terrainPolygon.ts` clips textured polygons at UV wrap boundaries,
preserving the original non-power-of-two PNGs and world registration. No texture
is resized or synthesized. `terrainLighting.ts` adds broad landform illumination
and short horizon shadows to the shelf surfaces.

`assets/painterlyArt.ts` maps materials through `MOUNTAIN_TERRAIN_ART`. Stone and
faces reuse the rocky Eej Khairkhan swatch with a cooler tint; snow and ice reuse
the Khan Tengri ground. Missing materials still support flat placeholder colours.
The Canvas fallback uses the same cliff polygons with plain colours and shading.
Dedicated painted cliff-face artwork can improve the finish without changing
generation or traversal.

## Props and combat readability

`terrainDressing.ts` selects small deterministic clusters from landform conditions:

- Scree and rubble sit on flatter ground immediately below higher cliff terrain.
- Alpine scrub occupies flatter shelves below the snow-dominant tiers.
- Sparse conifers occupy suitable lower elevations with gentle slopes and little snow.
- Snow accumulation follows upland depressions through material weights.

Each placement is checked individually, including the offsets within a cluster.
The camp and caravan clearings exclude these props. At most nine props occupy a
chunk, and tall trees remain sparse. Painted rock and pine frames are reused;
the existing reeds clump is a temporary alpine-scrub art stand-in. Asset frames,
tints, and visual widths live in `MOUNTAIN_TERRAIN_ART.dressing`, separately from
the renderer-independent placement rules. Generic scenery scatter is skipped in
the mountain region so it cannot put trees on summits or rubble on open passes.

`TerrainNavigation.ts` retains the steep-cell traversal grid independently of
render streaming, merges blocked cells into exact Arcade collision rectangles,
and shares bounded destination flow fields among enemies. Diagonals cannot cut
blocked corners. Swept follower movement prevents riders tunnelling through walls.
The camp, full eastbound caravan route, and broad passes remain open; tests require
over 94% of walkable ground to connect to the camp. Shots and ancestral spirits
can cross cliffs, while ordinary ground units use the passes and ramps.

## Streaming and debugging

Chunks span 512 world units. Collision cells and quiet material meshes use 64-unit
spacing; cliff geometry uses 32-unit spacing. Shared cached samples avoid repeating
height work across the cliff bands, lips, and shadows. Static mesh projection
initializes before the first render to prevent loading flashes. At most four
chunks are built per frame, with a one-chunk camera margin. Pure chunk data uses a
48-entry LRU cache; very wide debug views may retain all 121 finite render chunks.
Eviction, scene restart, and migration destroy surfaces, cliff layers, dressing,
and debug objects together. Shared textures remain loaded once.

In a development build, press **F8**, choose Mount Otgontenger, and ride north or
south from camp or zoom out to 60%. **F9** cycles:

1. Normal terrain.
2. **Elevation:** five discrete colours showing tiers 0–4.
3. **Slope:** green gentle surfaces through red steep ground.
4. **Cliffs:** magenta coverage of actual visible face polygons.
5. **Traversal:** red blocked cells and turquoise traversable cells.

The legend displays the tier count and resident/cached/pending chunk counts.
Overlays work while paused without advancing the expedition. F9 is excluded from
production bindings; the generated mountain terrain remains enabled in production.

Unit tests cover tier heights, material continuity, snow retention, complete cliff
area, shared seams, valid UVs, AO/shadow layers, deterministic bounded dressing,
open corridors, connected traversal, safe spawns, and cliff collision. Browser and
Electron checks cover streaming, every overlay, paused state, riding into cliffs,
and complete cleanup on migration. Other regions keep their existing landscapes.
