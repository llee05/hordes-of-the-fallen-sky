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

## Landmarks and game systems

Landmarks map onto existing systems where one exists (`systems/authoredSites.ts`):

| Landmark                                 | System                                                    |
| ---------------------------------------- | --------------------------------------------------------- |
| Central camp                             | The live camp: gers, fence, standard, defences, migration |
| Ruins, sacred ovoo, valley relic shrine  | Field objectives are placed beside them, in that order    |
| Four raider camps                        | Ordinary arrivals come from a raider camp's direction     |
| Heights shrine, standing stones, pillars | Scenery with solid footprints                             |
| Camp outskirts, banners, racks           | Scenery                                                   |

Field objectives fall back to the usual ring around the camp if a site has no reachable
ground nearby. Arrivals keep spawning just outside the camera; only the bearing of
ordinary (non-warning, non-assault) spawns changes, by up to ±26° around a randomly chosen
raider camp. Warning and assault waves keep their river-bank pattern. There is no boon,
loot or shrine system to attach the ovoo, ruins or shrines to, so they add no new rules.
Every other location keeps the uniform arrival bearing and the field objective ring.

## Painted cliffs, ramps, falls and bridge

`world3d/orkhonOverlay.ts` builds one unlit, depth-tested mesh from the sprite atlas:

- **Cliffs:** every plateau wall facing the fixed camera gets a run of overlapping cliff
  sprites (`cliff_face_tall`, `cliff_straight`, `cliff_end_cap`, `cliff_cave_nook`). Each
  sprite is folded at its measured lip: the face stands on the real wall, scaled so its
  painted face spans the 160-unit rise, and the rim lies flat on the plateau top. At the
  default camera this looks like the flat painting, while units below the cliff draw in
  front of it and units on the plateau draw over its rim. Pieces are sized by their
  on-screen width, so oblique walls shear rather than squash. Convex corners facing the
  camera get `cliff_corner_outer`. Walls facing away are hidden behind their plateau.
- **Ramps:** `ramp_wide` (north ramps) and `ramp_descending` (west ramps) are draped over
  the graded ground with screen-projected coordinates, fitted so the painted foot and
  crest meet the ramp's foot and top.
- **Falls:** three `waterfall_top` drops on the plateau edge, with `waterfall_base` foam
  laid on the river head.
- **Bridge:** `bridge_horizontal` is draped over the deck; the deck runs 30° north of east
  so the painting stays level on screen and its plank rows match the walkable width.

Some sprites were cropped from the source sheet with paint up to their frame. Texels in
a narrow, irregular band at each frame edge are discarded so those crops do not show
straight lines; colours are never changed. `cliff_isolated` stands as basalt pillars.

### Known joins and rough edges

The pack is not an autotile set, and its pieces do not join seamlessly:

- Neighbouring cliff pieces overlap; their columns and grass rims visibly restart at
  each piece, and the rocky wall geometry shows through gaps in their silhouettes.
- Oblique walls (the gorge flanks, the gorge shelf's west side) shear the painted
  columns and rims into long thin runs that read as stockade-like stripes.
- Concave corners and corners with one hidden wall have no corner painting; the two runs
  simply meet.
- Ramp paintings are about twice the scale of the cliff paintings, because the painted
  ramps are steeper than a walkable ramp; they are softer than the cliffs beside them.
- The falls and foam are opaque rectangles in the pack; their edges are broken up but
  still visible against the river and the plateau rim.
- Painted perspective only matches the default camera. Other F6 camera angles show the
  folded sprites at a different slant.

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
| `elevation/`           | Folded cliff runs, outer corners, basalt pillars, draped ramps     |
| `water/` sprites       | The falls and their foam                                           |
| `structures/`          | The bridge deck                                                    |
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
`reference/` and `preview.png`, which are never shipped. Unused sprites:
`cliff_face_medium`, `cliff_face_short` and `cliff_edge_detail` (their painted faces are
far shorter than the single plateau rise), `cliff_corner_inner` (concave corners here
meet hidden walls), `ramp_ascending` and `ramp_corner` (`ramp_wide` and
`ramp_descending` cover both ramp directions), `riverbank_grass` and `riverbank_rock`
(their painted water does not register with the river tile), and `bridge_vertical` and
`bridge_end_ramp` (one level bridge).

## Performance

Navigation cells, collision walls and flow fields are built once when the level loads;
play only reads the resident grid. River shore queries use an exact spatial index (per
128-unit bucket, only segments that can be nearest), and cells clear of the gorge skip the
water probe grid. The authored ground shader fetches only the tiles present at each point.
