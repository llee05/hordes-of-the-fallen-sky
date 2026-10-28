# Mountain terrain

Mount Otgontenger uses the shared angled 2.5D world. See [the scene guide](world-3d.md)
for rendering, navigation, streaming, and debug controls. The former flat Phaser
mountain renderer and its contour-face geometry have been removed.

`terrain/MountainTerrain.ts` remains a renderer-independent deterministic heightfield
used by terrain tests and the standalone `MountainHeightfield` prototype. Shared
navigation, material definitions, and deterministic dressing remain available to
the angled renderer. Production location composition uses `ComposedTerrain` and
`data/worldRegions.ts` for real height vertices, vertical cliffs, and connected ramps.
