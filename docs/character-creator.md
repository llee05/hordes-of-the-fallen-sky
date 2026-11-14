# Character creation

Run `npm run dev` and choose **New Game** on the title screen. The parchment-scroll
creator chooses the Khan's name, gender, and one of four combat classes. The class
details show its role, key traits, and four numbered abilities beside an animated
mounted preview. **Begin Journey** starts the expedition at Mount Otgontenger;
Escape, controller B, or **Back to title** returns without starting simulation.
The current draft remains available until the scene restarts.

The name accepts up to 28 characters. **Random name** chooses from the local
gender-specific name list. A default or newly randomized name follows a gender
change; a name the player typed does not. An empty or whitespace-only name keeps
Begin Journey focusable so it can return focus to the field and announce the
problem. The four classes are Mounted Archer, Lancer, Iron Pagoda, and Spirit
Caller. Class choice determines the initial combat kit and progression.

The profile contract still retains legacy appearance, background, oath, mount,
and banner fields for save compatibility. The scroll does not currently expose
those fields, so a new profile uses their shared defaults and a remembered profile
keeps its stored values. Character creation never changes or overwrites an existing
saved expedition. Class and gender select matching rider art in the creator and
battlefield.

The last profile used to begin a journey is remembered through `GamePlatform`.
Old profiles without character data open with shared defaults. Simulation and
physics remain stopped throughout character creation.

## Controls and ownership

Pointer, touch, Tab, arrow-key/controller navigation, Enter/controller confirm,
and Escape/controller back share the scene-owned menu actions. The creator keeps
all controls inside the fixed-aspect painted scroll at supported desktop sizes.

`state/characterCreator.ts` owns the draft-to-profile mapping, validated option
changes, and random names. `ArenaScene.characterCreator` owns the draft; `GameUI`
renders it and sends actions. Begin Journey creates a fresh run through
`createRun(tradition, profile)`, applies the class and legacy default loadout once,
saves the profile, then begins normal gameplay and checkpointing.

The creator reads class descriptions, ability text, option IDs, and profile values
from `data/classes.ts` and the shared character contract. Its DOM lives in
`src/ui/creator/characterCreatorContent.ts`; shared ornament and ability marks live
in `src/ui/creator/components.ts`; the canvas preview lives in
`src/ui/creator/riderPreview.ts`. See [the illustration record](character-creator-art.md)
for the bundled art and presentation limits.

`tests/unit/characterCreator.test.ts` checks mapping, independent snapshots,
defaults, invalid IDs and names, random names, and loadout integration.
`tests/e2e/character-creator.spec.ts` selects the visible controls, starts a
non-default class, checks the actual run profile, reloads the remembered profile,
and covers focus, Back, and frozen gameplay time. The desktop creator spec checks
the same screen through the native save bridge at 1280×800.
