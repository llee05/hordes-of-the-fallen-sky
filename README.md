# Hordes of the Fallen Sky

A Mongolian-inspired nomadic civilization builder × mounted bullet heaven. **TypeScript + Phaser 3 + Electron + Vite.** The cities have fallen, the sky is going dark, and a small clan survives by moving. Build a people, defend their temporary home, and protect the caravan on its journey to the sacred heart of the steppe.

This playable prototype implements the brief’s smaller development scope: five buildings with two exclusive specializations each, abstracted population and workers, three resources, four regional arenas, five standard enemies, two elites, and one boss. The supernatural calamity and its creatures are original fantasy. A larger historical campaign, thousands of individually simulated units, and permanent civilization unlocks remain future work.

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

The game opens into a title menu over the painted steppe. The battlefield fills the entire game window. Compact resources and objectives sit at the top, with commander health, clan resolve, gallop, and a keyboard command dock near the bottom. Brief clan messages appear as notifications.

Press **Tab** or **J** (controller **View**) to open the clan chronicle. It pauses combat, physics, economy, and migration while you inspect the journey, buildings, workforce, formations, and learned traditions. Arrow keys switch its tabs; Escape or J returns to the battlefield. You can open camp development or choose an available migration route directly from the chronicle.

The title and pause menus contain **Settings** and **How to play**. Sound preference saves automatically. Fullscreen is available in Settings or with F11 / Alt+Enter. Escape backs out to the menu you came from; closing Settings during a paused expedition keeps that expedition paused. Native Quit game is available in the main and pause menus. Keyboard, mouse, controller, and touch-preview actions use the same scene-owned run state.

## The Living Steppe Tapestry

The game now uses a stylized painterly 2.5D presentation: golden brushwork grasslands, miniature mounted warriors, decorated ivory gers, turquoise and vermilion banners, and cold, unsettling calamity creatures. Soft shadows, ground-position depth sorting, drifting wind and snow, and parchment panels carry the direction through gameplay. All artwork ships locally. See [the art direction and generation prompts](docs/living-steppe-tapestry.md).

## Build, defend, migrate

Start with eight people, three horses, two gers, supplies, and a mounted commander with one accompanying rider. Attacks are automatic. Ride to collect spirit shards and learn clan traditions. Keep moving to build momentum, increasing arrow range and damage. Gallop grants brief invulnerability; in charging wedge, it also damages enemies you ride through.

Press **B** to develop your camp. Planning pauses the simulation, including food consumption, pasture depletion, enemies, and migration. Structures cost materials, sometimes spirit, and available workers. A constructed building can take one of two exclusive specializations. Your buildings travel with the clan.

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

An expedition is intended to take about 15 minutes with roughly three minutes of growth per camp. Earlier departures shorten the journey; longer stays increase danger. This is a prototype balance, not a fixed time limit.

## Controls

| Action                          | Keyboard / mouse                    | Standard controller           |
| ------------------------------- | ----------------------------------- | ----------------------------- |
| Ride                            | WASD / arrows                       | Left stick / D-pad            |
| Attack                          | Automatic                           | Automatic                     |
| Gallop                          | Space / Gallop button               | A                             |
| Develop camp                    | B / Develop camp                    | X                             |
| Pack and choose route           | M / Pack & migrate                  | Y                             |
| Cycle unlocked formations       | F / Formation button                | Right bumper                  |
| Clan chronicle                  | Tab / J / chronicle button          | View                          |
| Pause / resume / close planning | Escape / P                          | Start / B                     |
| Navigate menus                  | Tab / Shift+Tab                     | Stick / D-pad                 |
| Confirm                         | Enter / Space / click               | A                             |
| Choose tradition                | 1, 2, 3 / click                     | Navigate, then A              |
| Fullscreen                      | F11 / Alt+Enter / fullscreen button | —                             |
| Quit                            | Quit game / window close            | Navigate to Quit game, then A |

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
src/game/data/upgrades.ts      Stackable clan traditions
src/game/assets/painterlyArt.ts Shared painted atlases, sizing, collision alignment, effects
src/game/assets/SteppeLandscape.ts Painterly ground, riverbanks, weather, regional scenery
public/art/                   Bundled painted PNGs and atlas frame metadata
src/game/scenes/ArenaScene.ts  Simulation, mounted host, combat, regional arenas
src/ui/GameUI.ts               Full-window HUD, title/pause menus, focus and input
src/ui/menuContent.ts          Camp, route, chronicle, settings, and help panels
src/platform/                 Narrow native capability bridge and browser fallback
desktop/                      Secure Electron lifecycle and atomic profile storage
scripts/                      Build staging, packaging, icon, SteamPipe preparation
```

Actors use bounded pools and a spatial grid. Combat, economy, and physics stop in menus and on focus loss. Construction, route rewards, and earned tradition choices live in renderer-independent state modules. The renderer keeps sandboxing, context isolation, and disabled Node integration. `window.__gloam` remains a development-only test/inspection hook, absent from production.

## Checks

```sh
npm run check           # Formatting, both typechecks, unit tests, production build
npm run test:desktop    # Actual Electron against offline production files
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
npm run format
```

Browser tests cover keyboard, controller, touch, combat, traditions, planning, the Burning Tempest, caravan damage, route rewards, remote camp defense, three crossings, clan-survival victory, full-window layout, and paused chronicle/settings/help navigation. Electron tests exercise the offline build, layout, native save persistence, sandboxing, fullscreen, and quit using isolated saves. Tests never use normal save files. Linux needs a display session or Xvfb for Electron.

Further release work includes extended balancing and playtesting, target-hardware performance, a longer campaign, permanent unlocks, platform validation, release art, real Steamworks APIs, and Steam review.
