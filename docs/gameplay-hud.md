# Gameplay HUD

The battlefield HUD is a painted manuscript laid over the steppe. Every leaf shares the
character creator's palette and typography: parchment with a double vermilion rule and
a gilt inner line, scroll-cut ribbon headers, Cormorant Garamond titles and numbers, and
DM Sans ink for small text. The rules live in `src/hud.css`; the markup and live values
stay in `src/ui/GameUI.ts`, and the strings it places come from the renderer-independent
`src/ui/hudContent.ts`, which `tests/unit/hudContent.test.ts` covers.

## Leaves

| Leaf                | Where         | Shows                                                                                                                     |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| The Clan            | top left      | People, herd, food, materials and spirit as glyph and number; net food and the stores forecast on one line.               |
| Clan details        | inside above  | Doctrine, riders and assigned workers, and the running loss tally. Collapsed; the round `▾` button opens it.              |
| The hour            | top centre    | Active time and the stage (prologue chapter, Encampment, The Great Flight) in a scroll cartouche.                         |
| Chronicle and pause | top right     | Two parchment buttons with their key badges (`Tab`, `Esc`).                                                               |
| Objective           | right         | Ribbon with the location or prologue chapter and the day; the objective sentence; pasture and calamity meters; the hint.  |
| Dispatches          | in objective  | Camp pressure, the fresh clan loss, major-loss notices, the current wave and countdown, the optional objective, warnings. |
| Guidance            | left          | The current tip with its actions and **Hide tips** (`src/ui/guidanceContent.ts`).                                         |
| The Khan            | bottom left   | Level ribbon with the XP meter and banished count, then health, clan resolve, weapon, charge and spirit energy.           |
| Saddle bar          | bottom centre | Four ability slots, a rule, then **Develop camp**, the formation and **Pack & migrate** with their key badges.            |
| Gallop and zoom     | bottom right  | The gallop button with its recharge line and a thin zoom strip above it.                                                  |
| Chronicle toast     | above the bar | Clan messages on a parchment strip for seven seconds.                                                                     |
| Succession          | centre        | The successor choice while a new Khan is chosen.                                                                          |

Edge danger warnings and elite labels use the same parchment chips and vermilion marks so
they stay readable over any ground.

## What is hidden and when

- Before the Blue Banner camp exists (`prologue-unestablished` on `#game-hud`), the clan
  leaf, the pasture and calamity meters, camp dispatches, the clan bearing and the whole
  command group are hidden; the guidance note moves to the top left corner.
- **Develop camp** and **Pack & migrate** leave the bar during a migration; the formation
  button appears only once a second formation is unlocked. Commands that apply but are not
  yet allowed stay visible and disabled.
- Camp pressure appears only while enemies approach the camp. The fresh loss line appears
  for ten active seconds after a hit; the running tally stays in the clan details.
- The optional field objective shows its title, bearing and reward; its full instruction is
  the tooltip. Prologue runs hide it until the prologue is complete.
- Under 600 px wide the hint, camp pressure and optional objective are hidden and the
  guidance note is positioned by `GameUI.layoutGuidance` below the objective leaf and above
  the gallop button.

Every keybinding, element id, control and `aria` label from the earlier HUD is retained, so
browser regression tests keep their selectors. Interface motion stays in `src/motion.css`
and respects reduced-motion preferences; the HUD never duplicates run state.
