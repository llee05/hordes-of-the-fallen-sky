# Environmental materials and ecology

The environment quality pass keeps Phaser simulation, Three.js terrain, existing
actors/buildings, and the 48° orthographic camera. Golden Pasture is the reference
scene: seed `living-steppe-scenes-v3:golden-pasture`, camera target (2600,2600), zoom 1.
Before/after captures live under `test-results/environment/`.

## Material inspection and changes

The previous shader sampled paintings but replaced their RGB with a nearly uniform
palette color plus a narrow brightness range. Most ground vertices also shared the
same grass/soil weights. This removed both the paintings' detail and geographic
variation. Cliff granite suffered from the same luminance reduction.

`terrainHabitat.ts` now supplies shared global masks for broad moisture, exposure,
medium patches, sheltered groves, river margins, cliff feet, cliff rims, and worn
camp/caravan ground. `sceneGeometry.ts` turns these masks into normalized material
coverage. It changes surface appearance without moving collision or terrain vertices.

`terrainShader.ts` blends actual painted RGB in world space. Grass, dry grass,
soil, gravel, exposed granite, snow, and ice use different texture scales and smooth
coverage. Healthy grass and dry turf retain their original brush detail; soil and
fine gravel sample the existing granite-desert painting at different scales.
Triplanar granite retains fractures on vertical faces. Rotated secondary samples
and independently scaled material patches break up repetition. Mipmaps and bounded
anisotropic filtering preserve stable detail on the angled ground. Regional palettes
apply restrained relative tint, preserving the source paintings' color variation.

| Existing painting        | Role                                |
| ------------------------ | ----------------------------------- |
| `tapestry-meadow-v3.png` | Healthy sage grass and sparse turf  |
| `steppe-ground.png`      | Dry golden grass                    |
| `eej-khairkhan.png`      | Earth, rocky soil, and fine gravel  |
| `tapestry-stone-v3.png`  | Exposed granite and cliff fractures |
| `khan-tengri.png`        | Snow and ice                        |

Material tests check finite normalized coverage across biomes/elevations/slopes,
coherent neighboring patches, wetter river margins, and unchanged terrain heights.
The existing terrain tests continue checking exact surface queries and chunk seams.

## Weathered cliffs and light

`cliffGeometry.ts` subdivides exposed walls into four shallow relief bands, with
seeded fractures and occasional projecting lips. Feet and rim anchors stay fixed;
relief is bounded to eight world units inside the conservative collision clearance.
Global sampling gives identical relief at shared chunk edges. Non-camp shelf heights
vary gently along their ridges while the protected camp retains its level floor.
Terrain queries and navigation continue using the same split surface mesh.

Sunlight now produces shorter shadows, with bounded PCF filtering, reduced shadow
intensity, and a little more ambient fill. Granite remains visible on shaded faces.
The existing contact shadows still anchor characters and props. No camera or actor
art changes are part of this pass.

## Riverbeds, water, and vegetation

`WorldRiver.ts` adds deterministic meanders and asymmetric width changes to the
existing authored courses. It keeps water away from the settlement and supplies
cached nearest-shore distances with the actual local channel width. Terrain,
material moisture, water rendering, and plants all query this same course.
`ComposedTerrain` excavates a shallow bed, grades raised masses toward the channel,
and rounds cliff remnants into banks so water does not cut through vertical walls.
Larger cliffs remain away from the immediate bank. Crossings retain shared actor
and deck registration.

`waterGeometry.ts` builds cross-channel strips with depth measured against the
actual ground. `Water3D.ts` uses that depth to reveal the existing gravel painting
through shallows, shade deeper water, and break up the shoreline. Restrained current
strokes use active gameplay seconds; menus and reduced motion stop the movement.
Water uses one surface draw plus the existing instanced timber deck batch.

`sceneDressing.ts` uses global cluster parents and neighborhood spacing rather than
one independent random prop per grid cell. Willows and reeds follow suitable wet
banks, larch and pine form sparse sheltered groups, and alpine cover thins with
exposure and snow. Rubble groups occupy cliff feet. Small grass, wildflower, branch,
and pebble accents occupy coherent patches. Protected camp/caravan ground stays
clear. Trees retain the existing painting, with restrained scale, height, tint, and
mirroring variations. Props still share atlas batches; small ground details do not
add expensive shadow casters. Placement is independent of chunk loading order or
partitioning.

The one new bitmap is documented with its final prompt and registration in
[small painted landscape details](environment-detail-art.md). No character,
building, or tree painting was replaced. No additional artwork is required for
this pass; more plant species would be optional variety.

## Validation and performance

Unit tests cover normalized material masks, water/shore registration, carved bed
depths, chunk-independent ecology, exclusion areas, cliff relief seams and winding,
fixed cliff anchors, exact terrain queries, and connected caravan ground.
Browser tests exercise every destination, debug/terrain-only modes, elevated
movement and combat, pooled render budgets, and frozen water in menus. The native
art-review test fixes Golden Pasture at (2600,2600), zoom 1, and saves both normal
and terrain-only views before measuring 350 pooled enemies. It holds full render
scale with the adaptive scaler frozen through spawning, a one-second warm-up,
and a three-second frame-rate sample. The sample also logs mean and 90th-percentile
main-thread frame times. Budget assertions remain in
`tests/desktop/environment-quality.spec.ts`. Production Electron checks cover
offline launch, migration, and both desktop window sizes.

The final isolated native 350-enemy Golden Pasture sample measured about 60 FPS
on Intel Iris Xe at 1280×800, full render scale, and secondary texture sampling,
with 30 draw calls, 18 resident textures, and unchanged terrain geometry. This is a local sample rather than a hardware certification. Richer
terrain and soft shadows cost more fragment work. The existing adaptive pixel
scaler now also selects one texture sample per material and cheaper shadow
filtering below 70% resolution; full quality retains rotated secondary samples and
soft PCF shadows. Camera projection, world dimensions, collision, and HUD layout
stay constant during these transitions. Debug overlays skip material sampling.

Review captures: `test-results/environment/before-golden.png` and
`after-golden.png` use the same seed, target, zoom, and 941×1030 viewport. The paired
`before-terrain.png` / `after-terrain.png` isolate materials and geology.
`after-golden-wide.png` and `after-combat-wide.png` show the final native battlefield
at 1280×800. The art-review regression regenerates the wide captures.

Final validation: `npm run check` passes formatting, strict renderer/desktop types,
228 unit tests, and the production build. Four regional browser regressions and
four Electron checks pass, including actual native combat, reduced motion, pause,
quality transitions, offline production play, migration, and both desktop sizes.
