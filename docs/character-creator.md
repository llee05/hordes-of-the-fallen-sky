# Character creation

Run `npm run dev` and choose **New Game** on the title screen. The creator is a
full-screen interactive manuscript modeled on the project concept sheet. Its live
controls select the Khan's name, gender, age, voice, face, hairstyle, headgear,
clothing colour, origin, combat class, oath, mount, and clan standard. The centre
illustration changes with the four classes and two genders. **Begin Journey**
starts the expedition; Escape, controller B, or the small **Back** action returns
to the title without starting simulation.

The name accepts up to 28 characters. **Random name** chooses from the local
gender-specific name list. A default or newly randomized name follows a gender
change; a name the player typed does not. An empty or whitespace-only name keeps
Begin Journey focusable so it can return focus to the field and announce the
problem. The four classes are Mounted Archer, Lancer, Iron Pagoda, and Spirit
Caller. Class choice determines the starting combat kit and progression.

All other creator choices are currently cosmetic profile data. They are clickable,
validated, saved, and restored, but do not grant resources, stats, or camp effects.
The origin's **Starting Bonus** list and the class's **Key Traits** panel are
descriptive preview copy only. Old profiles that predate age, voice, and face are
accepted and receive stable defaults during normalization. Character creation
never changes or overwrites an existing saved expedition.

The last profile used to begin a journey is remembered through `GamePlatform`.
Old profiles without character data open with shared defaults. Simulation and
physics remain stopped throughout character creation.

## Controls and ownership

Pointer, touch, Tab, arrow-key/controller navigation, Enter/controller confirm,
and Escape/controller back share the scene-owned menu actions. Radio groups use
roving focus, and left/right input moves between visible choices. At desktop sizes
all panels stay on one page. At 390×844 the central illustration, name, and Begin
Journey appear first, followed by the panels in a scrollable chronicle.

`state/characterCreator.ts` owns the draft-to-profile mapping, validated option
changes, and random names. `ArenaScene.characterCreator` owns the draft; `GameUI`
renders it and sends actions. Begin Journey creates a fresh run through
`createRun(tradition, profile)`, applies the selected class loadout once, saves the
full profile, then begins normal gameplay and checkpointing.

The creator reads class descriptions from `data/classes.ts`, manuscript preview
copy from `src/ui/creator/characterCreatorOptions.ts`, and option IDs from the
shared character contract. Its DOM lives in
`src/ui/creator/characterCreatorContent.ts`; responsive layout and manuscript
materials live in `src/character-creator.css`. See the
[illustration record](character-creator-art.md) for the bundled art.

`tests/unit/characterCreator.test.ts` checks mapping, independent snapshots,
defaults, invalid IDs and names, random names, and every class/gender illustration.
`tests/unit/classesAndProfile.test.ts` covers migration defaults and verifies that
origin and oath remain cosmetic. `tests/e2e/character-creator.spec.ts` documents
the affected browser coverage; it is not run without explicit approval.
