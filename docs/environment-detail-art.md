# Small painted landscape details

The environmental quality pass reuses the existing tree, boulder, grassland,
granite, gravel, and snow paintings. Its one new bitmap is a six-subject transparent
detail atlas generated with the built-in imagegen tool and imagegen skill.

- `public/art/steppe-ground-details-v1.png`: original 1536×1024 RGBA output, copied unchanged.
- `public/art/steppe-ground-details-v1.json`: grass, dry-grass, flowers, reeds, branch, pebbles.

The source alpha is transparent in empty gutters. Atlas metadata crops the upper
row at Y0–490 and lower row at Y490–960; it registers their ground contact near Y540
of a 512×600 logical canvas. No source pixels were repainted or procedurally created.
Existing trees and actor/building artwork are retained. This pass requires no
additional bitmap art; additional plant species remain optional variety.

## Final generation prompt

Use case: stylized-concept. Production transparent environment detail sprite atlas for The Living Steppe Tapestry, a Mongolian-inspired painted 2.5D fantasy game. Exactly SIX isolated small ground-detail subjects, THREE columns and TWO rows, approximately 1536x1024, equal 512 square cells with generous genuinely transparent gutters. Orthographic three-quarter view 48 degrees above horizontal; warm upper-left sunlight, matte gouache, subtle broad painted facets and restrained brush grain. Muted sage, straw ochre, warm umber, slate and pale ivory, matching painterly miniature gers, horses, larch and willow. Row 1 left to right: (1) one small irregular clump of healthy short sage-green steppe grass blades, (2) one small clump of dry golden feather grass with sparse seed heads, (3) one low loose cluster of tiny ivory and muted lapis wildflowers amongst a few sage leaves. Row 2 left to right: (4) one sparse clump of green river reeds with two subdued tawny seed heads, (5) one fallen weathered grey-brown tree branch with a few forked twigs, lying horizontally on an implied ground plane, (6) a small low cluster of loose slate-grey gravel chips and three little rounded pale river stones. Each subject centered horizontally in its cell, complete and isolated, ground contact at 88% of its cell height, same relative visual scale. These are SMALL subtle accents, not hero props. No ground patches, turf bases, dirt discs, floors, landscape, scene, baked cast shadows, glow, background gradients, opaque background, checkerboard pixels, grid lines, text, labels, numerals, borders, watermark. Actual transparent alpha throughout all empty space. Preserve the understated brush-painted game-art style, not photographic, pixel art or glossy 3D.
