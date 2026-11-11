# Art specification

One written scale and style contract for every painted asset in the angled world. It records
what the approved art on main already does, measured rather than chosen: Orkhon Valley after
PR #63 sets the scale, and its texture pack, the character sheets and the renderer set the rest.
Use it to brief new art, to check a delivery before it goes into the game, and to bring the other
places onto the same scale.

- **Numbers in code:** [`src/game/data/artSpec.ts`](../src/game/data/artSpec.ts) exports every
  number below as `ART_SPEC`. Orkhon Valley reads its scale constants from it.
- **Tests:** `tests/unit/artSpec.test.ts` checks that the companion matches the camera, actor
  sizes, Orkhon constants, light and shadows the code uses, and that every Orkhon prop and
  landmark falls inside its size band.
- **Palette and edge measurements:** `node scripts/measure-art.mjs` (development only, needs
  ImageMagick) prints the palette and edge figures below from the bundled PNGs. Rerun it after an
  art change and update `ART_SPEC.palette` and `ART_SPEC.edges` if the approved art moves.

The broader direction, materials and prompts stay in [the Living Steppe Tapestry](living-steppe-tapestry.md)
and [the character animation guide](character-animation.md); this page only adds the numbers.

## Units

All sizes are **billboard heights in world units**: the painted cutout's height once it is drawn
at its world width. Actors and scenery are camera-facing billboards, so their billboard heights
compare directly on screen. Terrain walls are real geometry and appear `cos 48° ≈ 0.67` as tall
on screen as they are in the world. At camera zoom 1, one world unit is 0.8 screen pixels.

## Camera and perspective

| Property        | Value                                                 | Source                       |
| --------------- | ----------------------------------------------------- | ---------------------------- |
| Projection      | Orthographic                                          | `World3DRenderer.camera`     |
| Elevation       | 48° above horizontal                                  | `WORLD_3D.angle`             |
| Azimuth         | 30°, fixed                                            | `WORLD_3D.yaw`               |
| Screen scale    | 0.8 px per world unit at zoom 1                       | `WORLD_3D.worldScale`        |
| Debug elevation | 35–70° (F6, `camera-angle`); art is not checked there | `WORLD_3D.minAngle/maxAngle` |

Paint every sprite, tile and cliff band for a **48° high three-quarter view**. Sprites face the
camera; their ground contact is their bottom-centre anchor (`originY` 0.9 for the steppe atlases,
the manifest anchor for the Orkhon pack). Painted perspective only matches the default camera.

## World scale reference

The **Khan on horseback** is the scale reference: `ART_WIDTH.player` is 62 units wide, and the
painted frames of `steppe-mounted-motion` measure **62.5–64.4 units tall** at that width. The
spec calls 63 units "one rider".

## Size bands

Bands are the extents measured on main, rounded outward: actors from their atlas frames and
sizes, scenery from Orkhon Valley after PR #63 across each prop's full size spread. New art and
rescaled places should land inside them.

| Band             | World units | Riders    | Contents                                                      | Measured on main                        |
| ---------------- | ----------- | --------- | ------------------------------------------------------------- | --------------------------------------- |
| `khan`           | 62–65       | 1         | The Khan                                                      | 62.5–64.4                               |
| `clanRiders`     | 46–53       | 0.7–0.8   | Accompanying riders (`ART_WIDTH.rider` 50)                    | 46.7–52.3                               |
| `campLife`       | 25–39       | 0.4–0.6   | Walking workers and packhorses at the camp's 0.75 scale       | workers 25.0–25.5, packhorses 29.5–38.2 |
| `enemies`        | 25–150      | 0.4–2.4   | Every enemy definition, base and local                        | see below                               |
| `trees`          | 90–150      | 1.4–2.4   | Groves and rim trees                                          | 94.9–141.9                              |
| `shrubs`         | 15–46       | 0.25–0.75 | Shrubs, wildflowers, reeds, pebbles and stones at shrub scale | 17.0–45.1                               |
| `rocks`          | 30–90       | 0.5–1.4   | Rubble at cliff feet and in the open                          | 31.4–86.2                               |
| `smallLandmarks` | 55–120      | 0.9–1.9   | Banners, racks, standing stones, relic fires                  | 58.5–116.6                              |
| `structures`     | 75–150      | 1.2–2.4   | Gers, carts, canopies and camp fires dressing a camp          | 76.5–146.2                              |
| `largeLandmarks` | 170–220     | 2.7–3.5   | Raider camps, ruins, the sacred ovoo, basalt pillars          | 175.1–218.2                             |

Enemy heights (`ART_WIDTH[texture] × scale / 2`, every frame): hollow wolf 26.0–30.8, hollow
seer 38.3–45.5 (local callers 42.1–50.1), winged shade 47.7–52.0, ghost rider 66.5–68.4 (local
lancers 73.2–75.2), earthbound hulk 83.1–110.6, frost mare 99.8–102.6, eclipse giant
110.8–147.4. Enemies use the same billboards as the Khan, so these compare directly.

Orkhon sizes come from `ORKHON_SPRITE_SCALE` (1.7 world units per pack pixel) times a factor:
trees 0.66 (×0.90–1.10 on rims, ×0.92–1.10 in groves), shrubs and flowers 0.5, rocks 0.7
(×0.85–1.15 at cliff feet), reeds 0.6, and the landmark factors in `ART_SPEC.orkhon.landmarkScale`.
Raider camps, ruins, pillars, gers, carts, canopies and fires keep factor 1.

Large rock clusters reach 1.4 riders because their painted height includes the depth of the pile
on the ground; single stones and boulders stay between knee and shoulder of a rider.

## Plateaus and cliffs

- Orkhon plateaus rise **240 units** above the valley floor: 3.8 riders in world units, about
  **2.5 riders on screen** once the wall is foreshortened.
- Cliff walls are geometry painted with opaque basalt bands from the pack
  (`ORKHON_CLIFF_FACES`); a band's 44–69 source rows span the full rise, and its 66-pixel
  columns keep that texel size on screen. Painted grass lips stay on top.
- Plateau tops weather by at most ±11 units, so each stays one level; the valley's relief is
  0.35 of the composed default.

## Texture tiles and repetition

- **Pack tiles** are 128 × 128 px and cover **200 × 200 units** (1.56 units per texel). Each
  tile's last column and row repeat its first, so the tile wraps without a seam step (measured
  wrap-to-interior colour step 0.48–0.85).
- Sample each ground painting **once, at its painted scale**, in world space. Break the grid by
  alternating the calm base painting at two orientations in regions roughly 400–1,100 units
  across, never by tinting or scaling it.
- Materials meet by **height blending** (`authoredHeight` in `terrainShader.ts`): each
  painting's own light and dark strokes decide where it shows through. Do not cross-fade, add
  transition decals or colour filters.
- Water tiles span the river bank to bank; their light edge columns fall on the faded shoreline.
- Sprite texel density in Orkhon: trees 1.0–1.2 units per pack pixel, shrubs 0.85, pebbles
  and boulders 0.85, reeds 1.0, landmarks 1.0–1.7. Terrain kit cutouts keep full sheet
  resolution and are finer: cliff bands about 1.4 units per pixel, waterfall curtains 0.73,
  the plunge pool 0.9, pillars 0.88, cliff-foot scree 0.42–0.57 and islets 0.37. The Khan's
  sheet is far finer (0.24 units per pixel), which suits the actors the eye follows.

## Edges

- Cutouts are real alpha on transparent gutters. Orkhon pack sprites carry a **2.3–2.8 px**
  soft edge (partially transparent texels per outline texel) and no paint touches the frame edge.
- Terrain kit cutouts were painted on white: `scripts/cut-orkhon-terrain-kit.mjs` keys out only
  white connected to the cell border and un-mixes partly white edge texels from white, so no
  white fringe remains around the ink (0.25–0.4 px of partial alpha per outline texel).
- Fully transparent texels take the colour of nearby paint (`scripts/pack-orkhon-valley.mjs`,
  `scripts/cut-orkhon-terrain-kit.mjs`), so linear filtering does not darken cutouts.
- Overlay crops that were cut with paint up to their frame discard a narrow, irregular band at
  each frame edge (`orkhonOverlay.ts`) so no straight crop line shows. Colours are never changed.
- Character sheets are trimmed atlases on a shared logical canvas (256 × 360 for mounted and
  creature sheets, ground row 324; 320 × 440 for the clan sheet, ground row 396). Their soft
  painted dust, manes and cloth leave far more partial alpha than the pack sprites; keep frame
  registration as [the animation guide](character-animation.md) describes.

## Light and shadows

- One warm sun (`#fff0db`) from **screen left and above**: offset (−1900, +3450, +1350) from the
  view focus in render axes, about 56° above the ground and slightly toward the camera. Paint
  form light from the **upper left** with cool olive shade on the right.
- Terrain receives soft PCF shadow maps (intensity 0.72).
- Do not bake cast or ground shadows into sprites. The game adds contact shadows: an olive
  (`#333c2f`, alpha 0x55 fading to 0) ellipse under actors, and under shadow-casting scenery an
  ellipse 0.7 × 0.22 of the prop's width at alpha 0.45, offset (+8, +5) down and right.
  Orkhon trees and landmarks cast one; shrubs, rocks and reeds do not.

## Palette

Words first: golden ochre grassland, warm dry dirt, umber-and-ochre basalt, turquoise-grey water;
trees and shrubs in ochre, olive and autumn rust; landmarks and camps in ivory felt, umber timber
and rust cloth. The clan is darker and warmer than the ground; the calamity is desaturated ash,
stone and slate. No colour filters or tints on supplied art.

Measured by `scripts/measure-art.mjs` over painted texels (alpha ≥ 128). CIELAB lightness L\*
and chroma C\* are given as 5th / 50th / 95th percentiles; hue is the chroma-weighted mean.

| Group                     | L\*          | C\*          | Hue  | Median    |
| ------------------------- | ------------ | ------------ | ---- | --------- |
| Ground (six pack tiles)   | 38 / 58 / 72 | 23 / 50 / 62 | 78°  | `#b1832d` |
| Water (flow and rapids)   | 24 / 37 / 86 | 5 / 13 / 17  | 219° | `#395c67` |
| Cliff band sprites        | 20 / 43 / 71 | 6 / 22 / 66  | 71°  | `#7f603b` |
| Trees                     | 18 / 51 / 85 | 15 / 44 / 79 | 72°  | `#a96c25` |
| Shrubs, flowers and reeds | 23 / 53 / 90 | 17 / 39 / 72 | 81°  | `#a37828` |
| Rocks                     | 18 / 51 / 82 | 8 / 24 / 59  | 69°  | `#97714e` |
| Landmarks                 | 16 / 55 / 89 | 6 / 28 / 68  | 68°  | `#aa7950` |
| Camps and gers            | 16 / 55 / 88 | 13 / 39 / 68 | 63°  | `#b97241` |
| Khan                      | 9 / 28 / 59  | 4 / 17 / 47  | 58°  | `#4d3b26` |
| Clan riders and camp life | 7 / 30 / 78  | 4 / 24 / 56  | 52°  | `#673a26` |
| Enemies                   | 16 / 36 / 74 | 3 / 14 / 36  | 111° | `#4a5655` |

Individual ground tiles of the initial import (since retired): `plateau_grass` L\* 43/57/67,
`steppe_grass_var` 39/56/68, `dry_grass` 45/61/72, `patchy_grass` 36/53/67, `dry_dirt` 47/63/71,
`rocky_ground` 27/58/76 (the only low-chroma ground, C\* 14/28/44).

The Orkhon terrain kit that replaced them (`art-source/orkhon-terrain-kit.png`, as cut):

| Kit tile or cutout       | L\*          | C\*          | Hue  | Median    |
| ------------------------ | ------------ | ------------ | ---- | --------- |
| `valley_calm`            | 50 / 64 / 71 | 38 / 47 / 51 | 85°  | `#bb9543` |
| `valley_olive`           | 47 / 62 / 71 | 34 / 42 / 46 | 91°  | `#ac9449` |
| `valley_straw`           | 52 / 68 / 76 | 41 / 49 / 54 | 76°  | `#d39b4c` |
| `plateau_moss`           | 30 / 43 / 54 | 16 / 25 / 33 | 103° | `#6a683e` |
| `trail_dirt`             | 61 / 72 / 77 | 35 / 42 / 46 | 72°  | `#dea666` |
| `scree_gravel`           | 36 / 61 / 72 | 11 / 28 / 37 | 72°  | `#b18c63` |
| River channel and rapids | 35 / 50 / 86 | 9 / 12 / 24  | 116° | `#70796b` |
| Cliff straight run       | 28 / 51 / 78 | 10 / 26 / 50 | 75°  | `#967449` |
| Pillar, scree and islet  | 28 / 54 / 81 | 8 / 23 / 47  | 75°  | `#9b7c54` |

The valley floor (calm and olive) has median L\* 63, inside the manuscript target, but median
C\* 44, above it; plateau moss sits 20 L\* below the valley, more than the 10–14 the target asks.

## Readability

- **Ground is quiet and mid-light.** Keep new ground within the measured ground ranges: median
  L\* about 58 with 90% of texels between 38 and 72, no high-contrast marks. The Khan's median
  L\* is 28 and enemies' 36, so they read as dark shapes against light ground.
- **Enemies stay desaturated.** Enemy chroma stays below about 36 (95th percentile) against
  saturated ochre ground (median C\* 50), with restrained turquoise light only.
- **Scenery stays off the fighting lanes.** Nothing is placed on worn paths, ramps or the
  camp's worn ground; scatter is sparse (Orkhon places one shrub or flower at about 14% of
  230-unit cells away from cliffs).
- **Occluders never hide the Khan.** Scenery is depth-tested; a turquoise silhouette shows the
  Khan where terrain or scenery covers him ([the scene guide](world-3d.md)).
- **Projectiles and warnings sit above the art.** Projectile contrast, effect density, elite
  rings and offscreen warnings are described in [combat readability](combat-readability.md);
  quiet ground and desaturated enemies are what let them stand out.

## Manuscript style

All new terrain, environment props and level kits follow an **antique, hand-painted manuscript
illustration style** (2D/2.5D), evocative of 13th–14th century Central Asian and Persian-Mongolian
chronicle miniatures (such as the _Jami al-Tawarikh_) combined with the readable miniature scale of
_Thronefall_ and _The Banner Saga_.

### Concrete rules

- **Ink outlines:** Crisp hand-drawn ink contours (**1.0–2.0 px** at source texel density) define
  ground edges, cliff rims, rock facets, riverbanks and structure silhouettes. Lines carry subtle
  natural calligraphic weight variation without digital airbrush blur, mechanical vector smoothing or
  pixel-art jaggies. Outlines and pen strokes use warm iron-gall/carbon-umber ink (**`#2b221a`**,
  L\* 16, C\* 8, hue 56°), never digital pure black (`#000000`).
- **Parchment ground tone:** The ground is conceived as aged vellum or unbleached linen manuscript
  paper stained with translucent mineral washes. The warm, faded paper base (**`#e5cca8`** /
  **`#dfc79b`**, L\* ~78–82, C\* ~18–24) provides the underlying warmth and negative space, ensuring
  the battlefield reads as an illuminated chronicle page rather than synthetic video-game turf.
- **Hatching for shade and form:** Shading, depth, cliff relief and recesses are rendered through
  hand-drawn directional parallel or cross-hatched pen lines (**2–5 px** stroke spacing at source
  resolution), reflecting medieval manuscript engraving and woodcut techniques. Never use smooth
  digital airbrush gradients, radial drop-shadow fades or 3D CG ambient occlusion.
- **Muted mineral pigment palette:** Natural ground earth pigments, mineral washes and plant dyes
  matching the approved character and camp art rather than the legacy Orkhon pack:

| Swatch               | Name                             | Hex       | L\* / C\* / Hue | Role                                              |
| -------------------- | -------------------------------- | --------- | --------------- | ------------------------------------------------- |
| `parchmentBase`      | Parchment ground base            | `#e5cca8` | 82 / 22 / 73°   | Unpainted vellum / linen paper base               |
| `valleyGrassCalm`    | Valley grass (calm sage-ochre)   | `#9c9261` | 59 / 24 / 94°   | Quiet base grassland across valley floor          |
| `valleyGrassStraw`   | Valley grass (sun-cured straw)   | `#b59d68` | 65 / 30 / 80°   | Warm dry grass variation                          |
| `valleyGrassOlive`   | Valley grass (subdued olive)     | `#85865c` | 54 / 19 / 99°   | Low-contrast cool grassland variation             |
| `plateauGrassMoss`   | Plateau-top grass (sage-moss)    | `#737a54` | 49 / 20 / 105°  | Elevated alpine steppe, visibly darker and cooler |
| `plateauGrassUpland` | Plateau-top grass (upland olive) | `#656c49` | 44 / 18 / 101°  | Deep upland shelf grass variation                 |
| `dirtTrail`          | Worn trail / hearth earth        | `#a6835c` | 56 / 28 / 68°   | Dry packed dirt paths and ramp surfaces           |
| `scree`              | Scree / river cobbles            | `#8c8273` | 54 / 9 / 75°    | Weathered slate-silt gravel and cliff-foot talus  |
| `basaltFace`         | Basalt cliff face (weathered)    | `#5e5245` | 35 / 10 / 68°   | Exposed vertical basalt column facets             |
| `basaltCrevice`      | Basalt crevice / shaded rock     | `#433930` | 25 / 8 / 64°    | Deep joint cracks and shaded ledge undercuts      |
| `inkContour`         | Carbon-umber ink                 | `#2b221a` | 16 / 8 / 56°    | All pen contours, column joints and hatching      |
| `riverVerdigris`     | River water (verdigris wash)     | `#4e6f77` | 44 / 15 / 205°  | Mineral turquoise-slate water surface             |
| `riverChannel`       | Deep channel slate               | `#395c67` | 37 / 13 / 219°  | Deep water flow channels                          |
| `foamChalk`          | Rapids and waterfall foam        | `#d8e2df` | 89 / 4 / 170°   | Bone-white mineral chalk wash for turbulent water |
| `lapisAccent`        | Lapis lazuli                     | `#2d4a68` | 31 / 23 / 252°  | Clan banners, Spirit Caller trim, camp cloth      |
| `vermilionAccent`    | Cinnabar vermilion               | `#9c3d28` | 38 / 48 / 38°   | War banners, archer deel trim, camp embroidery    |
| `brassAccent`        | Warm brass                       | `#c89e4b` | 68 / 48 / 81°   | Metal finials, armor plaques, decorative insignia |

- **Ground palette limits (target supersedes measured legacy range):**
  - **Chroma:** Maximum C\* ≤ 35; median target 22–28; 95th percentile ≤ 38 across all ground tiles.
  - **Lightness:** Valley floor median L\* 58–64; Plateau tops median L\* 46–52 (at least 10–14 L\*
    lower than the valley floor). 90% of ground texels stay between L\* 38 and 76.
  - _Superseded record:_ The legacy measured ground median chroma of C\* 50 (with individual tiles
    reaching C\* 64 and median `#b1832d`) was an oversaturated mustard hue from the initial Orkhon
    import that read as modern video-game turf rather than manuscript parchment. This target
    supersedes those values for all new artwork; the table under `## Palette` remains as the historical
    record of the initial import.
- **How elevation is shown:**
  1. _Tone and hue shift:_ Plateau tops are painted in cooler, darker alpine sage-moss washes
     (median L\* 46–52, hue 101–105°) distinctly separated from the warmer, lighter parchment-gold
     valley floor (median L\* 58–64, hue 80–94°), providing instant top-down elevation readability.
  2. _Ink cliff rims:_ Plateau perimeters carry a defined ink contour along the edge lip.
  3. _Basalt columnar hatching:_ Vertical cliff faces feature downward vertical and diagonal hatched
     pen strokes depicting columnar basalt joints.
  4. _Ramps:_ Walkable corridors cut through the cliffs as worn raw umber earth paths with flanking
     hatched basalt wall edges.
- **What to avoid:**
  - Saturated mustard or electric yellow-green ground (e.g. `#b1832d`, `#d59a31`).
  - Photographic textures, surface scans or 3D CG rendering (specular highlights, normal map bumps,
    plastic sheen).
  - Soft Gaussian blur, airbrush fades or feathered alpha resulting in muddy grey halos.
  - Mixed texel densities (all terrain elements must match the spec's ~1.56 world units per pixel
    density, 128 px covering 200 units).
  - Pasted white rectangular blocks for waterfalls (cascades must feature calligraphic wave strokes
    and soft mineral chalk washes).

## Disagreements found

| Topic                   | Places                                                                                                                                          | Spec adopts                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Rider height            | PR #63 and `orkhonValleyArt.ts` said "about 60 units"; the Khan's frames measure 62.5–64.4                                                      | 63 (measured); the code comment and level guide now say about 63          |
| Rock height             | Level guide: "rocks knee to shoulder high"; large clusters reach 86 units (1.4 riders) at the top of their spread                               | Band 30–90; the guide now separates single stones from clusters           |
| Cliff height            | "240 units, about four mounted riders" is true in world units; on screen the foreshortened wall is about 2.5 riders                             | 240 units; both figures recorded                                          |
| Ground regions          | Level guide: grass regions "about 300 units across"; the shader's region field (`sin(x/290…)`) gives runs of about 400–1,100 units (median 890) | Measured 400–1,100; the guide is corrected                                |
| Camera angle in prompts | Tapestry style and scenery prompts ask for 45°; detail-atlas prompt and the game use 48°                                                        | 48° (the game camera)                                                     |
| Ger scale in one level  | Orkhon outskirts gers are 122–146 units; the live camp's gers are 66–83 units (front pair 83) at `GAME.camp.visualScale` 0.75                   | `structures` 75–150 from the pack; the live camp is listed as a follow-up |
| Texel density           | Orkhon ground 1.56 units per texel, props 0.85–1.7, cliff bands about 2.3 on screen                                                             | Recorded, not unified: each is the pack's painted scale                   |

## Places that deviate (follow-ups)

Only Orkhon Valley follows this spec today. These were measured, not changed:

- **Shared scenery in the seven other places** (`world3d/sceneDressing.ts`): trees 92–182
  units (above `trees`), boulders 18–52 (partly below `rocks`), crags 74–114, small grass,
  flower and pebble accents 9–31 (partly below `shrubs`). Regional palettes tint the paintings,
  which this spec's no-filter rule excludes.
- **Ground density in the other places:** materials repeat every 170–520 units on 1,254-px
  paintings (about 0.14–0.41 units per texel), up to about eleven times finer than Orkhon's
  1.56.
- **Plateau heights in the other places:** shelves rise 155–450 units with peaks up to 300 more,
  and they keep the raised 150-unit camp shelf; Orkhon has one 240-unit level and no camp shelf.
- **The live camp:** gers 66–83 units and migration carts 43–54 units, against 100–146 for the
  matching pack structures in Orkhon's outskirts.
- **Camp life:** walking workers are 25 units, 0.4 of the Khan's height; whether that is the
  intended miniature is for the captain to decide.
- **Skybreaker:** its art is sized 160 units wide (143–158 tall) but no enemy definition uses
  it; if one does, it exceeds the `enemies` band.
