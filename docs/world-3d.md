# Angled Living Steppe scenes

The main renderer now presents all twelve destinations as angled orthographic scenes.
Run `npm run dev` or `npm run dev:web`; no developer flag is required. The previous
presentation remains available with `?terrain=2d` in the browser, or
`VITE_TERRAIN_RENDERER=2d npm run dev` in Electron. WebGL initialization failures
also restore the previous renderer.

Phaser owns simulation, Arcade physics, input, pooling, animation, menus, and asset
loading. Three.js provides depth-buffered terrain underneath the existing DOM HUD.
Physics X/Y maps to render X/Z; render Y is real elevation. Targeting distances,
speeds, and hitboxes stay in horizontal world coordinates. Camera projection never
writes screen positions into physics. The camera follows the Khan at 48° above
horizontal with a fixed 30° azimuth, a modest look ahead, and a wider landscape view.
Movement follows screen directions. Characters retain their existing painted frames,
logical canvases, ground anchors, attack timing, and terrain contact shadows.

## Geography and rendering

`src/game/data/worldRegions.ts` defines each region's palette, snow line, vegetation,
and connected geological masses. `ComposedTerrain` combines domain-warped coherent relief, ridged noise,
and fractured shelf boundaries with authored ramps and protected battle spaces.
Multiple overlapping layers form shelves, ravines, peaks, and connected ranges.
The camp occupies an open raised shelf with several broad approaches. The east
caravan route remains connected. Mountain regions add snow at higher elevations;
forests, volcanic steppe, rivers, and granite desert retain their distinct palettes.
The original ridged-noise heightfield remains available independently for testing
and the previous prototype.

`sceneGeometry` clips global 32-unit triangles at every shelf boundary and adds
actual vertical rock faces. Height queries interpolate those same triangles.
Global normals and deterministic intersections keep neighboring chunks continuous.
Cliff winding agrees with outward normals for correct directional lighting.
Materials blend meadow, soil, exposed rock, scrub, scree, snow, and ice from slope
and elevation. Painted surface images, triplanar rock mapping, directional sunlight,
contact shading, bounded cast shadows, and distance fog reinforce the geometry.
[New material and scenery assets and their prompts](angled-scene-art.md) live locally
in `public/art/`; the original actor and camp atlases are retained.

`sceneDressing` places rubble below cliffs, shrubs on shelves, groves in suitable
lower terrain, and sparse alpine conifers below the snow line. It excludes camp,
caravan lanes, steep slopes, snowfields, and watercourses. Props use painted
camera-facing atlas frames and depth testing rather than individual mountain sprites.

`WorldRiver` shares channel and crossing registration between terrain, dressing,
`Water3D`, and character anchors. Channels carve through raised masses. Turquoise
water and shoreline foam follow the existing regional splines. Instanced timber
planks form crossings; actor feet meet their deck elevation. Frozen rivers omit
wooden crossings. Water animation uses active gameplay seconds and freezes in menus.
The channels remain shallow traversable decoration; this change adds no swimming rule.

Navigation uses resident horizontal flow fields with conservative slope and cliff
probes. Traversable ramps connect the elevations. Arrows retain their original
horizontal range and stop at vertical discontinuities. No ballistic or elevation
damage rules are introduced.

## Tools and limits

In development, F8 chooses any destination. Backtick opens the console directly.
F6 cycles camera elevations, F7 isolates terrain, and F9 cycles wireframe,
elevation, normals, slope, traversability, chunk bounds, and collision cells.

| Command                   | Effect                                  |
| ------------------------- | --------------------------------------- |
| `camera-angle 48`         | Set camera elevation, 35–70°            |
| `terrain-debug slope`     | Select a debug view; no argument cycles |
| `terrain-debug off`       | Restore painted materials               |
| `terrain-only on` / `off` | Isolate terrain or restore the scene    |

Geometry streams by visible chunks and is disposed on eviction. Resident terrain
uses two shared mesh batches; actors batch by atlas, bridge planks use instancing,
and a frustum test excludes offscreen chunks. Height and normal caches are bounded.
Shadow maps update at a reduced rate once the view settles; world-scale bias
prevents self-shadow stippling on broad shelves. Pixel resolution adapts
on slow GPUs while HUD text and world dimensions retain their size.

This is a stylized 2.5D renderer: painted actors and vegetation remain billboards,
with actual geometry for terrain, crossings, and portable timber hurdles. Fence
posts follow their individual ground endpoints and preserve camp movement, wear,
and impact feedback. A restrained turquoise Khan silhouette passes the depth test
only where terrain or scenery obscures him; visible painted pixels retain their
normal appearance. Effects use the existing Phaser
graphics bridge rather than a new particle engine. Broad approaches deliberately
favor bullet-heaven movement over exact landscape realism. GPU performance and
longer combat balance still require target-hardware playtesting; software GPU
rendering is substantially slower and is not a frame-rate certification.

Browser scene regressions exercise the default renderer across all twelve
locations, screen-relative ramp movement, elevated combat, real terrain occlusion,
console debug views, water pause behavior, resource budgets, and renderer teardown.
Flat-coordinate simulation and compatibility-art regressions explicitly request
`?terrain=2d`; they retain their original movement and pixel-space assumptions.
Electron checks exercise the default view, offline production launch, migration,
persistence, and both 1280×800 and 960×600 windows. Terrain unit tests cover mesh/query
agreement, chunk seams and normals, cliff winding, connected caravan ground,
water/bridge registration, and moving fence anchors.

See [the environmental quality pass](environment-quality.md) for the current material
shader, cliff relief, shared bank geometry, vegetation masks, and quality scaling.
