# Character creator illustrations

The creator bundles three original painted PNG atlases under `public/art/`.
These illustrations are separate from battlefield character animation. Their
antique ink and matte gouache treatment follows the supplied concept sheets and
the Living Steppe Tapestry palette. All assets ship locally; there are no runtime
image requests to external services.

`src/ui/creator/components.ts` preserves whole cells and their painted gutters.
`src/ui/creator/characterCreatorContent.ts` selects the cells using the shared
content IDs. Rows and columns below are numbered from one.

| Atlas                  | Grid  | Contents                                                                                                                                                                      |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `creator-figures.png`  | 4 × 2 | Columns: Mounted Archer, Lancer, Iron Pagoda, Spirit Caller. Rows: woman, man.                                                                                                |
| `creator-choices.png`  | 5 × 5 | Rows: woman's five hairstyles, man's five hairstyles, five headgear options, five mount coats, five origin vignettes. Columns follow the content arrays in `data/classes.ts`. |
| `creator-insignia.png` | 5 × 3 | Rows: three oath vignettes (last two cells unused), five emblems, five trim patterns.                                                                                         |

The class choice cards use close head-and-shoulders portraits (`portrait-{classId}-{gender}.png` and `@2x.png`, with legacy `portrait-{classId}.png` as fallback), matching each class's look and headgear from its concept sheet on transparent backgrounds and reflecting the selected gender. If an image asset fails to load, the choice card falls back to the full figure cell from `creator-figures.png`.

Each gender has one predefined face; hairstyle portraits repeat that face.
Selected headgear appears in a portrait inset. The central figure reflects class
and gender; the selected cloth colour appears as a painted palette swatch beneath
it. Full garment recolouring and composited headgear on the figure are future
art improvements. Mount coats, banner emblems, fields, and trims all have previews.

## Generation briefs

All three atlases used the built-in `image_gen` tool, without API/CLI fallback.
The source PNGs are bundled unchanged. The final prompt set requested:

- **Figures:** a production sheet exactly four equal columns by two equal rows,
  antique Central Asian manuscript miniatures, standing adult Mongolian-inspired
  warriors with full boots visible, warm parchment, no frames or text. Top row:
  women with one shared predefined face and dark braids. Bottom row: men with one
  shared predefined face and short moustache. Columns: ivory/vermilion bow bearer
  with quiver and recurved bow; lapis/vermilion lamellar lancer with long vertical
  lance and fur mantle; heavily armoured Iron Pagoda with brass-edged charcoal
  lamellar, shield and saber; lapis/ivory Spirit Caller with ribboned staff and
  restrained turquoise light. Original designs, ink contours, matte gouache,
  warm upper-left light, ochre/brass/rust/lapis, consistent registration, no horse,
  scenery, typography, UI, or watermark. Landscape 1536 × 1024.
- **Choices:** a production atlas exactly five equal columns by five equal rows,
  isolated manuscript miniatures on pale parchment, no borders or labels. Row one:
  the same woman's face with warrior plaits, topknot, twin braids, flowing locks,
  shaved tresses. Row two: the same man's face with those hairstyles. Row three:
  sable cap, felt kalpak, plumed cap, lamellar helmet, wolfskin hood. Row four:
  complete saddled steppe horses in bay, white, black, dun, piebald. Row five:
  herds/ger, retainer/courtyard, artisan/loom, caravan/path, fantasy apprentice/cairn.
  Ink and matte gouache, ochre/rust/lapis/sage, warm upper-left light, original
  painted chronicle style, no modern graphics, text, numbers, UI, or watermark.
- **Insignia:** exactly five equal columns by three equal rows on pale parchment,
  no grid or labels. Row one: horse/sun/mountains, palace gate/vermilion banners,
  snowy peaks/clouds/stars, two empty cells. Row two: flame/sun/crescent, wolf head,
  spread-wing hawk, coiling cloud, endless geometric knot. Row three: horizontal
  ornamental strips of steppe key fret, cloud scroll, ram-horn curls, braided cord,
  diamond lattice. Warm brass/umber heraldry and rust/ochre/lapis ornament, original
  ink contours and hand-painted matte gouache, readable silhouettes and gutters,
  no digital icons, mockup, letters, or watermark. Landscape 1536 × 1024.
