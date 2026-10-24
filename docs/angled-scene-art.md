# Angled scene paintings

Generated with the built-in image generation tool using the imagegen skill. These
are original material swatches and isolated environment subjects, not screenshots
or copies of the supplied composition references. Characters, enemies, camps, and
interface paintings retain their existing artwork. No artwork is synthesized by
the game at runtime.

The selected PNGs are copied unchanged from Codex's generated image library into
`public/art/`. The atlas JSON registers the existing alpha pixels without slicing,
resizing, or painting them. Top-row ground contact is at source Y≈534 and bottom-row
contact at Y≈980; metadata aligns both to Y540 of a shared 512×600 logical canvas.
All sprites use origin (0.5, 0.9), linear filtering, and fractional world positions.

| Saved asset                           | Usage                                                  |
| ------------------------------------- | ------------------------------------------------------ |
| `public/art/tapestry-meadow-v3.png`   | Quiet meadow diffuse texture, 1254×1254                |
| `public/art/tapestry-stone-v3.png`    | Granite cliff diffuse texture, 1254×1254               |
| `public/art/tapestry-scenery-v3.png`  | Transparent six-subject atlas, 1536×1024               |
| `public/art/tapestry-scenery-v3.json` | Pine, larch, willow, boulder, scrub, crag registration |

## Final meadow prompt

Use case: stylized-concept. Asset type: seamless square diffuse material texture for a painted 2.5D Mongolian fantasy game, The Living Steppe Tapestry. Create a production material swatch of sparse sage and golden-ochre alpine meadow turf. Orthographic straight-down surface scan, absolutely flat and evenly illuminated, no scene or perspective. Matte hand-painted gouache, broad quiet sage-olive patches mixed with warm straw, understated brush grain, tiny sparse grass blades mostly grouped near soft patch edges, very few tiny warm grey pebbles. Calm restrained contrast so small characters and projectiles stay readable. This will be mapped over actual 3D sloping ground; no baked shadows, no painted relief, no boulders, no foliage tufts protruding, no flowers, no objects, no labels, no borders. Edge-to-edge tileable texture with matching opposite edges, approximately 1024 square. The art should feel elegant and painterly like a miniature illustrated landscape, with subtle natural variation rather than photographic noise. No horizon, vignette, text, grid, watermark. Save as a usable local game asset.

## Final stone prompt

Use case: stylized-concept. Asset type: seamless diffuse rock-face material texture for actual 3D cliff geometry in a hand-painted 2.5D Mongolian fantasy game. Full square edge-to-edge close view of weathered granite/slate rock, matte gouache with elegant broad angular stone planes and sparse irregular geological cracks. Cool warm-grey, muted umber, slate and sage, soft ochre mineral seams. Favor large coherent rock slabs, a few broken diagonal joints, quiet surface grain, restrained variation; not a mosaic of small stones and not brickwork. Uniform flat illumination: NO cast shadows, directional light, fake relief highlights, vignettes, vegetation, moss patches, landscape, sky, objects, perspective or horizon. The material must take directional lighting when wrapped over tall 3D cliffs and boulders. Opposite edges tile seamlessly. Original illustrated fantasy material in the Living Steppe Tapestry visual style, harmonizing with painted sage-gold grass and ivory felt camps. Approximately 1024 square. Absolutely no text, labels, grids, borders, watermark.

## Final scenery prompt

Use case: stylized-concept. Asset type: production transparent environment sprite atlas for The Living Steppe Tapestry, a painterly Mongolian fantasy game with an angled orthographic 2.5D camera. Create EXACTLY SIX isolated environment subjects in THREE equal columns by TWO equal rows, on genuinely transparent alpha. Wide canvas approximately 1536x1024; every cell has a generous transparent gutter, with its subject centered horizontally, ground contact consistently at 88% cell height. Camera 45 degrees above the horizontal plane, three-quarter miniature view, all subjects at the same camera, warm light from upper left and restrained cool olive form shadows, no ground patches or baked cast shadows. Matte gouache, broad painted facets, clear illustrated silhouettes, subtle brush texture. Sage, olive, gold, grey slate and warm umber, no glossy realism or pixel art. Row 1 left to right: (1) dense dark-sage mountain pine with irregular layered branches and a warm brown trunk, a substantial rounded conical silhouette; (2) golden-ochre larch with grouped angular needle canopies and an exposed slender trunk; (3) broad sage-green willow tree with a generous clustered canopy and a readable branching trunk. Row 2 left to right: (4) a compact cluster of three substantial weathered slate-grey granite boulders with angular fractured planes, no ground; (5) a low rounded cluster of sage alpine shrubs, restrained small ochre accents; (6) a tall irregular upright granite outcrop with a few broad rocky planes and broken top, entirely rock, no plants. Each item must be complete and fully separated within its own equal cell; no overlap between cells, no connected scenery, no letters, labels, grid lines, border, watermark, floor, vignette or background. This is an original game asset atlas, not a scene or a mockup.
