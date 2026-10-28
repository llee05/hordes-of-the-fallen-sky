# The Living Steppe Tapestry

Hordes of the Fallen Sky’s art direction combines the readable miniature scale of Thronefall, the illustrated silhouettes and painted surfaces of The Banner Saga, and the warm materials and geometric ornament of Mongolian and Central Asian textiles. The assets are original fantasy designs. The game keeps its top-down simulation and presents it with painted three-quarter-view sprites in the [angled world](world-3d.md).

## Visual language

Golden, sage, and ochre grasses form a quiet field beneath ivory felt gers, turquoise and vermilion banners, chestnut horses, and decorated wooden carts. Warm sunlight falls from the upper left. Soft olive shadows anchor the miniatures. The living clan uses textile bands, rope, wood, and felt; the calamity uses ash, stone, bone, indigo cloth, and restrained turquoise light.

All twelve locations share the same painting language and have distinct landscapes.
Golden flowering meadows, frozen riverbanks, fractured slate corridors, woodland
foothills, snow crowns and glacial ridges, extinct volcanic steppe, granite desert,
and braided river pasture use their own surface palettes, vegetation, landforms,
and watercourses. Their geography persists across chapters.

`data/landscapes.ts` authors each location's painted preview. The locally bundled
`steppe-scenery` atlas adds larch, pine, willow, foothill, snow dome, pyramid, glacier,
white summits, extinct cone, desert granite, reeds, and slate crag cutouts.
Migration cards and destination details reuse the painted landmarks.
See [the landscape catalog](location-landscapes.md),
[the battlefield rendering and navigation contract](world-3d.md), and
[the full atlas generation prompt](location-scenery-prompt.md). These suggest the
surrounding land rather than reconstructing real monuments or sacred ceremonies.

The interface uses indigo felt, warm manuscript paper, brass edging, rust-red woven trim, and serif chapter titles. A stitched hanging cloth carries the title menu while leaving the painted camp visible beside it. During play, compact textile HUD panels and a bottom command dock float above the full-window battlefield. Detailed manuscript pages live in the paused clan chronicle and management menus. Keep material contrast quiet beneath text, and keep decorative stitches and borders out of pointer and keyboard navigation.

`src/tapestry.css` defines the material treatment. `src/ui/artwork.ts` defines decorative brass-cut SVG symbols and route landscape vignettes. Camp and chronicle illustrations crop the existing painted atlases using their shared JSON frame metadata, so structures look the same in the world and in management pages. Symbols and illustrations are hidden from assistive technology; the containing controls retain their text labels, keyboard focus, and controller navigation.

The camp development screen presents a large selectable miniature in `src/ui/campModel.ts` and `src/camp.css`. Gers, workshops, a cairn sanctuary, archery targets, grazing animals, and carts surround a central hearth. Painted props reuse the shared atlas crops; racks, targets, flags, and supplies use code-native geometry. Unestablished sites are ghosted, learned crafts add supplies, and household growth adds shelters. A manuscript inspector uses the shared progression renderer for the selected site’s costs, prerequisites, and purchases. Smoke, flame, grass, and cloth have subtle ambient CSS motion; reduced motion disables it. Resident poses remain static while planning freezes gameplay. The entire miniature is a presentation of the scene-owned run snapshot.

`src/motion.css` gives the hanging title cloth a slow breathing motion, opens manuscript panels in 240ms, and lightly staggers their illustrations. River currents and banner cloth animate inside the migration vignettes. Hover and keyboard focus lift illustrations while keeping their controls in place. Buying a structure or changing chronicle tabs refreshes content without replaying the whole panel entrance. Actions never wait for animation completion. A single reduced-motion rule disables all interface keyframes and transitions, including the older meters and notifications.

`src/ui/Motion.ts` adds short feedback animations to displayed resource and health changes, damage, gallop readiness, formation changes, and unlocked migration. It uses the Web Animations API with at most one transient effect per element; it never stores simulation values or schedules gameplay. Feedback cancels on pause, document hiding, live reduced-motion changes, and renderer destruction. UI values always update immediately to the current scene snapshot.

## Local assets and rendering

The original world-art PNGs, two character animation sheets, and the UI felt texture were generated with the **built-in image_gen tool** and copied into the project. There are no AI calls or image downloads at runtime. Source PNGs retain the generated image data and transparency. Atlas JSON describes the individual silhouettes without editing or slicing the PNGs into separate files. `public/art/ui-felt.png` is a neutral material swatch, tinted with CSS multiply blending for indigo and rust cloth. `public/art/ui-braid.svg` supplies a repeating geometric woven trim. See [the character animation guide](character-animation.md) for the motion sheets, registration, playback, and generation prompts.

| Asset                     | Path                                                            | Role                                                                          |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Painted grassland         | `public/art/steppe-ground.png`                                  | Repeating ground surface                                                      |
| Mounted host and calamity | `public/art/steppe-actors.png`                                  | Commander, archer, wolf, shade, earth creature, ghost rider, seer, Skybreaker |
| Camp and terrain props    | `public/art/steppe-props.png`                                   | Ger, cart, two-color banners, sheep, stone outcrop, ribbon cairn              |
| Atlas metadata            | `public/art/steppe-actors.json`, `public/art/steppe-props.json` | Named frames tightly bounded from the generated alpha                         |

`src/game/assets/painterlyArt.ts` loads the shared character, civilian, camp prop, and scenery atlases, defines visual sizes, and configures collision circles in world units independently of image resolution. It also creates small deterministic brush, arrow, shard, dust, and shadow textures. See [the scene guide](world-3d.md) for terrain rendering and simulation ownership. The Phaser renderer uses antialiasing and linear texture filtering. Painted sprites use fractional coordinates; the game does not round them into a pixel grid.

Characters have four painted locomotion frames and two attack poses each, with left-facing mirroring and frame registration that keeps ground anchors stable. Gameplay time drives every character frame and defeat copy, so menus freeze their playback.

## UI material generation prompt

The built-in image_gen tool produced `public/art/ui-felt.png` with this prompt:

> Use case: stylized-concept. Asset type: seamless square UI material texture for Hordes of the Fallen Sky, a painterly Mongolian-inspired nomadic fantasy game with The Living Steppe Tapestry art direction. Fill the entire square with a single uninterrupted piece of warm undyed ivory wool felt over fine linen, illustrated in matte gouache with very subtle soft brushwork. Low-contrast warm oatmeal and cream, fine irregular natural fibers, a gently worn tactile surface. Uniform illumination and even color across the whole square. Quiet and readable enough for dark text overlaid by game code. This texture will also be multiplied with indigo and vermilion colors for cloth game HUD panels. Absolutely NO objects, no frames, no ornamental borders, no fringe, no seams, no text, no letters, no icons, no vignette, no strong stains, no folds, no shadows, no gradients, no scene or mockup. Seamless on all four edges, flat front view. Produce a production-ready material swatch, not a UI screenshot.

## Portable camp barricade

`src/game/assets/CampBarrier.ts` builds a bounded set of timber hurdles directly in Phaser graphics: warm umber wood, ochre edge light, rope lashings, crossed braces, and small indigo and rust felt bands with brass geometric details. Soft olive shadows reuse the locally bundled shadow texture. Separate ground anchors let the near and far pieces sort correctly with riders, creatures, workers, and tents. Low panels keep the camp readable; worn wood and shorter cloth ends reflect the clan's existing resolve. Travelling hurdles lower into wheeled screens around the caravan.

The geometry comes from `state/campBarrier.ts`, shared with melee reach, hostile missile interception, and defensive wards. Camp growth expands the enclosure without scaling combat actors. A struck panel briefly brightens and jolts, using active gameplay seconds; menus freeze it. Arrival clears impacts and relocates the existing pieces. No new bitmap or animation sheet is required for these adaptable geometric props.

## Generation prompts

The following shared direction prefixed each generation prompt:

> Use case: stylized-concept. Art direction: The Living Steppe Tapestry, for a Mongolian-inspired nomadic fantasy game. Stylized painterly 2.5D with the miniature readability of Thronefall, the hand-painted illustrated character and bold silhouettes of The Banner Saga, and the material warmth and decorative geometry of Mongolian/Central Asian felt appliqué, woven textiles, and painted wood. Original designs, not copies of existing game assets. Matte gouache, restrained brush grain, sculpted light and shadow, elegant simplified silhouettes, no pixel art, no photography, no glossy 3D. Consistent high three-quarter view looking down at approximately 45 degrees. Warm sunlight from upper left, cool olive shadows. Palette: ochre gold, warm ivory, deep lapis turquoise, rust red, olive, and umber. No text, no letters, no grid lines, no watermark.

### Ground

> Asset type: seamless square ground texture tile, approximately 1024x1024, for a top-down 2.5D playable golden steppe. Fill the entire image with sun-warmed ochre grassland, flowing loose strokes of dry grass, broad gentle variations of gold and sage olive, soft woven-paper grain, occasional fine grass blades. FLAT GROUND ONLY: no sky, horizon, mountains, people, tents, paths, rocks, borders, lettering, or visible objects. Not a landscape scene. Calm low-contrast center and readable negative space for units and projectiles. Tileable on all four edges. No bright speckles or harsh repeating motifs.

### Actors

> Asset type: production sprite atlas on genuinely transparent background. Wide canvas, EXACTLY FOUR equally sized columns and TWO equally sized rows, 8 isolated subjects. Every subject centered at the same relative point within its equal cell, with ALL extremities inside the central 80% of its cell and a generous transparent gutter; no subjects may overlap another cell. Empty transparency around every subject. All mounted subjects face RIGHT. Ground contact at 80% of cell height; top of silhouette around 12%. No ground patches or baked drop shadows. First row left to right: (1) Mongolian-inspired mounted commander in lapis-blue deel and simple lamellar armor riding a chestnut steppe horse, small turquoise pennant behind shoulder, curved bow; (2) mounted archer in rust-red and teal deel on a dark bay horse, bow visible; (3) lean supernatural wolf with long charcoal-indigo legs, ivory angular mane and dim amber eyes; (4) unsettling hovering winged wraith, long angular smoke-blue cloth wings and pale empty face. Second row left to right: (5) hulking earth creature of layered ochre rock with sparse grass and a hollow teal-lit face; (6) ghost rider on an emaciated blue-grey spirit horse with tattered ivory/indigo cloth and faint mist, facing right; (7) hovering hollow seer in long worn indigo robes, bone-white mask and muted turquoise spirit ornaments; (8) enormous ominous antlered Skybreaker, a gaunt ash-grey horse-skull titan with curling branch-like antlers and tattered ink-blue drapes, faint pale teal light inside ribs. Keep scale similar within each cell; game code will enlarge elite and boss. Crisp cutout silhouettes, painterly surfaces, miniature battlefield readability, all 8 complete full bodies visible. No extra items, no terrain.

### Props

> Asset type: production environmental sprite atlas on genuinely transparent background. Wide canvas, EXACTLY THREE equally sized columns and TWO equally sized rows, SIX isolated objects. Every object centered in its equal cell with all extremities inside central 80% and generous transparent gutters. No objects crossing cell boundaries. Ground contact at 80% of each cell height. No baked ground patches, no baked drop shadows. First row left to right: (1) traditional round ivory felt Mongolian ger in high three-quarter view, low conical roof with dark smoke opening, warm wooden doorway facing front-right, decorated turquoise and rust-red woven bands and simple interlocking geometric embroidery; (2) wooden nomadic two-wheel covered supply cart facing right, ivory felt cover, vivid lapis and rust textile edging and visible wooden wheels; (3) tall wooden pole carrying two flowing narrow swallowtail banners, one turquoise blue, one vermilion, with small gold geometric motifs, complete pole foot visible. Second row left to right: (4) one miniature ivory wool sheep in high three-quarter side view facing right with small dark face and four short legs; (5) broad natural cluster of smooth stratified steppe rocks in ochre, grey-green and umber; (6) a sacred cairn of layered stones with a wooden pole and long turquoise cloth ribbons, recognizable as weathered stone and cloth, no anthropomorphic deity figure. Painterly texture and faceted simplified shading, consistent sunlight upper left, complete silhouettes visible, no labels, no stray decorative objects.

The selected props atlas used this follow-up, with the original props image as the edit target and transparent output enabled:

> Use case: background-extraction. Edit target: the attached SIX-object game sprite atlas in its current three-column, two-row arrangement. Remove ONLY the entire dark/brown/colored studio gradient backdrop, light blooms and ground shadows around all six subjects. Replace it with genuinely transparent alpha. Preserve the existing ger, cart, two-color banner pole, sheep, rock cluster, and ribbon cairn EXACTLY: same painting, same shape, same size, same pixel positions, same colors, same brushwork. The atlas must remain the same canvas dimensions and layout. Keep every opaque subject pixel and all fine ropes, ribbons and pole edges. No floor, no haze, no vignette, no colored aura, no checkerboard pixels, no shadows outside the subjects. Do not redraw or rearrange the objects. This is for direct game sprite use on a golden grassland.
