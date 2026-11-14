# Character creator illustrations

The character creator is a fixed-aspect illuminated parchment scroll. Its locally
bundled background supplies the parchment, section banners, arched preview frame,
cloud ornament, and Back/Begin plaques; live HTML supplies every readable label,
field, selection, class description, and accessible control.

`public/art/creator-scroll-bg.webp` is the 1448 × 1086 opaque scroll painting,
encoded at WebP quality 90 (about 0.4 MB). The title screen preloads it so opening
the creator does not expose an unpainted frame.

Four small transparent class marks live at
`public/art/creator-class-{class-id}.png`. The mounted preview draws registered
frames from `public/art/steppe-classes-motion.png` and its JSON atlas metadata, the
same original class paintings used by the battlefield. The metadata is fetched
once and preserves the atlas's 256 × 360 logical registration while the DPR-aware
canvas scales it into the arched creator frame.

All art ships locally and no runtime request leaves the application. Decorative
images are hidden from assistive technology; the canvas has a text alternative and
the controls keep their live names, radio state, and keyboard focus.

## Background generation brief

The built-in `image_gen` tool produced the scroll background source as an original
1448 × 1086 composition in the Living Steppe Tapestry style: warm parchment on a
dark desk, rust woven section banners, brass and umber fretwork, an empty arched
mounted-rider frame, a right-hand manuscript text area, and painted Back/Begin
plaques. The prompt excluded live names, class descriptions, ability text, control
labels, and character paintings so the application can render those accessibly.

Legacy `creator-figures.png`, `creator-choices.png`, and `creator-insignia.png`
atlases came from the removed multi-panel creator and are not loaded by the current
screen. Their deletion or archival remains a separate product decision.
