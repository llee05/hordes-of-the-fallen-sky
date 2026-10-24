# Location landscapes

Every camp has its own composition in `src/game/data/landscapes.ts`. Location IDs
select terrain, vegetation, landforms, water, and ambient particles independently
of the story chapter. These are stylized surroundings, not accurate geographical
models. Existing cultural context remains in `data/clan.ts` and
[migration destinations](migration-locations.md).

| Location            | Landscape and scenery                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Golden Pasture      | Golden flowering meadow, low sage outcrops, narrow winding stream     |
| Silent River        | Frosted gravel bars, broad steel-blue water, ice shelves, dry reeds   |
| Broken Pass         | Dry fractured slate corridor, ochre scree, dark rock shoulders        |
| Heart of the Steppe | Ash-sage basin, indigo mountain shoulders, blue banners, red eclipse  |
| Otgontenger         | Seeded ranges and plateaus, winding grass passes, rocky slopes, snow  |
| Bogd Khan Uul       | Sheltered green foothills with golden larch and deep sage pine groves |
| Altai Tavan Bogd    | Five snowy crests, turquoise glacier seams, silver-green gravel       |
| Khan Tengri         | Single sharp white pyramid, lavender scree, angular blue-grey crags   |
| Belukha             | Paired white heights, milky glacial water, cool meadow and conifers   |
| Altan Ovoo          | Flat-topped extinct cone, amber grass, charcoal basalt; no lava       |
| Eej Khairkhan       | Sculpted peach granite, pale sand ribbons, sparse dry grasses         |
| Orkhon Valley       | Braided blue-green river, reed beds, willows and lush sage pasture    |

The shared cutouts are bundled in `public/art/steppe-scenery-v2.png` and its atlas JSON.
The atlas retains transparent gutters and a common ground registration; it adds no
animation frames. [The complete generation prompt](location-scenery-prompt.md)
records the built-in image generation tool and all subjects.

Eight user-supplied 1254 × 1254 terrain PNGs are bundled unchanged in `public/art/`:

| Location          | Ground tile             | Surface                                              |
| ----------------- | ----------------------- | ---------------------------------------------------- |
| Altai Tavan Bogd  | `altai-tavan-bogd.png`  | Alpine gravel, sage scrub, rocks, patchy snow        |
| Altan Ovoo        | `altan-ovoo.png`        | Rust soil, amber grasses, charcoal basalt            |
| Bogd Khan Uul     | `bogd-khan-uul.png`     | Woodland soil, roots, moss, pine needles             |
| Khan Tengri       | `khan-tengri.png`       | Snow, blue ice, exposed alpine rock                  |
| Orkhon Valley     | `orkhon-valley.png`     | Green pasture, flowers, worn soil, pebbles           |
| Mount Otgontenger | `mount-otgontenger.png` | Alpine grass, wildflowers, pale gravel, mossy stones |
| Mount Belukha     | `mount-belukha.png`     | Dark woodland soil, moss, ferns, roots, and stones   |
| Eej Khairkhan     | `eej-khairkhan.png`     | Warm granite slabs, sandy gravel, sparse dry grass   |

All twelve destinations now use the [angled scene renderer](world-3d.md) by default.
Their geometry, palettes, vegetation, and snow lines live in
`src/game/data/worldRegions.ts`; `ComposedTerrain` combines their masses with seeded
relief and broad traversable approaches. The [new quiet paintings](angled-scene-art.md)
provide meadow and granite materials plus an angled scenery atlas. Existing supplied
ground PNGs remain bundled for soil, snow, previews, and the compatible renderer.

The following tile, scenery, and `RiverSurface` descriptions document that compatible
renderer, available with `?terrain=2d` or `VITE_TERRAIN_RENDERER=2d`.
The supplied `bodg-khan-uul.png` is stored as `bogd-khan-uul.png` to match the
canonical location ID. `LandscapeDefinition.groundTile` selects the PNG basename;
`painterlyArt.ts` preloads each unique tile once under `ground-<basename>`, using
the app's asset base URL for both offline desktop and browser subpath builds.
`GROUND_TILE_SCALE` displays ground at 0.65 world units per source pixel. A world-sized
tile sprite switches texture on arrival. Otgontenger additionally uses the
[stepped terrain prototype](mountain-terrain.md) in this compatible presentation.

`LandscapeDefinition` is renderer independent. It defines a quiet ground wash,
surface marks, bounded vegetation counts, camp-relative landmark anchors and
optional water splines. A missing water definition means dry ground. Landmark
widths include the shared logical canvas. Chapters retain their gameplay pressures;
the White Silence adds a light snow veil to the chosen place rather than replacing
its landscape. The red eclipse and fictional passage belong to the final refuge.

Scenery is decorative and walkable. A clear strip around the camp and eastward
caravan route keeps tall vegetation and rock clusters away from the main battle.
Large landforms sit behind actors; smaller props sort by their ground positions.
Scattered props also leave each landmark’s projected silhouette clear, keeping
rocks and trees from appearing on top of snowy summits or volcanic slopes.
All terrain is seeded by location, so returning to a checkpoint reproduces its
composition. Arrival destroys the previous location's scenery before rebuilding;
textures load once through `painterlyArt.ts`. Weather uses active gameplay seconds
and freezes in menus. No runtime image generation or asset downloads are required.

## Rivers and shores

`assets/riverGeometry.ts` samples the authored watercourses into smooth channels
with separately varying near and far banks. Orkhon's narrower branch splits and
rejoins the main river around dry gravel bars. The same geometry keeps scattered
tree, reed, and rock bases away from the water, including a small dry margin.

`assets/RiverSurface.ts` paints opaque blue-green water over softened soil edges,
shallow shelves, broken deeper pools, and restrained directional brush grain.
Pebbles and small reed clumps follow the banks. Silent River has irregular,
angular ice shelves, shaded edges, and fine fractures around open water. These
adaptable shapes use native geometry and the existing painted reed atlas; no new
bitmap or character frame is required. All river layers stay behind combat actors
and remain decorative and walkable.

Broken current highlights follow distance along each bend using active gameplay
seconds, with a bounded number of strokes redrawn at 15 Hz. Frozen water moves more
slowly while its ice stays fixed. Menus freeze the water, and the operating system's
reduced-motion preference keeps current highlights still, including live preference
changes. Destination vignettes reuse these same channel outlines, including the
Orkhon branches and Silent River ice.
