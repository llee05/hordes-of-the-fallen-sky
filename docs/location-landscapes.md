# Location landscapes

Every camp has its own composition in `src/game/data/landscapes.ts`. Location IDs
select terrain, vegetation, landforms, water, and ambient particles. These are stylized surroundings, not accurate geographical
models. Existing cultural context remains in `data/clan.ts` and
[migration destinations](migration-locations.md).

| Location         | Landscape and scenery                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Otgontenger      | Authored alpine bench, snow overlook, glacial tarn and larch valley   |
| Bogd Khan Uul    | Authored Tuul-side meadow, woodland shoulder, larch and pine groves   |
| Altai Tavan Bogd | Five snowy crests, turquoise glacier seams, silver-green gravel       |
| Khan Tengri      | Authored glacier margin, lavender scree, blue ice and northern ridge  |
| Belukha          | Authored twin-height glacial valley, milky lake, meadow and conifers  |
| Altan Ovoo       | Authored two-tier cinder cone, amber grass, charcoal basalt; no lava  |
| Eej Khairkhan    | Authored granite terrace, rock pools, pale sand, sparse dry grasses   |
| Orkhon Valley    | Authored two-level basalt gorge, eastern falls and river, open steppe |

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

All eight destinations support the [angled scene renderer](world-3d.md).
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

## Orkhon Valley level

Orkhon Valley is hand-authored from the Orkhon Valley texture pack v2: an open valley
floor around the camp, basalt plateaus joined by ramps, and an eastern gorge river below
the falls. See [the level guide](orkhon-valley.md) for its layout, traversal rules and
which pack assets are used where. Its scale is the reference for
[the art specification](art-spec.md); the other locations' scenery, ground and shelf
heights still differ from it.

## Altan Ovoo level

Altan Ovoo is authored as a 6,400 × 4,000-unit volcanic-steppe battlefield with one raised cinder cone, two walkable ramps, a south-west camp, a northern summit ovoo, and connected trails through the spring and other terrain sites.
The level keeps open combat lanes between dense basalt outcrops and autumn clusters.
Four hand-painted ground quadrants follow that terrain while the spring, cliffs, scenery, landmarks, actors, and collision remain separate.
See [the level guide](altan-ovoo.md) for its layout, hybrid-rendering boundary, existing-art mappings, performance, and deferred gameplay features.

## Mount Otgontenger level

Mount Otgontenger is authored as a 6,400 × 4,000-unit alpine battlefield with one raised snow
bench, two broad ramps, a south-west starting camp, connected valley tracks, and an eastern glacial
tarn and outflow. Four hand-painted ground quadrants follow the geometry while cliffs, water,
larch, moraines, landmarks, actors, and collision remain separate. See
[the level guide](otgontenger.md) for the layout, painted-ground boundary, performance, fallbacks,
and deferred gameplay ideas.

## Eej Khairkhan level

Eej Khairkhan is authored as a 6,400 × 4,000-unit granite-desert battlefield with one raised terrace, two broad ramps, a south-west camp, a western rock-basin site and a small south-east spring hollow.
The impassable sculpted massif frames the northern edge while pale sand-and-gravel ground leaves wide combat lanes below.
Four hand-painted ground quadrants follow the routes and elevation geometry; cliffs, water, sparse granite dressing, actors and shadows remain separate.
See [the level guide](eej-khairkhan.md) for the real-place translation, layout, renderer boundary, GPU cost and deferred features.

## Mount Belukha level

Mount Belukha is authored as a 6,400 × 4,000-unit glacial-valley battlefield below an inaccessible twin-summit headwall.
Western moraine and eastern larch terraces form the raised tier, three ramps connect them to the broad lower meadow, and connected trails link the south-west camp to the lake shore, bridge, conifer hollow, overlook and outwash.
Four hand-painted quadrants follow that terrain while the milky lake and outflow, bridge, cliffs, conifers, glacier pieces, summit silhouette, actors and collision remain separate.
See [the level guide](belukha.md) for the layout, camera-edge coverage, hybrid-rendering boundary, memory figures and deferred gameplay features.

## Khan Tengri level

Khan Tengri is authored as a 6,400 × 4,000-unit glacier-margin battlefield with a safe south-west
camp, one raised lateral-moraine terrace, two broad ramps, a connected moraine trail loop, and an
eastern meltwater channel. Four hand-painted quadrants carry snow, blue ice, lavender scree,
exposed alpine rock, the glacier tongue and its calm water surface across both elevation tiers.
An off-playfield terrain ridge frames the northern peaks while cliffs, crags, collision and sparse
rock dressing remain separate. See [the level guide](khan-tengri.md) for the layout, rendering
boundary, memory budget, and deferred gameplay features.

## Bogd Khan Uul level

Bogd Khan Uul is authored as a 6,400 × 4,000-unit Tuul-side foothill battlefield with an open lower camp meadow, a northern riverbank and one raised southern woodland shoulder joined by two ramps. Connected tracks reach five named terrain sites while dense pine and golden-larch groves frame broad combat ground. Four hand-painted ground quadrants follow the same terrain, tracks and dry riverbanks; water, cliffs, vegetation, landmarks and collision remain separate runtime layers. See [the level guide](bogd-khan-uul.md) for the layout, hybrid boundary, memory cost and deferred gameplay ideas.

## Rivers and shores

`assets/riverGeometry.ts` samples authored watercourses into smooth channels with
separately varying banks. Orkhon's gorge river keeps its exact authored course. Destination vignettes retain those channel outlines.
The angled world uses `WorldRiver` and `Water3D` for carved riverbeds, banks,
water, and crossings; see [the scene guide](world-3d.md). Water animation follows
active gameplay seconds and freezes in menus. All art is bundled locally.
