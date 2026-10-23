# Location scenery atlas prompts

The built-in `image_gen` tool generated `public/art/steppe-scenery-v2.png` with
transparent output enabled. The PNG is bundled unchanged; explicit frame rectangles
in `public/art/steppe-scenery.json` accommodate the generated spacing and register
each cutout to a 448 × 420 logical canvas, with ground contact at (224, 378).

The final atlas uses a three-column, four-row layout, generated from the first
prototype as a design reference. The selected PNG is 1254 × 1254; its exact trim
rectangles keep every silhouette separate without editing the generated pixels.
The initial prototype was discarded from the runtime assets.

## Final atlas generation prompt

> Use case: stylized-concept.
> Asset type: a NEW production scenery sprite atlas, square canvas 1536x1536, transparent alpha.
> Input image role: design and painting STYLE REFERENCE ONLY, not an edit target. Retain the twelve distinct environmental designs but create a completely NEW layout.
> CRITICAL LAYOUT: exactly THREE columns and FOUR rows. Twelve cells each 512x384. Each painted object maximum 340 pixels wide and 260 pixels high, centered at x=50% y=50% of its cell, with at least 64 pixels of genuine empty transparent gutter to every cell boundary. The objects MUST BE SMALLER than those in the reference. Individual cutouts must be visibly separated by wide empty transparent lanes both horizontally and vertically. No background, no contact sheet boxes or grid lines.
> Row 1: golden-green larch tree; deep sage alpine pine tree; soft sage river willow.
> Row 2: low grassy foothill rock outcrop; broad round mountain with ivory snow crown; tall sharp snowy pyramid mountain.
> Row 3: low turquoise glacial ridge; paired white mountain summits; flat-topped extinct volcanic cone (no lava, no smoke).
> Row 4: rounded warm peach desert granite tor; ochre river reed clump; angular blue-grey layered slate crag.
> Style: Living Steppe Tapestry. Original miniature painterly 2.5D props, matte gouache, restrained brush grain, sculpted simplified planes, upper-left warm light. Ochre, sage, warm ivory, umber, slate and muted lapis. Match reference designs, no photorealism, glossy 3D, or pixel art.
> Constraints: each full silhouette entirely contained in its own cell, no overlapping objects, stray fragments, or shadows outside the subject. No floor, horizon, rectangular ground patches, vignette, labels, text, watermark, people, animals, or monuments. Genuinely transparent empty space. Strict 3x4 grid is more important than maximizing object size.

The atlas supplies reusable scenery for the twelve location compositions described
in [location landscapes](location-landscapes.md). It depicts stylized surrounding
landforms, not geographical reconstructions or religious ceremonies.

## Prototype generation prompt

> Use case: stylized-concept.
> Asset type: ONE production environment sprite atlas for Hordes of the Fallen Sky, The Living Steppe Tapestry.
> Primary request: paint twelve isolated landscape scenery cutouts on genuinely transparent alpha, exactly FOUR equal columns and THREE equal rows on a 1536x1024 canvas. This is one game atlas, not a scene or mood board. Uniform cells 384x341; generous transparent gutters, each object entirely within central 80% of its cell. Bottom ground anchor at 86% of each cell. No labels or grid.
> Row 1 left to right: (1) one graceful golden-green larch tree with umber trunk, (2) one dark sage alpine conifer tree with broad layered branches, (3) one small river willow with pale trunk and soft sage canopy, (4) one low rounded green foothill rock outcrop with ochre grasses.
> Row 2 left to right: (1) one broad rounded slate mountain miniature with ivory snow cap, (2) one tall sharp pyramidal grey-lapis mountain miniature with angular ivory snow faces, (3) one wide low jagged glacial ridge miniature with pale turquoise ice, (4) one twin white summit miniature with muted blue-grey stone base.
> Row 3 left to right: (1) one low flat-topped extinct volcanic cone miniature in warm umber and olive, no lava or smoke, (2) one sculpted rounded desert granite tor cluster in warm peach sandstone and rust, (3) one sparse clump of ochre river reeds with sage blades, (4) one angular layered slate crag in desaturated indigo and umber, no snow.
> Style: original miniature painterly 2.5D environmental sprites, matte gouache, restrained visible brush grain, clear silhouettes and broad sculpted planes. High three-quarter camera looking down about 45 degrees, consistent upper-left warm light, muted olive shadows within objects. Supporting palette ochre, sage, warm ivory, lapis, umber, rust. Readable at small gameplay scale; soft painted details, not photorealistic, no glossy 3D.
> Constraints: absolutely transparent empty space between every object. NO background, sky, horizon, floor, rectangular ground patches, baked ground shadows, vignette, glow, text, symbols, religious monuments, people, animals, buildings, checkerboard pixels, watermark. All foliage and mountain tips completely inside their cells. Mountain miniatures sit on transparent cutout bases; no landscape panels.
