# Location scenery atlas prompt

The built-in `image_gen` tool generated `public/art/steppe-scenery.png` with
transparent output enabled. The PNG is bundled unchanged; explicit frame rectangles
in `public/art/steppe-scenery.json` accommodate the generated spacing and register
each cutout to a 448 × 420 logical canvas, with ground contact at (224, 378).

The atlas supplies reusable scenery for the twelve location compositions described
in [location landscapes](location-landscapes.md). It depicts stylized surrounding
landforms, not geographical reconstructions or religious ceremonies.

## Generation prompt

> Use case: stylized-concept.
> Asset type: ONE production environment sprite atlas for Hordes of the Fallen Sky, The Living Steppe Tapestry.
> Primary request: paint twelve isolated landscape scenery cutouts on genuinely transparent alpha, exactly FOUR equal columns and THREE equal rows on a 1536x1024 canvas. This is one game atlas, not a scene or mood board. Uniform cells 384x341; generous transparent gutters, each object entirely within central 80% of its cell. Bottom ground anchor at 86% of each cell. No labels or grid.
> Row 1 left to right: (1) one graceful golden-green larch tree with umber trunk, (2) one dark sage alpine conifer tree with broad layered branches, (3) one small river willow with pale trunk and soft sage canopy, (4) one low rounded green foothill rock outcrop with ochre grasses.
> Row 2 left to right: (1) one broad rounded slate mountain miniature with ivory snow cap, (2) one tall sharp pyramidal grey-lapis mountain miniature with angular ivory snow faces, (3) one wide low jagged glacial ridge miniature with pale turquoise ice, (4) one twin white summit miniature with muted blue-grey stone base.
> Row 3 left to right: (1) one low flat-topped extinct volcanic cone miniature in warm umber and olive, no lava or smoke, (2) one sculpted rounded desert granite tor cluster in warm peach sandstone and rust, (3) one sparse clump of ochre river reeds with sage blades, (4) one angular layered slate crag in desaturated indigo and umber, no snow.
> Style: original miniature painterly 2.5D environmental sprites, matte gouache, restrained visible brush grain, clear silhouettes and broad sculpted planes. High three-quarter camera looking down about 45 degrees, consistent upper-left warm light, muted olive shadows within objects. Supporting palette ochre, sage, warm ivory, lapis, umber, rust. Readable at small gameplay scale; soft painted details, not photorealistic, no glossy 3D.
> Constraints: absolutely transparent empty space between every object. NO background, sky, horizon, floor, rectangular ground patches, baked ground shadows, vignette, glow, text, symbols, religious monuments, people, animals, buildings, checkerboard pixels, watermark. All foliage and mountain tips completely inside their cells. Mountain miniatures sit on transparent cutout bases; no landscape panels.
