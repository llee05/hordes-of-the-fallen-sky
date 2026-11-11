# Orkhon Valley level

Orkhon Valley (Ulaan Tsutgalan) is the one hand-authored level. It follows the layout
reference supplied with the Orkhon Valley texture pack v2. Its terrain (ground, cliffs, river,
banks, falls, cliff-foot scree, basalt pillars and river islets) comes from the manuscript-style
terrain kit sheet ordered in [the art order](art-orders/orkhon-terrain-kit.md); trees, shrubs,
landmarks, camps and the bridge deck still come from the texture pack.
Run `npm run dev` (or `npm run dev:web`), press **F8**, and choose **Orkhon Valley**.

## Layout

`src/game/data/orkhonValley.ts` holds the whole level as camp-relative data (+x east,
+y south; the battlefield spans ±2600):

- **Valley floor (level 0):** the main combat area. The camp sits in open steppe at its
  centre, with worn paths to every ramp and to the bridge. Corridors between plateaus
  reach the north and west edges.
- **Plateaus (level 1):** six basalt shelves around the valley — the shrine heights (NW),
  the falls plateau (N and NE, wrapping the east bank), the western, south-western,
  southern and gorge shelves. All share one rise of 240 units: about four mounted riders in
  world units, and about two and a half on screen, where the camera foreshortens the walls.
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
one miniature scale against the Khan's mounted billboard (about 63 units tall) and the
240-unit cliffs: `ORKHON_PROP_SCALE` draws trees about twice a rider, shrubs and flowers
below a horse's back, and the kit's cliff-foot scree about a rider tall and two and a half
long; `ORKHON_LANDMARK_SCALE` shrinks banners, racks, standing stones, relic fires, the ovoo,
the kit's basalt pillars (about three riders tall) and its river islets. Raider camps, ruins
and gers keep their painted scale, which already matches their solid footprints. The factors
live in [the art specification](art-spec.md) (`data/artSpec.ts`), which lists the size band
every prop and landmark falls in.

`world3d/orkhonDressing.ts` places, deterministically and once per terrain: landmarks,
authored groves, scree and the odd shrub along the foot of every camera-facing cliff, a few
trees and shrubs set back from every plateau rim (framing the edges, as in the reference),
and sparse scatter in the open. Two sacred river islets stand in the river on its course.
Nothing is placed on paths, ramps or the camp's worn ground, so combat space stays clear.
Dressing is visual only.

## Terrain kit

`art-source/orkhon-terrain-kit.png` is the captain's 1536 × 1024 GPT Image sheet: a 6 × 4 grid
of 256-pixel cells. `scripts/cut-orkhon-terrain-kit.mjs [sheet]` (development only, `sharp`)
cuts it into `public/art/orkhon-valley/`. It makes only small corrective adjustments, never
repainting, recolouring or tinting:

- **Seamless tiles:** each ground and water cell is healed on both axes by offset-and-heal:
  near the wrap edges a copy rolled by half a tile shows instead, meeting the original along
  its own light and dark strokes. Tiles keep the sheet's full 256 pixels, 200 world units per
  repeat (see [the art specification](art-spec.md#texture-tiles-and-repetition) for why).
- **Trail dirt:** the trail painting runs through grass, so the plain dirt tile is quilted
  from dirt-only 56-pixel windows of it on a 5 × 5 wrapping grid, joined the same way.
- **River:** the channel and rapids cells are turned a quarter so the current runs along the
  river shader's along-channel axis. The two bank cells keep only their bank band.
- **Cutouts:** the white backing is keyed out where it connects to the cell border; partly
  white edge texels get partial alpha and are un-mixed from white, so no white fringe remains
  around the ink. Specks of grid antialiasing are dropped, transparent texels take nearby
  paint, and cutouts keep full sheet resolution in `orkhon-terrain-kit.png`. Because kit art
  is often drawn smaller than painted, the kit atlas, bank bands and ground tiles are
  mipmapped (ground and banks also anisotropically filtered), so they stay clean, not shimmering.

| Sheet cell                         | Used for                                                   |
| ---------------------------------- | ---------------------------------------------------------- |
| (1,1) valley grass, calm           | Valley floor base                                          |
| (1,2) valley grass, sun-cured      | A few broad, rare regions away from the camp clearing      |
| (1,3) valley grass, olive          | Valley regions alternating with the calm grass             |
| (1,4) plateau grass                | Every plateau top, in regions of two orientations          |
| (1,5) dirt trail                   | Quilted plain dirt: hearth, worn paths and ramps           |
| (1,6) scree and gravel             | Cliff-foot scree band, steep ground and the riverbed       |
| (2,1) cliff straight run           | Four opaque bands painting every cliff wall and ramp flank |
| (3,1) river channel                | River surface                                              |
| (3,2) south bank, (3,3) north bank | Bank bands along both shores                               |
| (3,6) rapids                       | River surface below the falls                              |
| (4,2) waterfall curtain            | The falls: three overlapping curtains                      |
| (4,3) plunge pool                  | One upright pool in front of the curtains' foot            |
| (4,4) basalt pillar                | Three pillar landmarks                                     |
| (4,5) cliff-foot scree             | Rubble below camera-facing cliffs                          |
| (4,6) sacred river islet           | Two islets in the river                                    |

Not used: the outer and inner cliff corners and the two ramp flanks (continuous wall geometry
already joins faces and corners and follows each ramp; these paintings show slanted iso tops
that do not repeat as level bands), the ramp surface (its painted diagonal only matches ramps
heading one way on screen), the 90° river bend (the river is continuous geometry), the bridge
abutments (painted as tall piers for a raised deck, while the deck lies at bank height) and the
waterfall top lip (a self-contained miniature fall about half the plateau rise).

## Cliffs, ramps, falls and bridge

- **Cliffs:** plateau walls are real terrain geometry, so faces and corners stay
  continuous and follow the outline exactly. The terrain shader paints them with four opaque
  100-pixel windows of the kit's straight cliff run (`ORKHON_CLIFF_FACES`), each running from
  the grass lip and inked column tops down to the scree at the foot. `sceneGeometry` gives
  every wall vertex its distance along the plateau outline and its depth below the cliff top
  (`world3d/orkhonCliffs.ts` holds the shader inputs). Each 100-pixel repeat along a cliff
  picks one band, never mirrored, so painted light stays from the upper left. A band's rows
  span the full 240-unit rise, which also fits the painting's near-isometric wall to the 48°
  camera; its columns keep that pixel size (about 1.4 units) on screen for walls facing the
  camera. Walls are lit like the rest of the terrain.
- **Ramps:** each ramp is graded ground worn bare across its walkable width (trail dirt),
  rising through a trench of steep flanks. Steep graded ground uses the same basalt bands
  as the walls, so ramp flanks read as cut cliff.
- **Banks:** `orkhonBanks` lays a 72-unit band along each shore with the painted water edge on
  the shoreline: shores whose land lies away from the camera use the south-bank painting (its
  clay lip seen from the front), the others the north-bank painting (seen from above). The
  band is left out where a plateau meets the river as a cliff, under the bridge deck and at
  the falls. Its long edges meet the ground and the water along the painting's own strokes; it
  is lit like the ground.
- **Falls:** three `waterfall_curtain` paintings span the plateau edge from its top to the
  river; each overlaps the next and stands slightly nearer the camera, so they read as one
  fall. One `waterfall_foam_pool` stands upright, like a scenery billboard, in front of their
  foot so its spray covers where they meet the river (`world3d/orkhonOverlay.ts`, one unlit,
  depth-tested mesh per atlas).
- **Bridge:** the pack's `bridge_horizontal` is draped over the deck; the deck runs 30° north
  of east so the painting stays level on screen and its plank rows match the walkable width.
  Pack crops painted up to their frame discard a narrow, irregular band at each frame edge;
  kit cutouts keep their keyed edges.

### Known joins and rough edges

The kit is not an autotile set and its pieces were never tested together in the game:

- Cliff bands restart every 100 source pixels (about 140 units). Basalt column joints hide
  most restarts, but the grass lip and column tops can step where neighbouring bands differ.
- Where two band projections meet on a ramp flank (the flank turns between facing east
  and facing south), the columns change direction.
- Walls facing away from the camera are hidden behind their plateau and not painted, so
  far plateau edges show only the change from valley grass to the darker moss.
- The valley tiles are warmer and more saturated than the art spec's manuscript target
  (median C\* about 44 against 22–28); they are used as painted, not recoloured.
- Where a shore turns between facing toward and away from the camera, the bank switches
  painting at a section boundary. The bank's water edge and the river tile are two paintings
  of the same water and meet along the band's strokes.
- The plunge pool is about as wide as the river head; its ellipse may still show water over
  the bank beside the falls. Faint vertical joins can remain where the curtains overlap.
- Painted perspective only matches the default camera. Other F6 camera angles show the
  bands and the upright pool at a different slant.

`scripts/pack-orkhon-valley.mjs <pack directory>` (development only, ImageMagick) packs the
used texture pack sprites, unscaled, into `public/art/orkhon-valley/orkhon-valley-sprites.png`
with JSON frames. The only pixel change is alpha-edge cleanup: fully transparent texels take
the colour of nearby painted texels so linear filtering does not darken cutouts.
`assets/orkhonValleyArt.ts` lists the kit tiles and bank bands, both atlases' sprite sizes
and anchors, and the cliff bands.

| Pack folder            | Used for                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| `props/`               | Groves, rim trees, sparse shrubs, flowers, pebbles and reeds       |
| `structures/`          | The bridge deck                                                    |
| `landmarks/`, `camps/` | Raider camps, ruins, ovoo, shrines, banners, racks, camp outskirts |

Ground channels: valley grass is the calm painting with regions of the olive variant turned a
quarter, roughly 400–1,100 units across, so the tile grids never line up. Plateau tops are the
darker plateau moss right up to the cliff lip, in regions of two orientations; elevation reads
from that tone and the cliff's inked lip, not from a lighter rim band or tint. A few broad,
rare valley regions away from the camp are sun-cured straw. Trail dirt covers the hearth,
narrow worn trails and ramps; scree a narrow band at cliff feet; the bank bands line the shore. Materials
meet by height blending: each painting's own light and dark strokes decide where it shows
through, so edges follow tufts, stones and ruts rather than cross-fading two paintings into
mush. The river tile spans bank to bank. Scenery uses supplied colours with no tint variation.

The pack's ground and water tiles, cliff and waterfall sprites, `cliff_isolated` and rock
sprites (other than the small boulder and pebbles) are retired: the kit replaces them.

## Performance

Navigation cells, collision walls and flow fields are built once when the level loads;
play only reads the resident grid. River shore queries use an exact spatial index (per
128-unit bucket, only segments that can be nearest), and cells clear of the gorge skip the
water probe grid. The authored ground shader fetches only the tiles present at each point
and returns single-channel grass, most of the ground, without blending; cliff walls fetch
one band texel. Height blending still costs more per pixel than a cross-fade: on a
software GPU (SwiftShader) a 350-enemy `profileCrowd` frame is roughly a tenth slower than
before the cliff and ground pass, with CPU simulation and render time unchanged.

The terrain kit adds one 1024 × 512 atlas and two bank textures; the pack atlas lost the
retired sprites. Full-resolution 256-pixel tiles hold four times the texels of the pack's
128-pixel ones (about 3 MB of GPU memory for all ten with mipmaps); the Orkhon art files total
about 2.2 MB. The overlay draws one mesh per atlas plus one per bank painting, all built once
when the level loads; bank bands discard texels along their edges rather than blending.
