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
