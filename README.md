# Hordes of the Fallen Sky

A Mongolian-inspired nomadic civilization builder × mounted bullet heaven. **TypeScript + Phaser 3 + Electron + Vite.** The cities have fallen, the sky is going dark, and a small clan survives by moving. Build a people, defend their temporary home, and protect the caravan on its journey between the sacred places of the steppe.

This playable prototype contains eight real places to camp at and migrate between, with a journey results summary when the clan is lost. Journey chapters, crossing encounters and the final stand have been removed while a new run structure is designed. Its civilization systems include five permanent camp households and five optional workplaces chosen from fourteen building types, abstracted population and workers, three resources, five shared standard enemies, two shared elites, and 16 local enemy variants. The supernatural calamity and its creatures are original fantasy. A larger historical campaign, thousands of individually simulated units, and broader campaign unlocks remain future work.

Archived narrative documentation from the earlier story prototype is kept in [`docs/archive/story/`](docs/archive/story/README.md) as reference for a future story rework, including [the world lore](docs/archive/story/lore.md).

## Play and develop

Use **Node.js 22.12+** and npm.

```sh
npm install
npm run dev         # Desktop game with hot reload
npm run dev:web     # Optional browser preview
npm run build       # Compile renderer and desktop main/preload
npm start           # Play the offline desktop build
```

Development builds include **Developer mode** in the title and pause menus. Press
**F8** from any screen to open the level selector: jump to a fresh camp at any of
the eight real places. Each choice starts a fresh test expedition with supplies.
Escape / F8 closes the selector and returns to the previous screen. Developer runs
do not change your saved longest journey.
Start a new run to return to normal play. The selector is absent from production
and packaged builds. See [developer mode](docs/developer-mode.md) for checkpoint rules and the temporary
class picker.

Press **Backtick** (<kbd>&#96;</kbd>) to open the developer console directly over
the game; **F10** is an alternate shortcut. Use **`invincible on`** (or `god on`)
to protect the Khan and **`clan-invincible on`** to protect clan resolve, people,
and livestock from attacks and starvation. Use `off` to restore normal losses,
and `help` to list commands. Both toggles carry between developer checkpoints and
clear on a normal new run. The console pauses gameplay while open.
Press **Up** to recall older commands and **Down** to move forward or restore your
unfinished input. The latest 40 commands are remembered across checkpoints,
new games, and app restarts; saved commands do not execute automatically.

The packaged game includes its runtime, painted art, fonts, and recorded sound. It makes no runtime asset downloads or AI calls. The desktop fills its window and provides fullscreen, quit, and durable native saves.

For the static browser release, run `npm run build:web` and then `npm run test:pages`
with Playwright Chromium installed. The production smoke tests use the GitHub Pages
project subpath. See [browser release and GitHub Pages instructions](docs/github-pages.md)
for preview commands, browser saves, and release verification.
The **GitHub Pages** workflow checks pull requests and deploys successful `main`
builds once the repository's Pages source is set to **GitHub Actions**.

## Desktop presentation

The game opens at the title menu. **New Game** opens [character creation](docs/character-creator.md). Choose identity, appearance, origin, combat tradition, oath, mount, banner and name, then **Begin Journey** starts the expedition at Mount Otgontenger. The last character profile is remembered.

The title is embroidered across an indigo felt banner over the painted steppe. Woven rust-red trim, brass clan symbols, and warm manuscript pages carry the world's art into the interface. Camp cards reuse the painted gers, riders, and wagons from the battlefield; migration choices have illustrated landscape vignettes. All UI materials and artwork ship locally.

The battlefield fills the entire game window. Zoom with the mouse wheel, + / − (including the number pad), or controller RT / LT. The on-screen − / percentage / + controls offer the same actions; click the percentage, press 0, or click the right stick to reset to 100%. Zoom ranges from 60% to 160% and keeps the interface readable at its original size. It is available during active play, follows the Khan or caravan during succession, and carries across new expeditions for the app session. Compact resources and objectives sit at the top, with Khan health, clan resolve, gallop, and a keyboard command dock near the bottom. Brief clan messages appear as notifications. Dismissible contextual guidance teaches riding, camp development, shards, formations, and the first migration through actual actions. Hide tips in the field or restore them from How to play; the preference lasts for the app session. Persistent food, resolve, population, and pasture warnings remain visible when tips are hidden.

The title cloth breathes gently, parchment menus settle into place, and illustrations respond to mouse or keyboard focus. Resource changes, damage, gallop readiness, and newly available migration routes have brief visual feedback. Controls respond immediately throughout. The operating system's reduced-motion preference disables interface animations and transitions, including when changed while the game is open.

During play, press **Tab** or **J** (controller **View**) to open the clan chronicle. Its **The journey** and **Your clan** tabs show locations, buildings, workforce, formations, Khans, and factual memories while simulation is paused. Arrow keys switch focused tabs; Escape or J closes the chronicle. You can open camp development or choose an available migration route directly from it during an ongoing expedition. After defeat, use **Clan chronicle** on the results screen to inspect the records; closing it returns to those results. Tab and Shift+Tab navigate menu controls.

The title and pause menus contain **Settings** and **How to play**. Mute and separate music, ambience, combat, and interface levels save automatically. Settings also offers five recorded reference auditions. Fullscreen is available in Settings or with F11 / Alt+Enter. Escape backs out to the menu you came from; closing Settings during a paused expedition keeps that expedition paused. Native Quit game is available in the main and pause menus. Keyboard, mouse, controller, and touch-preview actions use the same scene-owned run state.

The sound palette uses licensed recordings of recurve bows, real horse contacts, paper, leather, wood, metal, frame drums, wind, water, and campfire. Layered events choose shuffled takes with subtle variation; sound remains bounded during large battles. Four buses provide separate music, ambience, combat, and interface controls. Long environmental passages crossfade as biome, combat and camp context change; menus freeze movement cadence. All recordings and their CC0 provenance ship locally. Recorded music and additional horse, cloth, wildlife and region-specific material are explicit pending asset slots; no electronic fallback fills them. See [the audit](docs/audio-audit.md) and [the sound design guide](docs/sound-design.md) for the five references, licences, architecture, and remaining recording work.

## The Living Steppe Tapestry

The game now uses a stylized painterly 2.5D presentation: golden brushwork grasslands, miniature mounted warriors, decorated ivory gers, turquoise and vermilion banners, and cold, unsettling calamity creatures. Soft shadows and parchment panels carry the direction through gameplay. Visible camp workers carry felt between shared stores and established workplaces. A bounded pack herd grazes at camp and walks with the caravan. Additional households raise more shelters, while losses reduce the visible group. Packing briefly folds the old camp into the travelling carts while departure begins immediately. These visual representatives use the existing population and worker assignments; they do not add a second economy. All artwork ships locally. See [the art direction and generation prompts](docs/living-steppe-tapestry.md).

Every location has two native enemy variants alongside familiar shared unreturned. Terrain rules distinguish woodland ambushes, glacial frost, cliff-foot rockfall, exposed-spire crosswinds, cinder falls, granite shelter, and reed-bank mire. Destination previews and the chronicle explain local enemies and their counters before departure. Native variants reuse the existing painted animation sets with palette accents and distinct attack patterns; dedicated creature artwork can replace those clips later. See [area encounters and enemy rosters](docs/area-encounters.md).

Every location has a distinct painted landscape: snowy peaks, forested foothills, glaciers, a marble spire, volcanic steppe, granite desert, and braided river pasture. Terrain colors, vegetation, watercourses, landmark silhouettes, and atmosphere follow the chosen place. Migration cards preview the same scenery before departure. See [the location landscape catalog](docs/location-landscapes.md).

Mount Otgontenger has connected ridges, terraces,
rock shelves, snowy summits, and broad winding passes. Full cliff faces, contact
occlusion, and cast shadows communicate height around open camp and caravan space.
Rubble gathers below cliffs, scrub occupies shelves, and sparse conifers stay low.

Angled 2.5D scenes render across all eight destinations. An orthographic
Three.js world supplies raised shelves, vertical cliff faces, snowfields,
shadows, river gorges, and timber crossings. Existing painted characters and camps
stand on the terrain while Phaser retains physics, combat, and animation. Riding
follows screen directions. F6 changes camera angle, F7 isolates terrain, and F9
cycles debug views in development. WebGL is required, including on software GPUs;
there is no flat terrain mode. Older saved terrain preferences load into the angled
world while preserving other settings. See [the angled scene guide](docs/world-3d.md)
and [painted asset prompts](docs/angled-scene-art.md) for the bundled artwork.
The [environment quality guide](docs/environment-quality.md) describes painted material blending,
weathered cliffs, shared riverbeds and shores, clustered vegetation, and render budgets.

The Khan, allied archers, and all six creature designs have painted sprite animation: four gait or hovering frames and two attack poses each. Riding speed drives the gait, galloping quickens it, and actual volleys, charges, and strikes trigger release poses. Hits briefly tint the character; defeated enemies fade through a small visual pool after their collision bodies leave immediately. Character animation and these effects freeze in every paused run phase. See [the sprite sheets, registration, and generation prompts](docs/character-animation.md).

Choose **Starting tradition** at the title to compare Shared hearth, Outrider circle, Hearthkeepers, and Pathfinders. Their riders, protection, movement, and starting-store tradeoffs change the opening while every facility remains available. The chosen preparation persists through the expedition and full saves. See [starting clan traditions](docs/starting-traditions.md).

Brass elite/armour labels, directional offscreen danger warnings, and brief named-cause clan-loss messages make crowded combat easier to read. Settings offers saved **Projectile contrast**, **Effect density** and **3D resolution** (Automatic or 100%) controls; Minimal keeps combat warnings visible while removing decorative bursts and dust. See [combat readability](docs/combat-readability.md).

Per-stage expedition milestones appear in the chronicle and results. In development, `metrics` prints observations and `benchmark` compares all four starting arrangements under riding, guarding and early-migration schedules. The twelve fixed-length pressure checks exercise real economy and progression with modelled combat exposure. See [pacing and balance checks](docs/expedition-pacing.md).

## Build, defend, migrate

The expedition begins at Mount Otgontenger. From any camp, the clan can migrate to any of the other seven real places: **Mount Otgontenger, Bogd Khan Uul, Altai Tavan Bogd, Khan Tengri Peak, Mount Belukha (Üch-Sümer), Altan Ovoo, Eej Khairkhan, and Orkhon Valley**, including ones it left earlier. Press M after routes open, choose a camp, then choose a river, ridge, or rescue route. Each place has its own gathering and travel modifiers, shown alongside its cultural context and destination-specific food forecasts. The HUD, camp, chronicle, and Khan records retain the actual location. These are stylized camps in the surrounding landscapes, with compressed travel geography; real sacred places remain distinct from the invented calamity. See [destinations, rules, and cultural sources](docs/migration-locations.md).

There are no journey chapters, crossing encounters, or final stand for now, and no victory condition: the expedition continues until the clan's people or resolve run out. The chronicle's **Your clan** tab records each Khan’s time carrying the banner, the host’s victories during that tenure, and factual clan memories (camp work, departures, arrivals, losses, and succession). The record retains the latest 96 clan moments and 64 Khans, with total counts visible.

Start with eight people, three horses, two gers, supplies, and a mounted Khan with one accompanying rider. Attacks are automatic. Ride to collect spirit shards and gain XP levels without interrupting combat. Keep moving to build momentum, increasing arrow range and damage. Gallop grants brief invulnerability; in charging wedge, it also damages enemies you ride through. XP levels also grant automatic [class progression bonuses](docs/game-mechanics.md#playable-classes). Camp development is the sole progression interface; patron research and knowledge points have been removed for now. Spirit remains the camp currency earned from kills.

Press **B** to visit the illustrated **nomadic camp**. Five permanent core households begin at level 1: **Khan's Ger, Horse Lines, Herding Grounds, Communal Hearth and Wagon Yard**. Choose five different workplaces from fourteen military, economy, survival, spiritual and cultural buildings for the five optional locations. Every building has three levels, a visible upgraded appearance, authored costs and effects, and a compact parchment inspector. The Khan's Ger governs population capacity and higher building levels. Search and Provisions stay within the same painted map; Escape/controller Back closes a popover before leaving. Planning freezes the world. Unsupported mount, equipment, companion, trading and corruption benefits are recorded as **Planned** data rather than simulated systems.

Purchases and completed migrations save the portable camp checkpoint. **Continue clan camp** restores its choices, levels and actual supplies into a fresh expedition; **Continue expedition** restores the whole battle and journey. Old facilities map to their corresponding new buildings, while retired tiers, internal ranks and craft branches are refunded once. See [the nomadic camp guide](docs/nomadic-camp.md) for the complete catalog, effects, prices and migration mapping.

**Advanced Fletcher's Workshop + Shaman's Ger = the Burning Tempest:** enhanced flaming volleys with lingering burn damage. See [combat rules](docs/game-mechanics.md#camp-attacks-and-burning-tempest) for class-specific behavior.

**The Khan is a title carried by successive leaders.** If he falls, the clan spends **10 active seconds choosing a new Khan** while riders and camp defenses keep fighting. A visible countdown marks succession. The successor returns at the current camp or moving caravan with full maximum health, a ready gallop, and 3 seconds of protection. During the countdown, optionally choose an outrider (+5% riding speed) or hearthguard (8% less Khan damage) using 1 / 2, controller left / right, or the HUD. Their trait lasts for that generation; leaving the choice alone returns an unmodified successor. All resources and buildings, and journey progress carry on. Menus pause the countdown. Losing the clan’s people or resolve still ends the expedition.

A portable barricade of lashed wooden hurdles and indigo and rust felt bands surrounds the camp. It expands around growing households and workplaces, then travels as low wheeled screens around the caravan. Enemies stop at its edge and repeatedly attack clan resolve until defeated; hostile shots strike the barrier itself. Struck panels briefly jolt and brighten, and worn wood and frayed cloth reflect low resolve. Your Khan, riders, and camp defenses can still defeat the attackers. Packing up makes attackers pursue the moving caravan again when it leaves their reach. The barricade uses the clan's existing resolve and protection rather than a separate health pool.

Battles alternate warned assaults, featured enemies, and recovery windows. Optional supply carts, loose herds, stranded households, and enemy gatherings invite short rides away from camp. Terrain-aware enemies use the current area’s passes, ramps, dry ground, and river crossings. Sustained riding charges a stronger volley.

Pastures deplete and spawn pressure increases while you stay. After 45 active seconds at a camp, press **M** to inspect routes. You choose when to leave. Stay to gather materials and grow, or pack up before grazing and provisions run out. Refugees strengthen your host but consume food. Starvation and attacks can cost families and livestock; losing all people or clan resolve ends the run.

Choose a river route for food and horses, an exposed ridge for materials and spirit, or blue banners for refugees and veteran riders. **Rewards arrive only after the caravan arrives.** The caravan travels east automatically; ride alongside it and defend the supply carts. Structures cannot be developed while packed. Arrival restores some resolve and a living Khan’s health, refreshes the pasture, and preserves your build and uncollected XP.

Defeat opens the journey results screen, reporting the location, duration, survivors, herd, camps reached, and fallen Khans. Memories and migrations reset with each new expedition and are preserved when resuming a saved expedition; they do not add permanent unlocks.

Plan supplies with the live **Food net** rate and **Stores empty in** estimate beneath
the resource bar. The estimate follows pasture depletion or recovery, current
households, the current place, and learned improvements; food can be increasing now
and still run out later. During migration, it reports whether supplies last to arrival. Imminent shortages remain visible
when tips are hidden. In the camp inspector, **Provisions & gathering** breaks down
production, consumption, and material gathering. Eligible building inspectors preview
the actual purchase’s changes to combat and economy values, including food duration
and journey food costs. You can preview an upgrade while saving up its resource cost. Route cards show estimated travel
time, food needed en route, food after arrival rewards or rescue costs, and shortages
before arrival. Estimates assume current households and improvements without future
battle losses or purchases; risky routes remain your choice.

For resources, combat, enemies, levels, and camp development, see [the game mechanics brief](docs/game-mechanics.md). Current camp rules and effects are in [the nomadic camp guide](docs/nomadic-camp.md); historical craft details and cultural sources remain in [the legacy camp catalog](docs/camp-upgrade-tree.md). See [the progression UI guide](docs/progression-ui.md) for extending camp management.

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
| Zoom in / out                   | + / − / mouse wheel                 | RT / LT                       |
| Reset zoom                      | 0 / percentage button               | Right stick click             |
| Fullscreen                      | F11 / Alt+Enter / fullscreen button | —                             |
| Quit                            | Quit game / window close            | Navigate to Quit game, then A |

Caravan guard keeps riders near the clan and reduces clan damage. Encirclement circles nearby enemies and rewards moving fire. Charging wedge follows your Khan and turns gallop into an attack. Feigned retreat spreads riders, accelerates moving volleys, and gathers shards from farther away. Touch preview supports dragging to ride and tapping command buttons.

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

**Continue expedition** resumes the latest full save. **Saved expeditions**, on the title, pause, and results screens, offers three manual slots plus an autosave, with location, journey time, population, level, and save date. Overwriting, deleting, and loading over a live expedition require confirmation. Loaded expeditions open paused; no simulation runs while the game is closed. **Save and return to title** keeps the current journey. **New Game** starts fresh; the existing **Continue clan camp** still carries only the portable camp into a fresh journey.

Autosaves run every 30 active seconds, on pausing, after progression/travel checkpoints, and before a normal desktop close or Quit. Normal saves preserve the Khan and succession timer, resources and facilities, migration and objectives, enemies, projectiles, dropped XP, and ability/encounter cooldowns. Developer and cheated runs cannot overwrite normal saves. Manual slots remain available after defeat.

Profile preferences remain in `profile.json`; full saves use `expedition-auto.json` and `expedition-slot-1.json` through `expedition-slot-3.json` beside it. Writes are validated, queued, flushed, and atomically renamed, with a previous-save `.bak` recovery copy. Damaged or incompatible slots show their status; failed saves never report success. A failed close-time save lets you keep playing and retry or explicitly quit without saving. Native saves never use the install directory or localStorage. Browser preview saves remain separate. See [the save-system contract](docs/expedition-saves.md).

## Project map

```text
src/game/config.ts             Balance, world, and journey timings (seconds)
src/game/types.ts              Run, clan, and snapshot contracts
src/game/state/run.ts          Experience and run lifecycle
src/game/state/khan.ts         Khan presence, lethal hits, and active-time succession
src/game/state/clan.ts         Economy, construction, migration, clan loss
src/game/state/camp.ts         Typed camp effects, neutral defaults, and once-only grants
src/game/data/clan.ts          Legacy crafts, routes, regions, formations
src/game/data/nomadicCamp.ts   Current camp building registry and level effects
src/game/state/nomadicCamp.ts  Validated building purchases and compatibility projections
src/game/data/landscapes.ts    Eight location palettes, landmarks, vegetation, water, weather
src/game/data/enemies.ts       Five enemies, two elites, and local variants
src/game/assets/painterlyArt.ts Shared painted atlases, sizing, collision alignment, effects
src/game/assets/SteppeLandscape.ts Painterly ground, riverbanks, weather, regional scenery
src/game/assets/landscapeLayout.ts Seeded scenery placement and clear caravan corridor
src/game/assets/ClanLife.ts     Bounded workers, pack horses, and active-time camp activity
src/game/state/campLife.ts      Workplaces, population-driven shelters, and visual routes
public/art/                   Bundled painted PNGs and atlas frame metadata
src/game/scenes/ArenaScene.ts  Arena coordinator
src/ui/GameUI.ts               Full-window HUD, title/pause menus, focus and input
src/ui/menuContent.ts          Camp, route, chronicle, settings, and help panels
src/ui/progressionTree.ts      Shared data-driven progression tree renderer
src/ui/campContent.ts          Legacy camp branch and node rendering
src/ui/campModel.ts            Camp panorama and nameplate composition
src/ui/nomadicCampModel.ts     Building locations, chooser, previews, and upgrade popovers
src/camp.css                  Camp landscape, sites, and responsive inspector layout
src/platform/                 Narrow native capability bridge and browser fallback
desktop/                      Secure Electron lifecycle and atomic profile storage
scripts/                      Build staging, packaging, icon, SteamPipe preparation
```

See [the arena module map and simulation order](docs/arena-scene.md) for scene responsibilities.

Actors use bounded pools and a spatial grid. Combat, economy, and physics stop in menus and on focus loss. Construction, route rewards, and XP levels live in renderer-independent state modules. The renderer keeps sandboxing, context isolation, and disabled Node integration. `window.__gloam` remains a development-only test/inspection hook, absent from production.

## Checks

```sh
npm run check           # Formatting, renderer/desktop/Playwright typechecks, unit tests, production build
npm run test:coverage   # Unit tests with per-directory coverage floors
npm run test:local      # Local browser gameplay suite, then Electron (excludes @perf)
npm run test:e2e:core   # Fast 27-test core browser subset under shared lock
npm run test:perf       # Exclusive browser + Electron graphics/FPS budgets, idle host required
npm run test:desktop    # Actual Electron against offline production files
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
npm run format
```

`npm run typecheck` checks renderer, desktop, and Playwright code. The Playwright
project includes browser, Electron, and Pages specs and their configuration files.
Inside `page.evaluate`, `/src/...` imports are served by Vite: keep their narrow
`@ts-expect-error` comments and pair them with a relative `typeof import(...)`
assertion so the imported content still has its real types. Electron launch
fixtures use `electronEnvironment()` to omit undefined environment values.

`test:coverage` prints a V8 coverage table and enforces regression floors on the
renderer-independent core: `src/game/state` needs 95% covered lines, and
`src/game/data` and `src/shared` need 90%. Raising a floor above the actual
coverage fails the run, so the well-tested core cannot erode silently. Plain
`npm test` and `npm run check` skip coverage collection.

Local `test:e2e` and `test:pages` runs open visible Chromium windows and check that
WebGL 1 and 2 use hardware rendering. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to your
system Chromium binary, as above, or install Playwright Chromium. Linux uses ANGLE's
OpenGL backend and selects Wayland when `WAYLAND_DISPLAY` is set. Test windows keep
rendering when covered or on another workspace; keep the display session available.
The renderer strings are printed before testing, and software fallback fails early.

Headed test windows use the class/app id `bh-e2e-test`; set `E2E_WINDOW_CLASS` to
override it. On Hyprland, an optional local window rule can match that class and
send windows silently to a dedicated workspace (for example, workspace 9).
Routing and focus behavior depend on your compositor's local rules; desktop
configuration is not installed by the test suite.

`CI` keeps the existing headless software-rendered browser behavior. For the same
behavior locally, use `E2E_HEADLESS=1`, for example:

```sh
E2E_HEADLESS=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

GitHub Actions runs `npm run check` and the Pages artwork smoke — the one Pages
test that never starts or plays the game — through the **GitHub Pages** workflow
on pull requests and pushes to `main`. Pages tests tagged `@gameplay` start or
play the game; the Pages Playwright config excludes them when `CI` is set, so
GitHub never runs them and `npm run test:pages` keeps all three locally.
The separate browser E2E workflow (focused PR runs, full shards, and nightly runs)
is removed. Browser and desktop gameplay, graphics, and performance tests run
locally, including Orkhon Valley's texture/FPS budgets; there is no desktop nightly
job. Software-rendered hosted runners do not provide reliable real-time simulation
or GPU performance results.

| Suite / configuration                                                               | Classification and where it runs                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format, renderer/desktop/Playwright typechecks, Vitest unit tests, production build | Fast correctness checks; GitHub Actions and local `npm run check`. Unit simulations advance explicit time without a live renderer or wall-clock gameplay.                                                                                                                          |
| `tests/e2e` browser specs                                                           | Mixed UI/save correctness and live gameplay/graphics coverage; local `npm run test:e2e`. Fast 27-test `@core` subset runs via `test:e2e:core`. Performance tests tagged `@perf` run separately through `test:perf`.                                                                |
| `tests/desktop` Playwright specs                                                    | Native correctness, layout, gameplay, and graphics/performance coverage; local `npm run test:desktop`; `@perf` runs through `test:perf`.                                                                                                                                           |
| `tests/pages` artwork smoke                                                         | Release correctness at the Pages subpath without starting gameplay: bundled assets, fonts, and the absence of development hooks and desktop capabilities; GitHub Actions and local `npm run test:pages` after a build. No combat, position, animation, or frame-budget assertions. |
| `tests/pages` `@gameplay` smoke                                                     | Real camp purchases, pause/resume, sound preference persistence, and play with unavailable storage; local `npm run test:pages` after a build. Tagged `@gameplay` and never run by GitHub Actions.                                                                                  |
| `playwright.graphics.ts` and `tests/support/checkGraphics.ts`                       | Rendering configuration and local hardware-WebGL preflight, not a CI performance benchmark. The configuration's policy is unit-tested in `npm run check`; Pages keeps headless software rendering in CI.                                                                           |

Run `npm run test:local` before shipping gameplay or artwork changes. It runs the ordinary
browser and Electron specs. Also run `npm run test:perf` for the tagged graphics
and frame-rate budgets. Individual commands above
remain available for focused reviews; no test assertions are removed or relaxed.

`E2E_HEADLESS=1` also applies to `test:pages`. Desktop tests use the game's Electron
runtime, with the same local GPU flags and renderer check. For Electron, `CI` or
`E2E_HEADLESS=1` disables those overrides and checks; native windows still require
a display session or Xvfb on Linux.

All browser regressions use the angled 2.5D terrain. To run on a local GPU:

```sh
E2E_PORT=5244 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

The `world3d` suite exercises geometry, sprites, water, streaming, debug views,
and resource cleanup. Settings regressions cover legacy profile migration into
this same renderer; landscape and river previews remain interface illustrations.

Each browser test run starts its own server, so several checkouts on one host
need distinct ports. Set `E2E_PORT` (default 5173) to move the `test:e2e` dev
server and `PAGES_PORT` (default 4173) to move the `test:pages` preview server,
for example:

```sh
E2E_PORT=5199 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

A run never reuses a server it finds already listening; it always starts a fresh
one on the configured port so it cannot test another checkout's build. Set
`E2E_REUSE_SERVER=1` to opt into reusing an existing server on the same port.

For a quick review, run `npm run test:e2e:changed -- origin/main` (fetch the
base branch first). By default, it runs the fast 27-test `@core` subset plus any
specs mapped to touched application areas and smoke tests. Add `--list` to
inspect the selection. Changes to `public/art`, terrain or renderer code, saves,
input, ArenaScene, dependency/build configs, or unknown files conservatively run
the full suite; pass `--full` to force the full suite explicitly.

For a focused application review, explicitly name the relevant specs; both smoke
tests are still included:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e:changed -- origin/main --spec=mounted-tactics --spec=camp-combat
```

Repeat `--spec=pattern` for each affected area. This is partial review coverage;
run the full `test:local` suite before shipping gameplay changes.
The review command preserves the normal viewport, worker count, GPU policy, and
failure reporting. The local commands (`test:e2e`, `test:e2e:core`, `test:e2e:changed`, `test:desktop`, and
`test:local`) automatically hold a shared `flock -s /tmp/bh-playwright.lock`.
They can overlap each other; choose distinct `E2E_PORT` values. `test:perf` holds
the same lock exclusively (`flock -x`) across its build and both tagged suites,
so ordinary runs wait until it finishes. Do not wrap these commands in another
lock. If `flock` is absent (including typical macOS/Windows installs), commands
run without locking; arrange exclusive machine use yourself. After acquiring the
performance lock, the runner waits up to 30 seconds for 1-minute load to fall to
at most half the logical CPU count, then exits with “Machine busy, results
unreliable” if still busy. This guard cannot prevent unrelated jobs starting
later and Windows does not expose load average. See the
[measured review and rendering comparisons](docs/browser-test-runtime.md) for
selection limits, timings, and the decision to retain the full-suite defaults.

Browser tests cover keyboard, controller, touch, combat, traditions, planning, the Burning Tempest, caravan damage, route rewards, remote camp defense, migrations between real places, full-window layout, and paused chronicle/settings/help navigation. Electron tests exercise the offline build, layout, native save persistence, sandboxing, fullscreen, and quit using isolated saves. Tests never use normal save files. Linux needs a display session or Xvfb for Electron.

Further release work includes extended balancing and playtesting, target-hardware performance, a longer campaign, permanent unlocks, platform validation, release art, real Steamworks APIs, and Steam review.

Copyright © 2026 Leon Lee. All rights reserved.
