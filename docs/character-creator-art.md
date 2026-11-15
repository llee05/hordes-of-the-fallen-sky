# Character creator illustrations

The character creator is a single wide manuscript folio laid on a dark wooden
desk. The parchment, irregular paper edge, faint fibre grain, sparse corner rules,
and central dividing line are CSS rather than a baked interface painting. This
keeps the composition quiet and lets it scale cleanly at 1280×800, 1920×1080, and
3840×2160. There are no wooden rollers, tassels, horses, buildings, fantasy
plaques, or full ornamental frame.

Four small transparent class marks live at
`public/art/creator-class-{class-id}.png`. Eight transparent 1086 × 1448 WebP
portraits live at `public/art/creator-portrait-{class-id}-{gender}.webp`. Each
class has a male and female portrait, and only the selected pairing is visible.
During a selection change the outgoing and incoming images overlap for a 180 ms
cross-fade, disabled by the reduced-motion media query.

Every name, label, class description, selection state, and action remains live
HTML. Decorative images are hidden from assistive technology; the portrait stage
has a text alternative and the controls keep their live names, radio semantics,
and keyboard focus. Cormorant Garamond is bundled locally and used at readable
weights, with italics reserved for the short class description.

## Portrait generation brief

The built-in `image_gen` tool produced the eight portraits. The Mounted Archer
male established the shared framing, pigment, line, and lighting treatment; each
later portrait used that finished treatment or its matching class counterpart as
a style anchor. The supplied class sheets informed practical equipment and class
silhouettes, while the established female character reference informed the women.

The common prompt asked for one upper-thigh portrait facing slightly right,
painted with mineral pigments and diluted ink, confident dark contour lines,
matte flat colour, sparse dry-brush shading, irregular lower brush edges, generous
transparent gutters, and warm upper-left light. It excluded scenery, horses,
buildings, UI, text, glossy armour, oversized fur, excessive jewellery,
extravagant poses, and generic high-fantasy effects.

- Mounted Archer: light rust lamellar, muted blue deel, modest winter cap,
  composite bow, and arrow case.
- Lancer: practical conical helmet, blue-grey lamellar, weathered red mantle, and
  an upright lance.
- Iron Pagoda: dense charcoal lamellar, low domed helmet, round hide-and-iron
  shield, and sheathed curved saber.
- Spirit Caller: smoked-indigo deel, simple felt cap, bronze mirror-disc, and a
  wooden ring-topped staff with restrained cloth ties.

The generated PNGs were encoded as WebP at quality 88 without changing their
transparent canvases. The previous roller background
`public/art/creator-scroll-wide.webp` is no longer loaded or shipped. The older
mounted canvas preview, tall scroll background, plaque art, and legacy creator
atlases had already been removed from the build.
