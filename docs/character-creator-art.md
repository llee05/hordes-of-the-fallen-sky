# Character creator illustrations

The character creator is a fixed 3:2 illuminated parchment scroll over a dark
wooden desk. Its locally bundled background supplies the parchment, clean wooden
rollers, corner tassels, red-ink cloud border, and fretwork; live HTML supplies
every readable label, field, selection, class description, and accessible control.

`public/art/creator-scroll-wide.webp` is the 1536 × 1024 opaque scroll painting,
encoded at WebP quality 90 (about 0.45 MB). The paper border, portrait, controls,
and ornaments end above the lower roller and begin below the upper roller. The
screen uses a matching dark wood treatment around the fixed-aspect scroll instead
of flat letterbox bars. The title screen preloads it so opening the creator does
not expose an unpainted frame.

Four small transparent class marks live at
`public/art/creator-class-{class-id}.png`. Eight transparent 1024 × 1536 WebP
portraits live at `public/art/creator-portrait-{class-id}-{gender}.webp`. Each
class has a male and female portrait; only the selected pairing is visible. During
a selection change the outgoing and incoming images overlap for a 180 ms
cross-fade, disabled by the reduced-motion media query.

All art ships locally and no runtime request leaves the application. Decorative
images are hidden from assistive technology; the portrait stage has a live text
alternative and the controls keep their live names, radio state, and keyboard
focus. Name, section, description, and action lettering uses the locally bundled
italic Cormorant Garamond face to match the manuscript reference.

## Background generation brief

The built-in `image_gen` tool produced the scroll background source as an original
1536 × 1024 composition in the Living Steppe Tapestry style: warm parchment on a
dark wooden desk, continuous cylindrical rollers, small vermilion tassels, and an
empty red-ink cloud-and-fretwork border. The prompt excluded people, controls,
labels, readable text, and button plaques so the application can render those
accessibly and keep them inside the paper-safe area.

The same built-in tool produced each portrait from the wide-layout reference and
the original class reference sheet. Female portraits also used the established
female rider costume reference. The prompt required one person, class-specific
armour, headgear, weapon and palette, loose ink-and-wash manuscript treatment,
transparent gutters, and no background or text. The generated PNGs were normalized
to a common transparent canvas and encoded as WebP for shipping. The old mounted
canvas preview, tall scroll background, plaque art, and unused legacy creator
atlases were removed from the build.
