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
