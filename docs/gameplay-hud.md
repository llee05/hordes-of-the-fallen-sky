# Gameplay HUD

The battlefield HUD is a painted manuscript laid over the steppe. Every leaf shares the
character creator's palette and typography: parchment with a double vermilion rule and
a gilt inner line, scroll-cut ribbon headers, Cormorant Garamond titles and numbers, and
DM Sans ink for small text. The rules live in `src/hud.css`; the markup and live values
stay in `src/ui/GameUI.ts`, and the strings it places come from the renderer-independent
`src/ui/hudContent.ts`, which `tests/unit/hudContent.test.ts` covers.

## Leaves

| Leaf                | Where         | Shows                                                                                                        |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| The Clan            | top left      | People, herd, food, materials and spirit as compact glyph-and-number pairs.                                  |
| Clan details        | inside above  | Doctrine, workers, food outlook and the running loss tally behind the round `▾` disclosure.                  |
| The hour            | top centre    | Active time and the stage (prologue chapter, Encampment or The Great Flight) in a scroll cartouche.          |
| Chronicle and pause | top right     | Two parchment buttons with their key badges (`Tab`, `Esc`).                                                  |
| Objective           | right         | The current place or prologue chapter and its one-line objective.                                            |
| Expedition details  | inside above  | Pasture, calamity, route timing, camp pressure, recent losses, encounter and optional objective behind `▾`.  |
| Guidance            | left          | Prologue notes open by default; later tips collapse to their title. Actions and **Hide tips** remain inside. |
| The Khan            | bottom left   | Level and XP, Khan health, clan resolve, Breath and the active class-resource beads.                         |
| Saddle bar          | bottom centre | Four abilities with cooldown and resource cost, plus camp and migration actions only when they apply.        |
| Gallop and zoom     | bottom right  | Held gallop state with its Breath line, and a thin zoom strip above it.                                      |
| Chronicle toast     | above the bar | Clan messages on a parchment strip for seven seconds.                                                        |
| Succession          | centre        | The successor choice while a new Khan is chosen.                                                             |

Edge danger warnings and elite labels use the same parchment chips and vermilion marks so
they stay readable over any ground.

## What is hidden and when

- Before the Blue Banner camp exists (`prologue-unestablished` on `#game-hud`), the clan
  leaf, expedition disclosure, clan bearing and camp command group are hidden. The authored
  prologue objective and open guidance note remain visible.
- **Develop camp** and **Pack & migrate** appear only after the camp exists and leave the bar
  during migration. Commands that apply but are not yet allowed stay visible and disabled.
- Camp pressure appears only while enemies approach the camp. The fresh loss line appears
  for ten active seconds after a hit; the running tally stays in the clan details.
- The optional field objective shows its title, bearing and reward; its full instruction is
  the tooltip. Prologue runs hide it until the prologue is complete.
- Under 600 px wide the ledger becomes a compact top strip, ability labels collapse to keys
  and costs, and `GameUI.layoutGuidance` keeps an opened note between the objective leaf and
  the bottom controls.

Every keybinding, element id, control and `aria` label from the earlier HUD is retained, so
browser regression tests keep their selectors. Interface motion stays in `src/motion.css`
and respects reduced-motion preferences; the HUD never duplicates run state.
