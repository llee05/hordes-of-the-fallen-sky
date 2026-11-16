# Art order: Karakorum city kit

## Purpose

Replace the Phase 1 Orkhon-pack palisade and camp-prop placeholders with a compact painted city
edge for the Karakorum prologue. The city is a readable backdrop and tutorial route, not a fully
explorable reconstruction. One atlas must support arrival at the western gate, the training yard,
the report post, and the return from the western patrol.

This order follows [the Living Steppe Tapestry](../living-steppe-tapestry.md) and the measured
[art specification](../art-spec.md). The game uses a 48° high three-quarter orthographic camera,
warm light from the upper left, soft olive runtime shadows, linear filtering, and fractional sprite
positions.

## Deliverable

- One 1,536 × 1,024 RGBA PNG on genuinely transparent alpha.
- One Phaser hash atlas JSON with the eight stable frame names below.
- Cutouts only: no ground plane, sky, horizon, baked cast shadows, labels, letters, people, animals,
  smoke, glow, or loose props outside the named subjects.
- Every frame retains at least 16 transparent source pixels between painted bounds and the atlas
  edge or another frame. Extrude painted edge colour into transparent padding when assembling so
  mipmaps cannot sample black or white.
- Preserve each object's complete base and use a bottom-centre ground contact. Record trimmed frame
  bounds and the shared source canvas in the atlas metadata.

| Frame             | Subject                                           | Target world-height band | Notes                                                    |
| ----------------- | ------------------------------------------------- | ------------------------ | -------------------------------------------------------- |
| `wall_straight`   | Rammed-earth wall straight run                    | 75–150                   | Broad modular run, timber cap and restrained felt detail |
| `wall_corner`     | Rammed-earth wall corner                          | 75–150                   | Matches both ends of the straight run                    |
| `main_gate`       | Western gate with two low flanking towers         | 170–220                  | Open passage remains obvious at miniature scale          |
| `palace_roofline` | Distant non-enterable palace roofline             | 170–220                  | Compact silhouette; backdrop, not a giant skyline        |
| `market_awnings`  | Cluster of two or three market awnings            | 75–150                   | Ivory felt, lapis and vermilion woven trim               |
| `granary`         | Timber-and-earth granary                          | 75–150                   | Distinct closed storage silhouette                       |
| `stone_turtle`    | Stone turtle marker with plain upright slab       | 55–120                   | No writing or carved readable inscription                |
| `training_post`   | Training post with straw target and hitching rail | 55–120                   | Stable target silhouette with no weapon embedded         |

The wall, corner, and gate must share wall height, earth colour, timber scale, light direction, and
ground registration so code can build a continuous edge without scaling one frame independently.

## Visual brief

Paint an original 13th-century-inspired Mongol imperial city edge in the project's antique
manuscript language: matte gouache and mineral pigment over warm parchment, crisp carbon-umber ink
contours, restrained directional hatching, simplified architectural geometry, and clear miniature
silhouettes. Use warm buff rammed earth, umber timber, ivory felt, deep lapis, muted turquoise,
vermilion, sage olive, and small warm-brass details.

Architecture should read as practical imperial infrastructure assembled from earth, wood, felt,
tile, and textile. Avoid fantasy crenellations, Chinese palace pastiche, modern archaeological
reconstruction diagrams, glossy 3D surfaces, photorealism, cinematic haze, or monumental scale that
would dwarf mounted characters. Decorative geometry may suggest woven and painted Central Asian
materials but must not reproduce sacred symbols, readable calligraphy, seals, or named historical
emblems.

Warm sunlight comes from the upper left. Paint form shadows on the lower-right faces, but do not
bake a shadow onto the transparent ground; the renderer adds the olive contact shadow. Horizontal
planes, roof pitches, wall tops, and target faces must agree with the 48° camera.

## Generation prompt

> Use case: stylized-concept. Asset type: production environmental sprite atlas on genuinely
> transparent background for Hordes of the Fallen Sky, a Mongolian-inspired nomadic fantasy game.
> Create exactly eight isolated architectural cutouts for the Karakorum city edge: a modular
> rammed-earth wall straight run, matching wall corner, open main gate with two low timber towers,
> compact distant palace roofline, market awning cluster, timber-and-earth granary, stone turtle
> marker with a plain unlettered slab, and a training post with straw target and hitching rail.
> Original designs in an antique Central Asian illuminated-manuscript style: matte gouache and
> mineral pigment, warm parchment undertone, crisp variable carbon-umber ink contours, restrained
> hand-drawn hatching, simplified readable silhouettes. High three-quarter view matching a 48-degree
> game camera. Warm upper-left sunlight, cool olive form shade. Palette: warm buff earth, umber
> timber, ivory felt, deep lapis, muted turquoise, vermilion, sage, and restrained brass. Keep each
> complete object separated by generous transparent gutters with the full base visible and a stable
> bottom-centre ground contact. No ground patches, no baked shadows, no people, no horses, no smoke,
> no sky or horizon, no labels, no letters, no calligraphy, no watermark, no glossy 3D, no
> photography, no fantasy castle crenellations, no modern reconstruction diagram.

If generation does not reliably preserve an atlas grid, generate the eight cutouts separately on
transparent canvases and assemble them with `npm run atlas:assemble -- --padding 16 --extrude 4
--trim --bleed`.

## Integration and acceptance

- Place the painted PNG and atlas metadata under `public/art/` and register them through
  `src/game/assets/painterlyArt.ts`; never fetch art at runtime.
- Replace placeholder frames only in `world3d/karakorumDressing.ts`. Do not move named sites,
  collision footprints, roads, or the live camp to fit an image.
- Draw large landmarks at 170–220 world units, structures at 75–150, and the smaller marker/target
  at 55–120. Compare against the mounted Khan at about 63 units tall.
- Validate atlas bounds, padding, mip bleed, transparent colour, cropped edges, and white fringe
  with `npm run atlas:validate -- <png> --frames <json> --padding 16`.
- Inspect the gate, training yard, and west-track views at 1× zoom. Actors, projectiles, tutorial
  markers, and the open gate must remain readable; decoration must not close a movement lane.
- Confirm the wall modules meet without obvious scale or lighting changes and that no frame carries
  a white/black fringe under linear filtering.
