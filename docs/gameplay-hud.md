# Gameplay HUD

The battlefield HUD frames the painted steppe as a single antique manuscript leaf. A thin turquoise, rust and ochre woven border surrounds the screen; sparse warm-parchment plaques hold the live values without covering the battlefield. The generated ornament, paper tooth, faded mineral colour and hand-inked rules follow the same visual language at every scale. Structural rules live in `src/hud.css`, the reference-specific paint and proportions live in `src/hud-reference.css`, markup and live values stay in `src/ui/GameUI.ts`, and renderer-independent visibility and context rules live in `src/ui/hudContent.ts` and are covered by `tests/unit/hudContent.test.ts`.

## Permanent annotations

| Annotation          | Position      | Content and expansion                                                                                                                                                                                |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clan resources      | top left      | Five newly painted icons with small-caps labels and values on one ruled parchment strip. The disclosure opens doctrine, workers, food net/outlook and the loss tally.                                |
| Expedition time     | top centre    | Active time and stage on a cloud-winged painted timer plaque.                                                                                                                                        |
| Chronicle and pause | top right     | Two square painted key plaques retaining Tab/J and Escape.                                                                                                                                           |
| Current objective   | upper right   | Location/day and the immediate italic objective on a corner-ruled scroll, with migration progress and critical warnings. Its disclosure opens pasture, calamity, route timing and encounter details. |
| Khan status         | bottom left   | The Khan, level/XP, health, clan resolve, Breath and class-resource beads on one ruled character card.                                                                                               |
| Action plaque       | bottom centre | A painted galloping rider, Gallop/Space state, four class abilities and relevant camp actions on one ornamented strip.                                                                               |
| Zoom                | bottom right  | The same three controls, visually subdued until hover or keyboard focus.                                                                                                                             |

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

Under 600 px the same annotations stack at the top inside a narrower woven frame, character status sits above a compact two-row action plaque, and `GameUI.layoutGuidance` keeps opened guidance between the objective and bottom controls. Ability labels collapse to their painted icons, keys and costs. The DOM ids, accessible labels, controls and shortcuts remain stable across layouts.

## New HUD art

The built-in image-generation tool created `public/art/hud-manuscript-atlas.png` from the approved reference as a style and material guide, not an edit target. The transparent 5 × 4 source atlas was cut into the `hud-icon-*`, `hud-border-*`, `hud-cloud-flourish.png`, `hud-timer-plaque.png`, `hud-action-ornament.png` and `hud-keycap-frame.png` runtime slices. A second generated source produced `hud-panel-frame.png`, whose quiet centre and compact corner brackets work as a nine-slice for the resource, objective and Khan panels. No generated text is used: all labels, values and keyboard states remain accessible live HTML.

The atlas prompt requested twenty isolated antique manuscript assets on genuine transparency: five resource icons; a galloping Khan and four action symbols; trade, journal and pause symbols; a cloud flourish and empty key frame; repeatable woven border pieces; an empty timer plaque; and action-strip ornament. It fixed warm parchment, fine umber ink, restrained lapis and vermilion, fibrous paper grain and matte hand-painted brushwork, while excluding CG, glossy vector treatment, fake text, labels and watermarks. The panel prompt requested one empty 5:1 parchment nine-slice with quiet stretchable edges and compact rust-and-lapis corner brackets.

The older `ui-plaque-*`, `ui-icon-*`, `ui-braid.svg` and `ui-felt.png` assets remain available to paused pages and other interface surfaces; the gameplay HUD no longer consumes them. The superseded HUD-only cloud scroll was removed.

Interface motion remains in `src/motion.css`, respects reduced-motion preferences, and never delays an action or value update.
