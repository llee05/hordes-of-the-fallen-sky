# Painted clan standards

The camp and caravan standards render the saved character profile's banner
`emblem`, `fieldColour`, and `trim`. Choices remain in `CharacterProfile.banner`;
there is no separate banner save state. Old runs without a character profile use
the default flame/sun/crescent, ivory field and steppe-fret border.

`assets/ClanStandard.ts` is a reusable sprite composed from four registered painted layers:
wood/brass pole, neutral cloth, ornamental border, and central emblem. Only the
cloth receives the field colour. Emblem and border use that colour definition's
contrasting ink; the pole retains its original painted materials. The painted source layers share a 256 × 360 canvas and (128, 324) ground anchor.
They are composited at half resolution to a 128 × 180 sprite with the same world
size and anchor. The cached sprite sways
through active gameplay seconds; menus freeze it.
`CampPresenter` rebuilds standards from the current profile whenever camp drawings
refresh, including archive restore and migration. Military and relay standards
use the same clan heraldry.

Five original embroidered emblems cover flame/sun/crescent, wolf head, spread-wing
hawk, cloud scroll and endless knot. Five painted borders cover angular key fret,
cloud scroll, ram-horn curl, braided cord and ger lattice. These are miniature game
ornaments inspired by the supplied antique manuscript concept sheets, not font
glyphs or runtime vector placeholders.

The generated `public/art/steppe-heraldry-source.png` is the reusable 4 × 3 source
sheet. Its twelve parts are packed below the existing rider region in
`steppe-classes-motion.png` and registered in the same JSON. The 1536 × 1024 rider
region and every existing rider rectangle remain unchanged. The shared texture is
1536 × 1744; heraldry adds no texture or draw batch to the battlefield. Each standard remains one sprite quad, matching the standard it replaces.

`clanStandardCache.ts` prepares one CanvasTexture under the existing atlas key
before class actors are created. It copies every registered source frame without
changing the artwork or rider geometry. A profile change composites the four
painted parts once into an unused 128 × 180 atlas slot, then uploads the changed
texture once. Repeated camp refreshes and ordinary frames do no painting or
texture uploads. `SpriteBridge` listens for that explicit atlas-change event,
updates its existing texture, and unregisters on destruction. All clan standards
share the current profile and the same cached frame; the cache is bounded to one
entry per atlas. No additional texture or draw call is introduced. Standards opt into world
projection with the `projectInWorld` image data flag, so negative local camp depth
does not hide the primary standard. Other scenery and camp props retain their
existing projection behavior.

To regenerate packing after editing the source sheet, install ImageMagick and run
`node scripts/pack-heraldry.mjs`. This development-only command crops each source
cell, fits it to its registered size, and copies the painted pixels into a padded
atlas band. It is idempotent, never paints new artwork, and is not part of the
runtime or package build. Emblems fit 70 × 76 pixels; cloth and borders share an
exact 190 × 126 registration; the pole is 48 × 300. All existing rider pixels are
copied unchanged. The source art remains local for future UI reuse.

For a development preview before character creation merges, start New Game with
`npm run dev:web`, then set the existing development scene's profile and refresh:

```js
const scene = window.__gloam.scene;
scene.run.character.banner = {
  emblem: 'wolf',
  fieldColour: 'lapis',
  trim: 'braided-cord',
};
scene.campPresenter.refresh();
```

Use the IDs in `src/shared/characterProfile.ts`. Character creation and ordinary
save restore require no new hook; they supply the same profile. When rebasing
onto the preceding class implementation, retain the layered standard rather than
its earlier whole-image field tint.

## Generation prompts

Built-in `image_gen` produced the source sheet, using the character-creation and
Mounted Archer reference sheets as style and heraldry references:

> Use case: stylized-concept. Production painted heraldry sprite atlas for Hordes of the Fallen Sky, antique medieval manuscript / Living Steppe Tapestry miniature gouache. Original assets on genuine transparent alpha, exactly four columns and three rows, 1536 × 1024, twelve isolated assets with wide gutters. Ivory monochrome painted embroidery with subtle umber stitch shading, strong readable silhouettes and restrained brush grain. Row 1: flame above sun and crescent; wolf head in profile; spread-wing hawk; three-lobed cloud scroll. Row 2: endless diamond knot; rectangular key-fret border; rectangular cloud-scroll border; rectangular ram-horn border. Row 3: rectangular braided horsehair border; rectangular ger-lattice border; tall ash-wood pole with brass spear finial and red ties, no cloth; plain ivory silk flag, no pole, emblem or ornament. All five borders have empty transparent centers and the same frontal 3:2 proportions as the cloth. No parchment, shadows, labels, grid, text, watermark, glossy 3D or pixel art.

A targeted transparency cleanup preserves the painted parts and layout:

> Use case: background-extraction. Remove only pale parchment/cream/grey background and haze, including empty centers of all five borders and holes in emblems. Empty space must have zero alpha. Preserve all embroidery, stitches, motifs, borders, pole and opaque cloth at bottom right; same 1536 × 1024 canvas, 4 × 3 layout, positions, sizes, colours and silhouettes. No redrawing, rearrangement, new art, shadows, glow, checkerboard, lettering or watermark.
