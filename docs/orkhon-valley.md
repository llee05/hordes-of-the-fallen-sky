# Orkhon Valley level

Orkhon Valley (Ulaan Tsutgalan) is the one hand-authored level. It follows the layout
reference supplied with the Orkhon Valley texture pack v2 and uses only that pack's PNGs.
Run `npm run dev` (or `npm run dev:web`), press **F8**, and choose **Orkhon Valley**.

## Layout

`src/game/data/orkhonValley.ts` holds the whole level as camp-relative data (+x east,
+y south; the battlefield spans ±2600):

- **Valley floor (level 0):** the main combat area. The camp sits in open steppe at its
  centre, with worn paths to every ramp and to the bridge. Corridors between plateaus
  reach the north and west edges.
- **Plateaus (level 1):** six basalt shelves around the valley — the shrine heights (NW),
  the falls plateau (N and NE, wrapping the east bank), the western, south-western,
  southern and gorge shelves. All share one rise of 160 units.
- **Ramps:** each plateau has one ramp (the falls plateau has two). North ramps climb
  30° east of north and west ramps climb slightly north of west, so the supplied ramp
  paintings read correctly on screen.
- **River:** the falls drop from the north-east plateau into the head of a gorge river
  that runs south past the east bank. One bridge crosses it at the end of the caravan road.
- **Landmarks:** four raider camps at the edges, stone ruins, the sacred ovoo, two relic
  shrines with standing stones, three basalt pillars, camp outskirts and groves.

## Elevation and traversal

Plateaus are `SceneShelf` entries with an authored `outline` polygon. The shared
`sceneGeometry` clips terrain at the outline and builds vertical walls, so rendering,
height queries and collision all use the same edge. Existing ramp approaches grade a
corridor through the wall; authored ramps climb linearly at a walkable grade, and their
steep flanks stay blocked. There is no raised camp shelf (`campShelf: false`) and the
valley relief is calmed (`relief: 0.35`), leaving exactly two levels.

The river is a **gorge** (`water.gorge` in `data/landscapes.ts`): it keeps its exact
authored course, its bridge decks are authored, the shelves meet it as cliffs, and its
water is impassable — `ComposedTerrain.cell` blocks any navigation cell that is mostly
water outside a bridge deck. Landmark `footprint`s become `obstacles` and are solid too.
Collision walls, the shared enemy flow fields and riders all use these navigation cells,
so enemies route through ramps and over the bridge instead of sticking on cliffs.

## Pack import

`scripts/pack-orkhon-valley.mjs <pack directory>` (development only, ImageMagick) copies
the used `ground/` and `water/` tiles unchanged and packs the used transparent sprites,
unscaled, into `public/art/orkhon-valley/orkhon-valley-sprites.png` with JSON frames. The
only pixel change is alpha-edge cleanup: fully transparent texels take the colour of nearby
painted texels so linear filtering does not darken cutouts. `assets/orkhonValleyArt.ts`
lists the tiles, the sprite sizes and anchors from `manifest.json`, and measured cliff lips.

| Pack folder            | Used for                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| `ground/`              | Untinted terrain channels at one scale (200 units per 128 px tile) |
| `water/` tiles         | River surface: flow, with rapids below the falls                   |
| `props/`               | Groves, cliff-foot rocks, sparse shrubs, flowers and reeds         |
| `landmarks/`, `camps/` | Raider camps, ruins, ovoo, shrines, banners, racks, camp outskirts |

Ground channels: steppe grass alternating with its variant painting in broad soft
regions, dry and patchy grass patches, plateau grass on level 1, trampled earth on the
hearth and paths, and rocky ground on steep flanks, cliff feet, rims and the shore. Wall
geometry under the painted cliffs uses rocky ground. The river tile spans bank to bank so
the tiles' light edge columns fall on the faded shoreline. Scenery uses supplied colours
with no tint variation.

Not used: the rotated `_r90`/`_r180` ground copies (the shader rotates the variant
painting instead), `wildflower_meadow`, `dirt_path`, `dry_dirt`, `river_calm` and
`river_bend` (no channel needs them), `transitions/` decals (material masks already
feather every transition), `player_camp_large` (the live camp system draws the central
camp; the small gers, cart, canopy, fire and banners dress its outskirts), and
`reference/` and `preview.png`, which are never shipped.
