# Mountain terrain prototype

The mountain generator is renderer independent. `terrain/noise.ts` hashes a string
seed into continuous quintic value noise and four-octave coherent and ridged noise.
`terrain/MountainTerrain.ts` domain-warps elongated ridges, blends broad foothills,
compresses selected uplands into plateaus, and carves two wide winding passes.
It flattens a broad camp basin and the complete eastbound caravan corridor.
`data/terrainBiomes.ts` authors the sample Mount Otgontenger region. Generation
settings and traversal limits live in `GAME.terrain`.

Sampling uses absolute world coordinates, including the halo used for central
height differences. Chunk request order never changes height, slope, shading, or
material weights. Chunks are 512 world units with 64-unit cells, clipped at the
finite arena boundary, and retained in a bounded least-recently-used cache.
Elevation blends grassland, rocky soil, exposed stone, alpine tundra, and snow;
steep slopes expose more stone. Surface normals produce upper-left illumination.
No artwork, PNGs, sprite sheets, or stand-alone mountain models are generated.

Steep cells supply N/E/S/W edge masks for modular cliff art. Until an atlas is
provided, the renderer can use flat cliff and stone placeholder colours. The
material system consumes the existing, locally bundled 2D ground textures.

`terrain/TerrainNavigation.ts` retains a coarse world traversal grid independently
of visual chunk eviction. It merges steep cells into exact collision rectangles,
records camp-connected ground for safe spawning, and shares bounded destination
flow fields among enemies. Diagonal steps cannot cut blocked corners. A swept
movement helper handles non-physical followers. Ordinary shots and ancestral
spirits can fly over cliffs; ground units must use the passes.

Unit tests cover deterministic seeds and chunk order, exact shared borders,
bounded caches, material continuity, broad open corridors, connected ground,
collision coverage, blocked spawn relocation, and paths around cliffs.

## Playing and inspecting the sample

Mount Otgontenger opts into `LandscapeDefinition.mountains` in both normal
expeditions and developer checkpoints. In a development build, press **F8** and
choose Mount Otgontenger in chapter 2 or 3. Ride north or south from the broad camp
basin, or zoom out to 60%, to reach and inspect the surrounding ranges. **F9** cycles
normal materials, elevation, slope, and collision overlays. It also outlines chunk
boundaries and displays resident, cached, and pending chunk counts. Elevation runs
from blue lowlands to red peaks; slope runs from green gentle ground to red cliffs.
The collision overlay marks blocked ground red and traversable cells turquoise.
Debug views also work while paused and never advance simulation time. F9 is absent
from production input bindings; the terrain itself remains enabled in production.

`terrain/MountainRenderer.ts` streams only the camera and a one-chunk margin, with
at most four new chunks built per frame. Render objects are destroyed when they
leave that area, while pure chunk data uses its independent 48-entry cache. Very
wide views can retain up to the finite arena's 121 render chunks. The navigation
grid and merged static collision bodies cover the entire region so offscreen
enemies cannot walk through unloaded cliffs. Scene restarts, arrivals, and leaving
the mountain region dispose old meshes, debug labels, boundaries, and navigation.

The existing Phaser Mesh renderer blends the bundled grass, gravel, tundra, and
snow PNGs with continuous vertex alpha. Global texture coordinates and extra face
splits at wrap boundaries preserve the original 1254-pixel PNGs without resizing
them, creating bitmap artwork, or relying on power-of-two-only texture wrapping.
Normals tint every material consistently. Surface geometry stays in the existing
2D ground coordinate system; there are no standalone mountain meshes or models,
and actor ground anchors and physics sizes retain their established registration.
Phaser's Canvas fallback uses flat material colours instead of textured meshes.

`MOUNTAIN_TERRAIN_ART` in `assets/painterlyArt.ts` maps the five material slots to
existing loaded textures and placeholder colours. Exposed stone and cliff faces
deliberately use flat placeholders. A future painted cliff atlas can assign
`cliff.texture` and `cliff.frames[mask]`, with N=1, E=2, S=4, W=8 exposed-side bits;
each registered module fits its 64-unit cell. The colour fallback already follows
those same modules and collision boundaries. No asset generation pipeline is
introduced. The sample replaces its former snowy-dome and foothill cutouts, and
the former fixed meltwater spline is omitted until water follows generated valleys.
Other locations retain their existing scenery and walkable surfaces.

`ArenaScene` owns `TerrainCollision`, enemy movement, and safe spawn selection.
Enemies share short-lived destination flow fields and take broad passes around
cliffs; chargers still stop against the same physical boundaries. Mounted allies
use swept ground movement when following the Khan. Existing camp workers stay in
the protected basin and caravan corridor. Menus freeze all gameplay and physics,
including succession, character motion, and migration.
