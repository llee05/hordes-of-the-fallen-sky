# Location landscapes

Every camp has its own composition in `src/game/data/landscapes.ts`. Location IDs
select terrain, vegetation, landforms, water, and ambient particles independently
of the journey chapter. These are stylized surroundings, not accurate geographical
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

All twelve destinations support the [angled scene renderer](world-3d.md).
Their geometry, palettes, vegetation, and snow lines live in
`src/game/data/worldRegions.ts`; `ComposedTerrain` combines their masses with seeded
relief and broad traversable approaches. The [new quiet paintings](angled-scene-art.md)
provide meadow and granite materials plus an angled scenery atlas. Existing supplied
ground PNGs remain bundled for soil, snow, and previews.

The supplied `bodg-khan-uul.png` is stored as `bogd-khan-uul.png` to match the
canonical location ID. `painterlyArt.ts` preloads each unique tile once under
`ground-<basename>`, using the asset base URL for offline desktop and subpath builds.

`LandscapeDefinition` retains authored palettes, landmark anchors, and optional
water splines. Location previews reuse the painted scenery and water geometry;
they remain 2D interface illustrations. Battlefield geometry and depth-tested
scenery use the shared angled renderer. Returning to a checkpoint reproduces its
seeded composition, and arrival disposes the previous world before rebuilding.

## Orkhon Valley manuscript pack (Prototype v0.1)

Orkhon Valley integrates the antique illuminated-manuscript environment prototype pack
(`public/art/orkhon-valley/`), cut from AI-generated illustrated sheets based on Ulaan Tsutgalan
(Orkhon Falls) basalt cliffs, river, and steppe grassland:

- **Ground materials**: Seamless stitched 512×512 tiles (`meadow.png`, `worn-grass.png`,
  `packed-earth.png`, `gravel.png`, `riverbed.png`) composed from the pack's 18 base 128×128
  ground tiles (steppe grass, tall grass, white/yellow flowers, worn grass, dry dirt, packed earth,
  riverbank, shallow shore) and their mirrored variants with cosine cross-fade blending.
- **Water**: The river channel blends `river-water.png` (from the pack's `river_flow_a`, `river_flow_b`,
  and `river_eddy` surface textures) with active-time UV flow, over the shallow shore `riverbed.png`.
- **Basalt cliffs & stone**: Raised shelves and vertical cliff faces use `basalt-cliff.png`
  (columnar basalt cliff wall textures from `cliffs/vertical/straight_*`) and `basalt-stone.png`
  for exposed rocky terrain.
- **Scenery dressing**: 39 cleaned props are packed into `public/art/orkhon-valley/orkhon-scenery.png`
  and `orkhon-scenery.json`, including birch and larch groves, dead trees, flowering scrub,
  basalt boulders, rock piles, ruin arches and pillars, ovoo shrines, steles, and ritual props.
  Alpha channels have been trimmed to remove residual parchment halos and crop lines.
- **Unused pack assets**: `transitions/`, `paths_and_bridges/`, `vfx/`, `minimap/`, and static
  `waterfalls/` are omitted as the 2.5D world uses Three.js procedural shaders, instanced 3D bridges,
  and vector graphics. The pack remains prototype-grade for visual testing.

## Rivers and shores

`assets/riverGeometry.ts` samples authored watercourses into smooth channels with
separately varying banks. Orkhon's narrower branch splits and rejoins the main
river. Destination vignettes retain those channel outlines and Silent River ice.
The angled world uses `WorldRiver` and `Water3D` for carved riverbeds, banks,
water, and crossings; see [the scene guide](world-3d.md). Water animation follows
active gameplay seconds and freezes in menus. All art is bundled locally.
