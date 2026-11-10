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
  southern and gorge shelves. All share one rise of 240 units, about four mounted riders.
  Their authored outlines are broken into irregular basalt jogs (`plateau()` steps a point
  up to 48 units in or out every ~210 units), except within 330 units of a ramp crossing
  or the falls, which keep their authored edge.
- **Ramps:** each plateau has one ramp (the falls plateau has two). North ramps climb
  30° east of north and west ramps climb slightly north of west. A ramp's length follows
  the rise so its grade stays walkable; its 112-unit walkable half width is flanked by
  100 units of steep, blocked basalt.
- **River:** the falls drop from the north-east plateau into the head of a gorge river
  that runs south past the east bank. One bridge crosses it at the end of the caravan road.
- **Landmarks:** four raider camps at the edges, stone ruins, the sacred ovoo, two relic
  shrines with standing stones, three basalt pillars, camp outskirts and groves.

## Elevation and traversal

Plateaus are `SceneShelf` entries with an authored `outline` polygon. The shared
`sceneGeometry` clips terrain at the outline and builds vertical walls, so rendering,
height queries and collision all use the same edge. Existing ramp approaches grade a
corridor through the wall; authored ramps climb linearly at a walkable grade, and their
steep flanks stay blocked. The flanks span several 32-unit terrain mesh cells so the cliff
tapers into the ramp without saw-toothed walls. Authored plateau tops weather by at most
±11 units, so each stays one level. There is no raised camp shelf (`campShelf: false`) and the
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

## Scenery scale and dressing

The pack's sprites were painted at unrelated sizes, so `assets/orkhonValleyArt.ts` sets
one miniature scale against a mounted rider (about 60 units tall) and the 240-unit cliffs:
`ORKHON_PROP_SCALE` draws trees about twice a rider, shrubs and flowers below a horse's
back and rocks knee to shoulder high; `ORKHON_LANDMARK_SCALE` shrinks banners, racks,
standing stones, relic fires and the ovoo. Raider camps, ruins and gers keep their
painted scale, which already matches their solid footprints.

`world3d/orkhonDressing.ts` places, deterministically and once per terrain: landmarks,
authored groves, rubble and the odd shrub along the foot of every camera-facing cliff,
a few trees and shrubs set back from every plateau rim (framing the edges, as in the
reference), and sparse scatter in the open. Nothing is placed on paths, ramps or the
camp's worn ground, so combat space stays clear. Dressing is visual only.

## Cliffs, ramps, falls and bridge

- **Cliffs:** plateau walls are real terrain geometry, so faces and corners stay
  continuous and follow the outline exactly. The terrain shader paints them with opaque
  basalt bands cropped from four supplied cliff sprites (`ORKHON_CLIFF_FACES`:
  `cliff_face_tall`, `cliff_face_medium`, `cliff_end_cap`, `cliff_face_short`), each with
  its painted grass lip on top. `sceneGeometry` gives every wall vertex its distance along
  the plateau outline and its depth below the cliff top (`world3d/orkhonCliffs.ts` holds
  the shader inputs). Each 66-pixel repeat along a cliff picks one band and may mirror it;
  a band's rows span the full 240-unit rise, and its columns keep that pixel size on
  screen for walls facing the camera. Walls are lit like the rest of the terrain.
- **Ramps:** each ramp is graded ground worn bare across its walkable width (dry dirt),
  rising through a trench of steep flanks. Steep graded ground uses the same basalt bands
  as the walls, so ramp flanks read as cut cliff.
- **Falls:** three `waterfall_top` drops across the plateau edge, cropped to their water
  columns so the basalt walls either side frame them. Each overlaps the next and stands
  slightly nearer the camera, so the curtain reads as one. Overlapping `waterfall_base`
  foam lies on the river head (`world3d/orkhonOverlay.ts`, one unlit, depth-tested mesh).
- **Bridge:** `bridge_horizontal` is draped over the deck; the deck runs 30° north of east
  so the painting stays level on screen and its plank rows match the walkable width.

Some overlay sprites were cropped from the source sheet with paint up to their frame.
Texels in a narrow, irregular band at each frame edge are discarded so those crops do not
show straight lines; colours are never changed. `cliff_isolated` stands as basalt pillars.

### Known joins and rough edges

The pack is not an autotile set, and its pieces do not join seamlessly:

- Cliff bands restart every 66 source pixels (about 150 units). Basalt column cracks hide
  most restarts, but the painted grass lip visibly steps where neighbouring bands' drips
  differ, and mirrored repeats are noticeable on long straight walls.
- Where two band projections meet on a ramp flank (the flank turns between facing east
  and facing south), the columns change direction.
- Walls facing away from the camera are hidden behind their plateau and not painted.
- The falls show a straight foam line where the drops meet the foam pools, and the pools'
  far corners are visible against the river banks. Faint vertical joins remain where the
  cropped drops overlap.
- Painted perspective only matches the default camera. Other F6 camera angles show the
  bands at a different slant.

`scripts/pack-orkhon-valley.mjs <pack directory>` (development only, ImageMagick) copies
the used `ground/` and `water/` tiles unchanged and packs the used transparent sprites,
unscaled, into `public/art/orkhon-valley/orkhon-valley-sprites.png` with JSON frames. The
only pixel change is alpha-edge cleanup: fully transparent texels take the colour of nearby
painted texels so linear filtering does not darken cutouts. `assets/orkhonValleyArt.ts`
lists the tiles, the sprite sizes and anchors from `manifest.json`, and the cliff bands.

| Pack folder            | Used for                                                            |
| ---------------------- | ------------------------------------------------------------------- |
| `ground/`              | Untinted terrain channels at one scale (200 units per 128 px tile)  |
| `water/` tiles         | River surface: flow, with rapids below the falls                    |
| `props/`               | Groves, rim trees, cliff-foot rubble, sparse shrubs, flowers, reeds |
| `elevation/`           | Basalt bands for cliff walls and ramp flanks; basalt pillars        |
| `water/` sprites       | The falls and their foam                                            |
| `structures/`          | The bridge deck                                                     |
| `landmarks/`, `camps/` | Raider camps, ruins, ovoo, shrines, banners, racks, camp outskirts  |

Ground channels: the calm `plateau_grass` painting is the base everywhere, in regions
about 300 units across sampled at two orientations, so its painted stripes change
direction and the tile grid never lines up. Plateau tops add
regions of the tufted `steppe_grass_var`. A few broad, rare regions are `dry_grass` or
`patchy_grass` flowers. `dry_dirt` covers the hearth, narrow worn trails and ramps; `rocky_ground` a
narrow scree band at cliff feet and the shore. Plateau rims catch the light as a band of
`dry_grass` behind the painted cliff lip, so plateau edges read from a distance. Materials meet by height blending: each
painting's own light and dark strokes decide where it shows through, so edges follow
tufts, stones and ruts rather than cross-fading two paintings into mush. The river tile spans bank to bank so
the tiles' light edge columns fall on the faded shoreline. Scenery uses supplied colours
with no tint variation.

Not used: the rotated `_r90`/`_r180` ground copies (the shader rotates paintings
instead), `steppe_grass` and `trampled_earth` (their dense tufts and ruts made the
ground noisy), `wildflower_meadow`, `dirt_path`, `river_calm` and `river_bend` (no
channel needs them), `transitions/` decals (height blending already breaks every
transition along painted strokes), `player_camp_large` (the live camp system draws the central
camp; the small gers, cart, canopy, fire and banners dress its outskirts), and
`reference/` and `preview.png`, which are never shipped. Unused sprites:
`cliff_straight`, `cliff_cave_nook`, `cliff_edge_detail`, `cliff_corner_outer` and
`cliff_corner_inner` (continuous wall geometry already joins faces and corners; their
faces are non-opaque or show perspective tops), all four ramp paintings (painted ramps
are far steeper than a walkable ramp, so fitting them doubled their scale), `riverbank_grass` and `riverbank_rock`
(their painted water does not register with the river tile), and `bridge_vertical` and
`bridge_end_ramp` (one level bridge).

## Performance

Navigation cells, collision walls and flow fields are built once when the level loads;
play only reads the resident grid. River shore queries use an exact spatial index (per
128-unit bucket, only segments that can be nearest), and cells clear of the gorge skip the
water probe grid. The authored ground shader fetches only the tiles present at each point.
