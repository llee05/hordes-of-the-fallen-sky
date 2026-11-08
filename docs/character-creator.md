# Character creation

Run `npm run dev` and choose **New Game** on the title screen. **Begin Journey**
starts the expedition at Golden Pasture with the chosen profile. Starting clan
traditions still select the clan's opening arrangement before character creation.
Escape, controller B, or **Back to title** returns without starting simulation;
the current draft remains available until the scene restarts.

The creator uses manuscript panels around a painted figure:

- **Identity:** woman or man, with one predefined face for each gender.
- **Appearance:** five hairstyles, five headgear options, seven clothing colours.
  The portrait updates with gender and hairstyle; selected headgear appears in an
  inset. The figure updates with class and gender, with a cloth-colour sample.
- **Background (Origin):** five origins, each with its description and starting bonus.
- **Class / Combat Tradition:** four class cards with descriptions and key traits.
- **Oath:** three oaths with their descriptions and benefits.
- **Mount:** five painted coat previews.
- **Banner:** five emblems, six field colours, and five trim patterns with a preview.
- **Name:** a name up to 28 characters and a gender-appropriate random-name button.
  Empty or whitespace-only names disable Begin Journey.

The last profile used to begin a journey is remembered by `GamePlatform`. Old
profiles without character data open with the shared defaults. Character creation
never changes or overwrites an existing saved expedition. Cosmetic choices are
stored with the run; their battlefield presentation is owned by the class artwork
workstream.

On desktop, identity and origin sit left, the figure and name in the center, and
combat tradition, oath, mount and banner right. Each side column can scroll if
needed. On narrow viewports the panels stack in one scroll area while Begin Journey
stays visible. Buttons support pointer/touch, Tab and arrow navigation, and existing
controller menu navigation (D-pad/stick to browse, A to activate, B to return).

## Ownership and reuse

`state/characterCreator.ts` owns draft-to-profile mapping, validated option changes,
and random names. `ArenaScene.characterCreator` owns the draft; the DOM renders it
and sends actions. Simulation and physics remain stopped in the `character` phase.
Begin Journey creates a fresh run through `createRun(tradition, profile)`, applies
its class/origin/oath loadout once, saves the profile through the platform, then
begins normal gameplay and checkpointing.

The creator reads all descriptions, bonuses, option IDs, colour values, and class
traits from `data/classes.ts` and the shared character contract. No balance values
or profile IDs are defined in UI code. Reusable panel frames, option carousels,
radio-style button lists, swatch rows, and painted atlas cells live in
`src/ui/creator/components.ts`. See [the illustration record](character-creator-art.md)
for atlas registration, generation briefs, and presentation limits.

`tests/unit/characterCreator.test.ts` checks mapping, independent snapshots, legacy
defaults, invalid IDs/names, random names, and loadout integration.
`tests/e2e/character-creator.spec.ts` walks every option, starts a non-default class,
checks the actual run profile and stats, reloads the remembered profile, and tests
narrow layout, focus, keyboard start, Back, and frozen gameplay time.
