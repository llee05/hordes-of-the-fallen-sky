# Hordes of the Fallen Sky

A Mongolian-inspired nomadic civilization builder × mounted bullet heaven. **TypeScript + Phaser 3 + Electron + Vite.** The cities have fallen, the sky is going dark, and a small clan survives by moving. Build a people, defend their temporary home, and protect the caravan on its journey to the sacred heart of the steppe.

This playable prototype includes a complete two-act expedition: eight illustrated camp encounters with choices, four companions, three defended crossings, a final mountain stand, and an epilogue reflecting the people who arrive. Its civilization systems include five buildings with two exclusive specializations each, abstracted population and workers, three resources, four regional arenas, five standard enemies, two elites, and one boss. The supernatural calamity and its creatures are original fantasy. A larger historical campaign, thousands of individually simulated units, and permanent civilization unlocks remain future work.

Read [the world lore](lore.md) for the Tengri-inspired setting: Eternal Heaven, Etügen and the living land, the Last Court's Iron Vow, the unreturned, and the Blue Banner clan's search for refuge. Research notes separate the religious and cultural inspiration from the game's invented mythology.

See [the story architecture](story-architecture.md) for the two-act blueprint: Gather the Scattered, then Carry the Living. [The story prototype guide](docs/story-prototype.md) describes the playable adaptation, encounter triggers, choices, and current scope.

## Play and develop

Use **Node.js 22.12+** and npm.

```sh
npm install
npm run dev         # Desktop game with hot reload
npm run dev:web     # Optional browser preview
npm run build       # Compile renderer and desktop main/preload
npm start           # Play the offline desktop build
```

The packaged game includes its runtime, painted art, fonts, and synthesized sound. It makes no runtime asset downloads or AI calls. The desktop fills its window and provides fullscreen, quit, and durable native saves.

## Desktop presentation

The game opens at the title menu. **New Game** opens a skippable, five-chapter painted prologue adapted from [the world lore](lore.md#opening-slideshow): Heaven and Earth, the Iron Vow, the unreturned, the living hearth, and the road to the Heart of the Steppe. Read at your own pace with Continue / Enter / controller A; use Back or the left/right arrow keys to turn pages. Completing the prologue, Skip intro, Escape, or controller B / Start begins the expedition, opening the first camp scene when camp scenes are enabled. Every New Game starts with the prologue. Replay introduction at the title lets you read it independently; completing or skipping that replay returns to the title. Gameplay remains frozen throughout; reduced-motion preferences disable the gentle painting movement. See [the bundled paintings and generation prompts](docs/intro-artwork.md).

The title is embroidered across an indigo felt banner over the painted steppe. Woven rust-red trim, brass clan symbols, and warm manuscript pages carry the world's art into the interface. Camp cards reuse the painted gers, riders, and wagons from the battlefield; migration choices have illustrated landscape vignettes. All UI materials and artwork ship locally.

The battlefield fills the entire game window. Compact resources and objectives sit at the top, with commander health, clan resolve, gallop, and a keyboard command dock near the bottom. Brief clan messages appear as notifications.

The title cloth breathes gently, parchment menus settle into place, and illustrations respond to mouse or keyboard focus. Resource changes, damage, gallop readiness, and newly available migration routes have brief visual feedback. Controls respond immediately throughout. The operating system's reduced-motion preference disables interface animations and transitions, including when changed while the game is open.

Press **Tab** or **J** (controller **View**) to open the clan chronicle. It pauses combat, physics, economy, and migration while you inspect the journey, buildings, workforce, formations, and learned traditions. Arrow keys switch its tabs; Escape or J returns to the battlefield. You can open camp development or choose an available migration route directly from the chronicle.

The title and pause menus contain **Settings** and **How to play**. Sound preference saves automatically. Fullscreen is available in Settings or with F11 / Alt+Enter. Escape backs out to the menu you came from; closing Settings during a paused expedition keeps that expedition paused. Native Quit game is available in the main and pause menus. Keyboard, mouse, controller, and touch-preview actions use the same scene-owned run state.

## The Living Steppe Tapestry

The game now uses a stylized painterly 2.5D presentation: golden brushwork grasslands, miniature mounted warriors, decorated ivory gers, turquoise and vermilion banners, and cold, unsettling calamity creatures. Soft shadows, ground-position depth sorting, drifting wind and snow, and parchment panels carry the direction through gameplay. All artwork ships locally. See [the art direction and generation prompts](docs/living-steppe-tapestry.md).

The commander, allied archers, and all six creature designs have painted sprite animation: four gait or hovering frames and two attack poses each. Riding speed drives the gait, galloping quickens it, and actual volleys, charges, and strikes trigger release poses. Hits briefly tint the character; defeated enemies fade through a small visual pool after their collision bodies leave immediately. Character animation and these effects freeze in every paused run phase. See [the sprite sheets, registration, and generation prompts](docs/character-animation.md).

## Build, defend, migrate

Camp scenes are **On** by default. Saran the hearthkeeper, Boro the herder, Erden the tally keeper, and Nara the youngest survivor travel through the story with the Blue Banner clan. Conversations pause the world and offer two responses, each with a displayed resource benefit. Escape / controller B continues without choosing. Turn **Camp scenes: Off** at the title for uninterrupted combat; this preference lasts through run restarts in the current app session.

Act I crosses Golden Pasture and Silent River. Arrival at Broken Pass begins Act II, followed by the Heart of the Steppe. The chronicle's **Our story** tab keeps the actual conversations and decisions from the current expedition. Pause, victory, and defeat menus also offer **Our remembered road**. Read-only memories never restart simulation or grant a choice again.

Start with eight people, three horses, two gers, supplies, and a mounted commander with one accompanying rider. Attacks are automatic. Ride to collect spirit shards. Each level banks a knowledge point without interrupting combat. Press **T** (controller **LB**) or use the HUD to open the paused **Patron tech tree**, inspect every branch, and spend points on the ranks you choose. Eight patrons support hunting, civilisation, archery, survival, terrain control, ancestral summons, army leadership, and defensive construction. Each has a two-rank foundation, two practices, and a capstone; mix patrons freely. You can leave with unspent points and return later. Categories and search help you find branches. The tree is also accessible from Pause and the chronicle’s Traditions tab. Keep moving to build momentum, increasing arrow range and damage. Gallop grants brief invulnerability; in charging wedge, it also damages enemies you ride through.

Press **B** to open the **camp upgrade tree**. Planning pauses the simulation, including food consumption, pasture depletion, enemies, and migration. Preview every building and development, including costs, worker requirements, prerequisites, and exclusive choices. Search or filter by category, then purchase a highlighted node. The five current buildings each have two exclusive specializations; the interface and purchase rules support additional choices and deeper tiers through content definitions. Your buildings travel with the clan.

| Building         | What it adds                                        | Specializations                                                        |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------- |
| Family gers      | Families and faster material gathering              | Hearthkeepers repair clan resolve; refugee beacons welcome more people |
| Archery grounds  | Three mounted archers, encirclement, charging wedge | Fire arrows or veteran riders                                          |
| Herding grounds  | Horses, food production, feigned retreat            | Faster remount herds or food-preserving winter stores                  |
| Spirit sanctuary | Lightning strikes against nearby enemies            | Wind shamans or an ancestral camp guardian                             |
| Wagon circle     | Defensive volleys, including during migration       | Triple-volley war carts or protective felt armor                       |

**Fire arrows + wind shamans = the Burning Tempest:** curving, flaming arrow fans with lingering burn damage. Military, spiritual, and migration decisions gradually establish the Iron Horde, Children of the Eternal Sky, or Wandering Nation identity.

Pastures deplete and spawn pressure increases while you stay. After 45 active seconds at a camp, press **M** to inspect routes. You choose when to leave. Stay to gather materials and grow, or pack up before grazing and provisions run out. Refugees strengthen your host but consume food. Starvation and attacks can cost families and livestock; losing all people or clan resolve ends the run.

Choose a river crossing for food and horses, an exposed ridge for materials and spirit, or blue banners for refugees and veteran riders. **Rewards arrive only after a successful crossing.** The caravan travels east automatically; ride alongside it and defend the supply carts. Structures cannot be developed while packed. Arrival restores some resolve and commander health, refreshes the pasture, and preserves your build and uncollected XP.

The journey crosses the Golden Pasture, Silent River, Broken Pass, and Sacred Mountain. The White Silence reduces grazing and caravan speed. Ground eruptions in the pass warn before striking. The Red Eclipse weakens rituals and brings the Skybreaker. At the mountain, protect your people for three minutes until the passage opens. **Victory depends on saving the clan; killing the boss is optional.** Defeating it restores resolve.

In a story expedition, victory opens **A place beside the fire**, a skippable epilogue reflecting survivors, recorded losses, clan identity, the clerk's shared tally, and the Skybreaker's fate. Journey results follow, with the epilogue available to read again. Story choices and memories reset with each new expedition; they do not add permanent unlocks or a resumable save.

An expedition is intended to take about 15 minutes with roughly three minutes of growth per camp. Earlier departures shorten the journey; longer stays increase danger. This is a prototype balance, not a fixed time limit.

For a detailed reference to resources, combat, enemies, progression, and both upgrade trees, see [the game mechanics brief](docs/game-mechanics.md). For all 32 technologies and 40 ranks, see [the patron tech tree](docs/patron-tech-tree.md). For adding progression content and extending the UI, see [the progression UI guide](docs/progression-ui.md).

## Controls

| Action                          | Keyboard / mouse                     | Standard controller           |
| ------------------------------- | ------------------------------------ | ----------------------------- |
| Ride                            | WASD / arrows                        | Left stick / D-pad            |
| Attack                          | Automatic                            | Automatic                     |
| Gallop                          | Space / Gallop button                | A                             |
| Develop camp                    | B / Develop camp                     | X                             |
| Pack and choose route           | M / Pack & migrate                   | Y                             |
| Cycle unlocked formations       | F / Formation button                 | Right bumper                  |
| Clan chronicle                  | Tab / J / chronicle button           | View                          |
| Pause / resume / close planning | Escape / P                           | Start / B                     |
| Navigate menus                  | Tab / Shift+Tab                      | Stick / D-pad                 |
| Confirm                         | Enter / Space / click                | A                             |
| Patron tech tree                | T / Tech tree button                 | Left bumper                   |
| Learn a rank                    | Navigate, then Enter / Space / click | Navigate, then A              |
| Fullscreen                      | F11 / Alt+Enter / fullscreen button  | —                             |
| Quit                            | Quit game / window close             | Navigate to Quit game, then A |

Caravan guard keeps riders near the clan and reduces clan damage. Encirclement circles nearby enemies and rewards moving fire. Charging wedge follows your commander and turns gallop into an attack. Feigned retreat spreads riders, accelerates moving volleys, and gathers shards from farther away. Touch preview supports dragging to ride and tapping command buttons.

Controllers use the standard Gamepad mapping, including Steam Input’s emulated mapping. Physical controllers, Steam Input configurations, Steam Deck performance, and target platforms still need release testing.

## Packaging and saves

```sh
npm run package:linux
npm run package:win
```

Complete depots appear under `release/HordesOfTheFallenSky-linux-x64/` and `release/HordesOfTheFallenSky-win32-x64/`. Distribute the **entire directory**, including runtime libraries and `resources/app.asar`. Packaging stages only compiled files, generated icons, and license notices; development files and dependencies are excluded.

See [steam/README.md](steam/README.md) for SteamPipe preparation, launch paths, and cloud setup. Uploads and publishing remain separate. No fake App ID or Steamworks integration is included.

To preserve existing profiles, native saves retain the original internal **Gloam** data directory:

| OS      | Save file                                                |
| ------- | -------------------------------------------------------- |
| Windows | `%APPDATA%/Gloam/saves/profile.json`                     |
| Linux   | `${XDG_CONFIG_HOME:-~/.config}/Gloam/saves/profile.json` |
| macOS   | `~/Library/Application Support/Gloam/saves/profile.json` |

Longest journey and sound preference persist. Writes are validated, serialized, and atomically renamed. Native saves never use the install directory or localStorage. Browser preview saves remain separate. A run itself is not resumable after quitting.

## Project map

```text
src/game/config.ts             Balance, world, and journey timings (seconds)
src/game/types.ts              Run, clan, and snapshot contracts
src/game/state/run.ts          Experience, traditions, run lifecycle
src/game/state/clan.ts         Economy, construction, migration, victory
src/game/data/clan.ts          Buildings, specializations, routes, regions, formations
src/game/data/enemies.ts       Five enemies, two elites, and the Skybreaker
src/game/data/patrons.ts       Eight patrons, playstyles, symbols, and descriptions
src/game/data/upgrades.ts      Patron technologies, ranks, and prerequisites
src/game/state/patrons.ts      Neutral patron effects, damage, recovery, and revival
src/game/systems/PatronSupport.ts Ancestral riders, slowing fields, pulse, and camp ward
src/game/assets/painterlyArt.ts Shared painted atlases, sizing, collision alignment, effects
src/game/assets/SteppeLandscape.ts Painterly ground, riverbanks, weather, regional scenery
public/art/                   Bundled painted PNGs and atlas frame metadata
src/game/scenes/ArenaScene.ts  Simulation, mounted host, combat, regional arenas
src/ui/GameUI.ts               Full-window HUD, title/pause menus, focus and input
src/ui/menuContent.ts          Camp, route, chronicle, settings, and help panels
src/ui/progressionTree.ts      Shared data-driven progression tree renderer
src/ui/researchContent.ts      Patron branches, ranks, and research state
src/ui/campContent.ts          Camp nodes, prerequisites, costs, and exclusive paths
src/platform/                 Narrow native capability bridge and browser fallback
desktop/                      Secure Electron lifecycle and atomic profile storage
scripts/                      Build staging, packaging, icon, SteamPipe preparation
```

Actors use bounded pools and a spatial grid. Combat, economy, and physics stop in menus and on focus loss. Construction, route rewards, and banked knowledge points live in renderer-independent state modules. The renderer keeps sandboxing, context isolation, and disabled Node integration. `window.__gloam` remains a development-only test/inspection hook, absent from production.

## Checks

```sh
npm run check           # Formatting, both typechecks, unit tests, production build
npm run test:desktop    # Actual Electron against offline production files
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
npm run format
```

Browser tests cover keyboard, controller, touch, combat, traditions, planning, the Burning Tempest, caravan damage, route rewards, remote camp defense, three crossings, clan-survival victory, full-window layout, and paused chronicle/settings/help navigation. Electron tests exercise the offline build, layout, native save persistence, sandboxing, fullscreen, and quit using isolated saves. Tests never use normal save files. Linux needs a display session or Xvfb for Electron.

Further release work includes extended balancing and playtesting, target-hardware performance, a longer campaign, permanent unlocks, platform validation, release art, real Steamworks APIs, and Steam review.
