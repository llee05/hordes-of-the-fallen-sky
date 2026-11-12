# Orkhon Valley level

Orkhon Valley (Ulaan Tsutgalan) is the wide hand-authored level.
It follows the approved antique manuscript concept: a river winds from the north-west to the large eastern falls, the clan camp occupies open central steppe, and worn tracks connect basalt shelves, landmarks and the crossing.
Four hand-painted ground quadrants cover the terrain while cliffs, water, trees, landmarks, actors and shadows remain separate objects.
The existing terrain-kit materials remain available as a development fallback.
Run `npm run dev` (or `npm run dev:web`), press **F8**, and choose **Orkhon Valley**.

## Layout

`src/game/data/orkhonValley.ts` holds the whole level as level-centre-relative data (+x east, +y south).
The playable battlefield is 6,400 × 4,000 units, from x = -3,200…3,200 and y = -2,000…2,000.
It occupies the middle of a 6,400-unit terrain square so the shared elevation, chunk and navigation systems remain square while camera and physics bounds use the wide rectangle.

- **Open steppe (level 0):** the main horde arena surrounds the camp at (-550, 420), away from both painting seams.
  Tracks branch toward the sacred ovoo, ancient ruins, the north-west spirit grove, the bridge and every ramp.
- **Basalt (level 1):** six low one-rise masses frame the spirit heights, eastern falls, western ruins, south-west edge, southern outcrops and eastern gorge.
  They all rise 240 units and keep irregular basalt jogs except at ramps and the falls.
- **River and falls:** the river enters at the north-west edge, bends east across the northern half and meets the large waterfall at (2250, -300).
  The bridge crossing is at (520, -1050), keeping a connected route between the north bank and the central camp.
- **Landmarks:** ancient ruins sit west of camp, the sacred ovoo north of camp, the spirit grove in the north-west, and four existing raider-camp landmarks provide ordinary arrival bearings.
  Existing basalt pillars, river islets and camp-outskirts props dress the remaining routes.
- **Ground-only sites:** the paintings mark the north-east creature-lair ground, south-east hot springs, marsh and roaming-threat tracks.
  They are landmarks only; no spawning, spirit, resource or roaming-threat rules were added.

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

| Landmark                                | System                                                    |
| --------------------------------------- | --------------------------------------------------------- |
| Central camp                            | The live camp: gers, fence, standard, defences, migration |
| Ancient ruins, sacred ovoo, spirit fire | Field objectives are placed beside them, in that order    |
| Four raider camps                       | Ordinary arrivals come from a raider camp's direction     |
| Spirit stones and basalt pillars        | Scenery with solid footprints                             |
| Camp outskirts, banners, racks          | Scenery                                                   |

Field objectives fall back to the usual ring around the camp if a site has no reachable
ground nearby. Arrivals keep spawning just outside the wide playable bounds; only the bearing of
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
  paint, and cutouts keep full sheet resolution in `orkhon-terrain-kit.png`, packed with 16
  padding texels and 4 extruded around each frame. Because kit art is often drawn smaller than
  painted, the kit atlas, bank bands and ground tiles are mipmapped and anisotropically
  filtered, so they stay clean, not shimmering. Cliff walls and kit cutouts share one kit
  texture (`orkhonKitTexture`); cutouts use alpha to coverage, with their alpha raised a quarter
  per mip level so thin parts do not erode at distance.

| Sheet cell                         | Used for                                                   |
| ---------------------------------- | ---------------------------------------------------------- |
| (1,1) valley grass, calm           | Valley floor base                                          |
| (1,2) valley grass, sun-cured      | A few broad, rare regions away from the camp clearing      |
| (1,3) valley grass, olive          | Valley regions alternating with the calm grass             |
| (1,4) plateau grass                | Every plateau top                                          |
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
  camera. Walls sample the shared, mipmapped kit texture with gradients taken from the
  continuous distance along the outline, so a band restart does not fall to a blurred mip
  level. Walls are lit like the rest of the terrain.
- **Ramps:** each ramp is graded ground worn bare across its walkable width (trail dirt),
  rising through a trench of steep flanks. Trails end at the ramp feet; the ramp's own wear
  (`rampWear`) ends at the head of the cut, where the ramp meets the plateau top, so no worn
  earth runs onto the plateau, and coarse noise frays its sides and ends. Steep graded ground
  uses the same basalt bands as the walls, so ramp flanks read as cut cliff: the bands run
  along the nearest ramp's own length (`orkhonFlankAlong`), keeping their painted width and
  advancing the same way as plateau walls, so they are never mirrored. On shoulders steeper
  than about 32° the ground paintings add side projections (`orkhonSideProjection`) instead of
  stretching downhill; each advances uphill like the top projection, and they meet by height
  blending.
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
- Where a ramp flank meets the plateau wall, the flank's bands (measured along the ramp)
  and the wall's (measured along the outline) restart at different points.
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

Ground channels: valley grass is the calm painting with regions of the olive variant, roughly
400–1,100 units across. Plateau tops are the darker plateau moss right up to the cliff lip; elevation reads
from that tone and the cliff's inked lip, not from a lighter rim band or tint. A few broad,
rare valley regions away from the camp are sun-cured straw. Trail dirt covers the hearth,
narrow worn trails and ramps; scree a narrow band at cliff feet; the bank bands line the shore. Materials
meet by height blending: each painting's own light and dark strokes decide where it shows
through, so edges follow tufts, stones and ruts rather than cross-fading two paintings into
mush. The river tile spans bank to bank. Scenery uses supplied colours with no tint variation.
Every ground painting is hex-tile sampled (`hexPainting` in `terrainShader.ts`): three copies,
each translated by a random offset per vertex of a triangle grid about 100 units apart, blend
by distance and by their own luminance, so the 200-unit repeat no longer shows as rows of
flowers and tufts. Copies are never rotated, so the painted light stays upper left. Each copy
belongs to one of the grid's three vertex classes, so its offset changes only where its weight
is zero and ordinary anisotropic sampling picks the right mip level. Below 70% render scale
(`samplingDetail`) each painting is sampled once.

Ground masks are evaluated per pixel, not per vertex of the 32-unit terrain mesh, whose cells
are wider than a trail's worn edge (`world3d/orkhonGround.ts`). The masks that depend only on
ground position are baked once, when the level loads (about 0.2 s), into a 1024² world-space
texture (about 5 units per texel, finer than any of their edges): worn earth on trails, ramps
and the hearth, and dry-grass potential from moisture on the visible level's height and slope.
The Orkhon terrain program filters it linearly and adds what depends on the drawn surface:
plateau tops from height, scree from slope and cliff-foot nearness, the only mask mesh vertices
carry. `orkhonGroundWeights` mirrors the shader, and its tests check that it reproduces the
per-vertex rule (`authoredMaterialWeights`) at any point and that the baked fields draw the same
ground as exact ones. Orkhon's terrain code is a separate shader program
(`terrainShaderSource`), so other places draw exactly as before.

The pack's ground and water tiles, cliff and waterfall sprites, `cliff_isolated` and rock
sprites (other than the small boulder and pebbles) are retired: the kit replaces them.

## Painted ground

The level ground is split into four 3,200 × 2,000-world-unit quadrants: north-west, north-east, south-west and south-east.
Each opaque 1,600 × 1,000 painting is sampled in world x/z and blended across an 80-unit band at the internal seams.
The four images share the warm olive Candidate C grass, ochre dry patches and manuscript brushwork approved for the overhaul.

A separate seamless 1,024² grayscale detail texture repeats at 220 world units using the same translated hex sampling as the terrain kit.
It modulates lightness by at most seven percent, restoring fine paper grain and brush variation when the camera is close without changing the quadrant colours.
The painting applies only to ground-facing surfaces.
Cliff walls, steep ramp flanks, water, bridge, trees, landmarks, actors and object shadows keep their separate geometry and art.

Painted ground is the shipped default.
Development captures can append `?orkhonPaintedGround=0` to load the previous tiled ground shader instead; the tiled materials remain the fallback and are not loaded into the painted shader.
Legacy Orkhon saves without a layout marker are translated once from the old 5,200-square coordinate space into the new terrain and then saved with layout marker 2.

## Performance

Navigation cells, collision walls and flow fields are built once when the level loads;
play only reads the resident grid. River shore queries use an exact spatial index (per
128-unit bucket, only segments that can be nearest), and cells clear of the gorge skip the
water probe grid. The authored ground shader fetches only the tiles present at each point
and returns single-channel grass, most of the ground, without blending; cliff walls fetch
one band texel. Height blending still costs more per pixel than a cross-fade: on a
software GPU (SwiftShader) a 350-enemy `profileCrowd` frame is roughly a tenth slower than
before the cliff and ground pass, with CPU simulation and render time unchanged. Per-pixel
masks, hex-tile sampling, ramp flanks and mipmapped cliffs cost about 3–5% of that frame at
pixel ratio 2 on an Intel Iris Xe (ANGLE/Vulkan), and about 1 ms in terrain-only views.

The terrain kit adds one 1024 × 512 atlas and two bank textures; the pack atlas lost the
retired sprites. Full-resolution 256-pixel tiles hold four times the texels of the pack's
128-pixel ones (about 3 MB of GPU memory for all ten with mipmaps); the Orkhon art files total
about 2.2 MB. The overlay draws one mesh per atlas plus one per bank painting, all built once
when the level loads; bank bands discard texels along their edges rather than blending.
