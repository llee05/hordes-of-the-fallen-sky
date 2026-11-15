# Character creator illustrations

The character creator follows the supplied concept sheet's dense three-column
Mongolian manuscript composition. A generated landscape frieze spans the header
behind live title cartouches. Identity, appearance, and origin occupy the left;
the selected Khan and camp illustration fills the centre; class, oath, mount, and
clan standard occupy the right. Parchment grain, geometric cartouches, selected
states, focus rings, labels, descriptions, and every control remain live HTML/CSS.

The desktop composition is proportional at 1366×768 and 1920×1080. At 390×844
the manuscript becomes a vertical scroll. The centre scene, live name input, and
Begin Journey action remain above the option panels so the primary path is easy to
reach on a phone.

## Bundled art

The built-in `image_gen` tool produced the project-bound raster art using the
captain's character-creation concept and four class sheets as references:

- `public/art/creator-header-frieze.webp`: a calm, full-width steppe panorama behind
  the title cartouches.
- `public/art/creator-bottom-ornament.webp`: mirrored golden horses, mineral-pigment
  cloud scrolls, and key-fret corners framing the live Begin Journey control.
- `public/art/creator-scene-{class-id}-{gender}.webp`: eight 768×1024 centre
  scenes. Each class/gender pairing has its own figure, equipment, horse, and camp
  illustration. The pair cross-fades in 180 ms; reduced motion disables it.
- `public/art/creator-selector-atlas.webp`: a 5×4 atlas of faces, hairstyles,
  headgear, and mounts.
- `public/art/creator-vignette-atlas.webp`: a 5×5 atlas of origins, mounted class
  cards, oaths, banner emblems, and trim patterns.
- `public/art/creator-class-card-*.webp` and `creator-oath-*.webp`: clean standalone
  crops for the class and oath selectors. These avoid exposing adjacent atlas cells
  at proportional desktop sizes.
- `public/art/creator-banner-emblem-*.webp`: isolated emblem crops for the large
  live flag preview; the smaller emblem buttons continue to use the packed atlas.

The first female Mounted Archer scene established the crop, setting, mineral
pigment palette, ink contour, and parchment texture. Each later scene used that
finished image and the relevant class sheet as locked references. Mounted Archer
uses bow and quiver; Lancer uses long lance and small shield; Iron Pagoda uses
heavy lamellar, round shield, saber, and horse barding; Spirit Caller uses indigo
robes, ring staff, pale horse, and restrained turquoise wind motifs. Male and
female variants share class equipment while preserving distinct faces.

The two selector atlases consolidate small vignettes into web-friendly files. CSS
background positioning exposes origin, face, hairstyle, headgear, mount, emblem,
and trim cells; class and oath images use standalone crops because their wide cards
make crop bleed more visible. Generated PNG sources were encoded to WebP at quality
84–86. The eight older transparent `creator-portrait-*.webp` cutouts are superseded
by the camp scenes and are no longer loaded.

Decorative atlas spans are hidden from assistive technology. Scene figures have a
live text alternative, every choice retains its accessible label and radio state,
and focus uses a high-contrast vermilion-and-gilt outline rather than the browser's
default blue treatment.
