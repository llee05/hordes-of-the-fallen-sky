# Gameplay HUD

The battlefield HUD frames the painted steppe with a few manuscript annotations. It uses warm paper washes, oxidised red and faded blue ink, Cormorant Garamond titles, existing hand-painted icons, and concentrated cloud or woven ornament. It deliberately avoids a complete border around every value. The rules live in `src/hud.css`; markup and live values stay in `src/ui/GameUI.ts`; renderer-independent visibility and context rules live in `src/ui/hudContent.ts` and are covered by `tests/unit/hudContent.test.ts`.

## Permanent annotations

| Annotation          | Position      | Content and expansion                                                                                                                                                                                          |
| ------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clan resources      | top left      | Five painted glyph/value pairs. The round disclosure opens doctrine, workers, food net/outlook and the loss tally.                                                                                             |
| Expedition time     | top centre    | Active time and stage on the small cloud-anchored cartouche.                                                                                                                                                   |
| Chronicle and pause | top right     | Two painted marks retaining Tab/J and Escape.                                                                                                                                                                  |
| Current objective   | upper right   | Location/day, the immediate objective, migration progress and critical warnings. Its disclosure opens pasture, calamity, route timing, camp pressure, recent losses, encounter detail and optional objectives. |
| Khan status         | bottom left   | Level/XP, health, clan resolve, Breath and class-resource beads in one slim annotation.                                                                                                                        |
| Action plaque       | bottom centre | Gallop, four class abilities and currently relevant camp actions on one scalable painted plaque.                                                                                                               |
| Zoom                | bottom right  | The same three controls, visually subdued until hover or keyboard focus.                                                                                                                                       |

This is seven visual groups in the normal established-camp view. The earlier layout presented 17 separately framed blocks or tiles: a resource card, clock, two menu cards, objective card, guidance card, level plaque, vitals card, four ability tiles, two camp-action tiles, gallop card, zoom card and bearing chip. The redesign therefore removes 10 of 17 permanent blocks (58.8%) while retaining every route, shortcut and live value.

## Context priorities

`hudContext` derives presentation-only priority from the run; it never mutates gameplay.

- **Combat** covers warning, assault and elite encounter phases. Khan status and the action plaque gain contrast while resources and the objective wash become quieter.
- **Encampment** covers quiet established-camp play. Resources and contextual Develop camp/Pack & migrate actions carry the emphasis.
- **Exploration** covers the road, field objectives and the pre-camp prologue. The objective/navigation note and gallop are emphasized. Camp actions retain their existing stage-based visibility rules.

Critical clan warnings, fresh loss messages, offscreen danger warnings, elite markers and succession choices remain fully visible in every context.

## Conditional information

- The clan bearing is visually suppressed unless exploration makes navigation useful. It remains in the DOM for accessibility and existing integrations.
- Guidance is a short margin note rather than a standing card. Prologue notes open when immediately actionable; later notes collapse to their title. Actions and **Hide tips** remain available.
- Before the Blue Banner camp exists, resources, camp pressure, expedition disclosure and camp actions remain hidden. The authored prologue objective and guidance stay visible.
- Develop camp and Pack & migrate appear only after camp establishment and leave the plaque during migration. An applicable action that is not yet allowed stays visible and disabled.
- Camp pressure appears only when enemies approach. A fresh loss remains for ten active seconds; the running tally is in expanded resource details.
- Optional field objectives retain their title, bearing and reward; full instruction remains in the tooltip and chronicle.
- Chronicle messages remain transient. Succession is the exceptional centred decision leaf because it requires an immediate choice.

Under 600 px the same annotations stack at the top, character status sits above a compact two-row action plaque, and `GameUI.layoutGuidance` keeps opened guidance between the objective and bottom controls. Ability labels collapse to their painted icons, keys and costs. The DOM ids, accessible labels, controls and shortcuts remain stable across layouts.

## Existing art used

- `public/art/ui-plaque-left.png`, `ui-plaque-middle.png` and `ui-plaque-right.png` form the scalable action plaque.
- `public/art/hud-cloud-scroll.webp` anchors the time and objective annotations.
- `public/art/ui-braid.svg` supplies the single woven accent on the action plaque and menu marks.
- `public/art/ui-icon-*.png` supplies the painted ability, journal and camp-action symbols.
- `public/art/ui-felt.png` supplies the quiet paper/felt grain.
- `src/ui/artwork.ts` continues to provide brass-cut resource linework and cropped painted world illustrations.

Interface motion remains in `src/motion.css`, respects reduced-motion preferences, and never delays an action or value update.
