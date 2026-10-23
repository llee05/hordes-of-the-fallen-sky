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
| Otgontenger         | Broad white snow crown, alpine sage turf, larches, narrow meltwater   |
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
