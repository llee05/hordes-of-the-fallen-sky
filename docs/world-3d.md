# Orthographic terrain vertical slice

The prototype keeps Phaser 3 as the simulation, input, animation, asset, and lifecycle
owner. Three.js renders a second WebGL canvas underneath the existing DOM interface.
Enable it with `http://localhost:5173/?terrain=3d`, then use F8 to visit Mount
Otgontenger. `VITE_TERRAIN_RENDERER=3d npm run dev` also enables it in Electron;
the same environment variable works at build time. Without the flag the original
renderer remains playable. Other destinations retain the existing presentation.

Phaser's Mesh objects use a painter's display list and cannot provide depth-buffered
terrain/sprite occlusion across the world. A separate Three renderer is a smaller
change than replacing Arcade, the game engine, pooled actors, or the interface.
Three's orthographic camera preserves apparent size regardless of depth
([camera contract](https://threejs.org/docs/pages/OrthographicCamera.html)).

Physics X/Y maps to render X/Z; render Y is elevation in the same world units.
Combat distances, collision circles, targeting, and speeds remain in the horizontal
simulation plane. The renderer never writes projected positions into physics.
The camera shares Phaser's follow target and zoom, at a configurable 65° elevation
(55–80°). The HUD stays in the DOM. Character crops preserve their logical atlas
canvas, ground origin, tint, rotation, flips, alpha, and active-time animations.
Visible characters are batched by atlas with depth testing and alpha cutout.

The trade-offs are a second WebGL context, an explicit bridge for Phaser graphics,
and additional GPU texture uploads. The prototype requires WebGL 2; the original
renderer remains available on older hardware. There is no engine rewrite, runtime
asset download, or new generated artwork.

Implementation milestones: camera/sprite bridge; continuous mountain geometry,
vertical cliff walls and materials; gameplay integration, tools, and validation.

The 3D heightfield reuses seeded coherent/ridged noise, domain warping, protected
camp/caravan masks, and winding valleys. A single fractured shelf has a broad
graded approach. It does not quantize the range into concentric tiers. Mesh cells
are split at the shelf boundary: upper and lower polygons share X/Z endpoints
with a separate vertical wall between them. Normals are sampled in global
coordinates on the appropriate side, so chunks share positions and lighting.
Ground queries interpolate these same triangles, including partial boundary cells.

Grass, soil, granite, tundra, snow, ice, and scree blend by elevation, slope, and
shelter. Existing meadow, granite-desert, and snowy ground images supply the
painted materials; cliff faces use triplanar rock mapping. Dual-scale sampling
reduces obvious repeats. There are no generated terrain bitmaps. Directional
sunlight, a bounded shadow map, ambient light, contact shading at wall feet, and
subtle distance fog supply depth. Chunk-local props follow the shared landform
rules. Geometry is built only on chunk entry and disposed on eviction.

Navigation remains a resident horizontal flow field. Conservative 16-unit probes
block steep slopes and wall discontinuities inside each collision cell. A tested
route reaches the elevated shelf from the camp, and more than half the complete
region is reachable; the remaining mountain slopes also serve as backdrop.

`MountainRegion.geometry` in `data/terrainBiomes.ts` authors shelf position,
footprint, rise, fracture, flattening, ramp width, grade, and traversal slope limit.
Regions without this optional geometry use continuous noise instead. The geometry,
material, sprite, effect, camera, and navigation adapters have separate modules
under `src/game/world3d/`. Two additional chunk rows outside the physical world
continue the backdrop while Arcade's world bounds remain unchanged.

In development, F6 cycles 55°, 65°, and 80°. F7 hides props, characters, and the HUD;
press it again to restore them. Backtick still opens the console in this view.
F9 cycles wireframe, elevation, normal colours, slope, traversability, chunk bounds,
and the actual collision cells. These tools continue working while paused.

| Console command           | Effect                                          |
| ------------------------- | ----------------------------------------------- |
| `camera-angle 55`         | Set the orthographic camera elevation (55–80°)  |
| `terrain-debug normals`   | Select a debug view; omit the argument to cycle |
| `terrain-debug off`       | Restore painted materials                       |
| `terrain-only on` / `off` | Isolate terrain or restore the scene            |

Existing Phaser hurdle drawings and ground warnings are replayed into cached
effect textures. Characters use depth-tested atlas batches and their existing
contact-shadow asset. Static scenery also casts sunlight shadows; the bounded
1024px shadow map refreshes at most three times per second once chunks settle.
Resident terrain submits two shared geometry batches; hurdle drawings share one
cached atlas and batch. Chunk geometry is retained independently for navigation
inspection and eviction. Frustum-based chunk selection and sprite culling bound
the submitted scene. Shared batches rebuild only when the resident set changes.
World rendering adapts between 50% and 100% pixel resolution on slow GPUs, with
hysteresis before restoring detail; DOM text, HUD size, camera scale, and physics
coordinates stay unchanged. The debug label reports the current pixel scale.
Ground-following arrows keep horizontal speed and range, and stop at vertical
discontinuities, including in collision callbacks. This prototype does not add
ballistic trajectories or height-based damage bonuses.

Validation covers deterministic generation, mesh/query agreement, seam positions
and normals, vertical faces, connected ramps, arrow/wall interception, developer
command validation, actual Arcade movement, elevated combat, depth occlusion,
chunk lifecycle, and pooled render load. Browser and Electron tests exercise the
same development entry point; `npm run check` verifies the shipping build.

This remains an opt-in vertical slice. The other destinations keep their original
renderer. Dedicated cliff, scrub, ice, and scree art would improve material quality;
current variants reuse existing paintings. Shadows have deliberately limited range
and resolution, and effects use a raster bridge rather than a full 3D particle
system. Target hardware performance and longer playtests remain necessary before
making this the default. The next step is to profile the slice on target hardware,
then author geometry configurations and materials for the other mountain biomes.

The full-capacity browser sample uses 350 enemies and exercises the 250-arrow pool.
On this machine's SwiftShader software GPU it measured roughly 9 FPS at the minimum
pixel scale. Simulation plus renderer CPU processing was below 20 ms in that
sample, with about 20 draw calls and 14 textures. This is a resource-budget check,
not a target-hardware frame-rate certification. The regression records software
FPS and checks bounded CPU/resource use; hardware GPU runs also require 30 FPS.
The measured software limit is a reason to keep the prototype behind its flag.
