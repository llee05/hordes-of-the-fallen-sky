# Hordes of the Fallen Sky

A Mongolian-inspired nomadic civilization builder × mounted bullet heaven. **TypeScript + Phaser 3 + Electron + Vite.** The cities have fallen, the sky is going dark, and a small clan survives by moving. Build a people, defend their temporary home, and protect the caravan on its journey to the sacred heart of the steppe.

This playable prototype includes a complete two-act expedition: eight illustrated camp encounters with choices, four companions, three defended crossings, a final mountain stand, and an epilogue reflecting the people who arrive. Its civilization systems include five permanent camp households and five optional workplaces chosen from fourteen building types, abstracted population and workers, three resources, four journey chapters with eight additional named camp destinations, five shared standard enemies, two shared elites, 24 local enemy variants, and one boss. The supernatural calamity and its creatures are original fantasy. A larger historical campaign, thousands of individually simulated units, and broader campaign unlocks remain future work.

Read [the world lore](lore.md) for the Tengri-inspired setting: Eternal Heaven, Etügen and the living land, the Last Court's Iron Vow, the unreturned, and the Blue Banner clan's search for refuge. Research notes separate the religious and cultural inspiration from the game's invented mythology.

See [the story architecture](story-architecture.md) for the revised two-act blueprint: Gather the Scattered, then Carry the Living, with a different remembered road through the chosen destinations. It proposes distinct first-stop scenes, second-stop variations, and ending callbacks for all eight named places. [The story prototype guide](docs/story-prototype.md) distinguishes this writing plan from the currently playable encounters, triggers, and choices.

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
**F8** from any screen to open the level selector: jump to any of the four chapters,
any crossing approach, or any named destination in chapters 2 and 3. Each choice
starts a fresh test expedition with supplies and 40 unspent knowledge points.
Escape / F8 closes the selector and returns to the previous screen. Developer runs
skip the prologue and camp scenes and do not change your saved longest journey.
Start a new run to return to normal play. The selector is absent from production
and packaged builds. See [developer mode](docs/developer-mode.md) for checkpoint rules.

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

The game opens at the title menu. **New Game** opens a skippable, five-chapter painted prologue adapted from [the world lore](lore.md#opening-slideshow): Heaven and Earth, the Iron Vow, the unreturned, the living hearth, and the road to the Heart of the Steppe. Read at your own pace with Continue / Enter / controller A; use Back or the left/right arrow keys to turn pages. Completing the prologue, Skip intro, Escape, or controller B / Start begins the expedition, opening the first camp scene when camp scenes are enabled. Every New Game starts with the prologue. Replay introduction at the title lets you read it independently; completing or skipping that replay returns to the title. Gameplay remains frozen throughout; reduced-motion preferences disable the gentle painting movement. See [the bundled paintings and generation prompts](docs/intro-artwork.md).

The title is embroidered across an indigo felt banner over the painted steppe. Woven rust-red trim, brass clan symbols, and warm manuscript pages carry the world's art into the interface. Camp cards reuse the painted gers, riders, and wagons from the battlefield; migration choices have illustrated landscape vignettes. All UI materials and artwork ship locally.

The battlefield fills the entire game window. Zoom with the mouse wheel, + / − (including the number pad), or controller RT / LT. The on-screen − / percentage / + controls offer the same actions; click the percentage, press 0, or click the right stick to reset to 100%. Zoom ranges from 60% to 160% and keeps the interface readable at its original size. It is available during active play, follows the Khan or caravan during succession, and carries across new expeditions for the app session. Compact resources and objectives sit at the top, with Khan health, clan resolve, gallop, and a keyboard command dock near the bottom. Brief clan messages appear as notifications. Dismissible contextual guidance teaches riding, camp development, knowledge, formations, and the first crossing through actual actions. Hide tips in the field or restore them from How to play; the preference lasts for the app session. Persistent food, resolve, population, and pasture warnings remain visible when tips are hidden.

The title cloth breathes gently, parchment menus settle into place, and illustrations respond to mouse or keyboard focus. Resource changes, damage, gallop readiness, and newly available migration routes have brief visual feedback. Controls respond immediately throughout. The operating system's reduced-motion preference disables interface animations and transitions, including when changed while the game is open.

Press **Tab** or **J** (controller **View**) to open the clan chronicle. It pauses combat, physics, economy, and migration while you inspect the journey, buildings, workforce, formations, and learned traditions. Arrow keys switch its tabs; Escape or J returns to the battlefield. You can open camp development or choose an available migration route directly from the chronicle.

The title and pause menus contain **Settings** and **How to play**. Mute and separate music, ambience, combat, and interface levels save automatically. Settings also offers five recorded reference auditions. Fullscreen is available in Settings or with F11 / Alt+Enter. Escape backs out to the menu you came from; closing Settings during a paused expedition keeps that expedition paused. Native Quit game is available in the main and pause menus. Keyboard, mouse, controller, and touch-preview actions use the same scene-owned run state.

The sound palette uses licensed recordings of recurve bows, real horse contacts, paper, leather, wood, metal, frame drums, wind, water, and campfire. Layered events choose shuffled takes with subtle variation; sound remains bounded during large battles. Four buses provide separate music, ambience, combat, and interface controls. Long environmental passages crossfade as biome, combat and camp context change; menus freeze movement cadence. All recordings and their CC0 provenance ship locally. Recorded music and additional horse, cloth, wildlife and region-specific material are explicit pending asset slots; no electronic fallback fills them. See [the audit](docs/audio-audit.md) and [the sound design guide](docs/sound-design.md) for the five references, licences, architecture, and remaining recording work.

## The Living Steppe Tapestry

The game now uses a stylized painterly 2.5D presentation: golden brushwork grasslands, miniature mounted warriors, decorated ivory gers, turquoise and vermilion banners, and cold, unsettling calamity creatures. Soft shadows, ground-position depth sorting, drifting wind and snow, and parchment panels carry the direction through gameplay. Visible camp workers carry felt between shared stores and established workplaces. A bounded pack herd grazes at camp and walks with the caravan. Additional households raise more shelters, while losses reduce the visible group. Packing briefly folds the old camp into the travelling carts while departure begins immediately. These visual representatives use the existing population and worker assignments; they do not add a second economy. All artwork ships locally. See [the art direction and generation prompts](docs/living-steppe-tapestry.md).

Every location has two native enemy variants alongside familiar shared unreturned. Terrain rules distinguish woodland ambushes, frozen banks, cliff-foot rockfall, exposed-shelf crossfire, cinder falls, granite shelter, and reed-bank mire. Destination previews and the chronicle explain local enemies and their counters before departure. Native variants reuse the existing painted animation sets with palette accents and distinct attack patterns; dedicated creature artwork can replace those clips later. See [area encounters and enemy rosters](docs/area-encounters.md).

Every location has a distinct painted landscape: golden meadow, frozen river, slate pass, forested foothills, snowy peaks and glaciers, volcanic steppe, granite desert, and braided river pasture. Terrain colors, vegetation, watercourses, landmark silhouettes, and atmosphere follow the chosen place. Migration cards preview the same scenery before departure. See [the twelve-location landscape catalog](docs/location-landscapes.md).

Mount Otgontenger uses five stepped elevation tiers: connected ridges, terraces,
rock shelves, snowy summits, and broad winding passes. Full cliff faces, contact
occlusion, and cast shadows communicate height around open camp and caravan space.
Rubble gathers below cliffs, scrub occupies shelves, and sparse conifers stay low.
Camera-sized chunks reuse the existing 2D textures and painted prop frames.
In development, choose Otgontenger with **F8** and press **F9** to cycle elevation,
slope, cliff-placement, and traversal overlays. See [the mountain terrain guide](docs/mountain-terrain.md)
for configuration, rendering, traversal, and limits.

Angled 2.5D scenes are available across all twelve destinations. An orthographic
Three.js world supplies genuine raised shelves, vertical cliff faces, snowfields,
shadows, river gorges, and timber crossings. Existing painted characters and camps
stand on the terrain while Phaser retains physics, combat, and animation. Riding
follows screen directions. F6 changes camera angle, F7 isolates terrain, and F9
cycles debug views in development. **Settings → Terrain** switches immediately between
**Angled 3D** and **Flat 2D**, and saves your choice with your profile. See
[the angled scene guide](docs/world-3d.md) for startup defaults, software-WebGL
fallback, and development overrides, and [painted asset prompts](docs/angled-scene-art.md)
for the bundled artwork.
The [environment quality guide](docs/environment-quality.md) describes painted material blending,
weathered cliffs, shared riverbeds and shores, clustered vegetation, and render budgets.

The Khan, allied archers, and all six creature designs have painted sprite animation: four gait or hovering frames and two attack poses each. Riding speed drives the gait, galloping quickens it, and actual volleys, charges, and strikes trigger release poses. Hits briefly tint the character; defeated enemies fade through a small visual pool after their collision bodies leave immediately. Character animation and these effects freeze in every paused run phase. See [the sprite sheets, registration, and generation prompts](docs/character-animation.md).

Choose **Starting tradition** at the title to compare Shared hearth, Outrider circle, Hearthkeepers, and Pathfinders. Their riders, protection, movement, and starting-store tradeoffs change the opening while every patron and facility remains available. The chosen preparation persists through the expedition and full saves. See [starting clan traditions](docs/starting-traditions.md).

The final stand has three dramatic chapters, rotating Skybreaker approaches, marked windups, and four-second recovery windows. Optional work parties can open the passage up to 24 seconds sooner; survival still wins with the boss alive. See [the final-stand rules](docs/final-stand.md).

Brass elite/armour labels, directional offscreen danger warnings, and brief named-cause clan-loss messages make crowded combat easier to read. Settings offers saved **Projectile contrast** and **Effect density** controls; Minimal keeps combat warnings visible while removing decorative bursts and dust. See [combat readability](docs/combat-readability.md).

Per-stage expedition milestones appear in the chronicle and results. In development, `metrics` prints observations and `benchmark` compares all four starting arrangements under riding, guarding and early-migration schedules. The twelve full-journey pressure checks exercise real economy and progression with modelled combat exposure. See [pacing and balance checks](docs/expedition-pacing.md).

## Build, defend, migrate

Camp scenes are **On** by default. Saran the hearthkeeper, Boro the herder, Erden the tally keeper, and Nara the youngest survivor travel through the story with the Blue Banner clan. Conversations pause the world and offer two or three responses, each with a displayed resource benefit and often a small lasting camp effect. Choices shift companion trust; each destination has its own scenes; and later scenes and the epilogue recall what the clan actually chose. Escape / controller B continues without choosing. Turn **Camp scenes: Off** at the title for uninterrupted combat; this preference lasts through run restarts in the current app session.

Act I begins at Golden Pasture and continues at the first chosen camp. Arrival at the second chosen camp begins Act II, followed by the fictional Heart of the Steppe. Silent River and Broken Pass remain the default intermediate stops. The chronicle's **Our story** tab keeps the actual conversations and decisions from the current expedition. It also keeps [lived-history memories and companion reactions](docs/story-prototype.md#lived-history). **Your clan** and **Our story** record each Khan’s time carrying the banner and the host’s victories during that tenure. The record retains the latest 96 clan moments and 64 Khans, with total counts visible. Pause, victory, and defeat menus also offer **Our remembered road**. Read-only memories never restart simulation or grant a choice again.

The first two departures also offer **Mount Otgontenger, Bogd Khan Uul, Altai Tavan
Bogd, Khan Tengri Peak, Mount Belukha (Üch-Sümer), Altan Ovoo, Eej Khairkhan, and
Orkhon Valley** as alternative destinations. Press M after routes open, choose a
camp, then choose a river, ridge, or rescue approach. Each place has its own gathering
and travel modifiers, shown alongside its cultural context and destination-specific
food forecasts. Visited places are left behind. The HUD, camp, story settings,
chronicle, and Khan records retain the actual location; chapter weather and story
beats still follow the four-stage expedition. The third crossing leads to the
fictional Heart of the Steppe. These are stylized camps in the surrounding landscapes,
with compressed travel geography; real sacred places remain distinct from the
invented calamity. See [destinations, rules, and cultural sources](docs/migration-locations.md).

Start with eight people, three horses, two gers, supplies, and a mounted Khan with one accompanying rider. Attacks are automatic. Ride to collect spirit shards. Each level banks a knowledge point without interrupting combat. Press **T** (controller **LB**) or use the HUD to open the paused **Patron tech tree**, inspect every branch, and spend points on the ranks you choose. Eight patrons support hunting, civilisation, archery, survival, terrain control, ancestral summons, army leadership, and defensive construction. Each has a two-rank foundation, early practices, and a choice of focused capstone; mix patrons freely. Foundations and practices cost one point, and capstones cost two. Archery offers precision, piercing, and wide-volley specializations. You can leave with unspent points and return later. Browse one connected patron graph at a time, compare patrons in the overview, and search names or effects. Select a node to inspect exact before/after values, prerequisites, and exclusive alternatives; use its Learn button to purchase. The Combinations catalogue reveals interactions such as Burning Tempest and links to their camp and patron requirements. The tree is also accessible from Pause and the chronicle’s Traditions tab. Keep moving to build momentum, increasing arrow range and damage. Gallop grants brief invulnerability; in charging wedge, it also damages enemies you ride through.

Press **B** to visit the illustrated **nomadic camp**. Five permanent core households begin at level 1: **Khan's Ger, Horse Lines, Herding Grounds, Communal Hearth and Wagon Yard**. Choose five different workplaces from fourteen military, economy, survival, spiritual and cultural buildings for the five optional locations. Every building has three levels, a visible upgraded appearance, authored costs and effects, and a compact parchment inspector. The Khan's Ger governs population capacity and higher building levels. Search, Provisions and Combinations stay within the same painted map; Escape/controller Back closes a popover before leaving. Planning freezes the world. Unsupported mount, equipment, companion, trading and corruption benefits are recorded as **Planned** data rather than simulated systems.

Purchases and completed crossings save the portable camp checkpoint. **Continue clan camp** restores its choices, levels and actual supplies into a fresh expedition; **Continue expedition** restores the whole battle and journey. Old facilities map to their corresponding new buildings, while retired tiers, internal ranks and craft branches are refunded once. See [the nomadic camp guide](docs/nomadic-camp.md) for the complete catalog, effects, prices and migration mapping.

**Advanced Fletcher's Workshop + Shaman's Ger = the Burning Tempest:** curving, flaming arrow fans with lingering burn damage. Other combinations retain their existing patron and combat interactions.

**The Khan is a title carried by successive leaders.** If he falls, the clan spends **10 active seconds choosing a new Khan** while riders, ancestral echoes, and camp defenses keep fighting. A visible countdown marks succession. The successor returns at the current camp or moving caravan with full maximum health, a ready gallop, and 3 seconds of protection. During the countdown, optionally choose an outrider (+5% riding speed) or hearthguard (8% less Khan damage) using 1 / 2, controller left / right, or the HUD. Their trait lasts for that generation; leaving the choice alone returns an unmodified successor. All research, resources, buildings, and journey progress carry on. Menus pause the countdown. Golomt’s Last Ember saves the current Khan immediately once per expedition; its charge does not refresh for successors. Losing the clan’s people or resolve still ends the expedition.

A portable barricade of lashed wooden hurdles and indigo and rust felt bands surrounds the camp. It expands around growing households and workplaces, then travels as low wheeled screens around the caravan. Enemies stop at its edge and repeatedly attack clan resolve until defeated; hostile shots strike the barrier itself. Struck panels briefly jolt and brighten, and worn wood and frayed cloth reflect low resolve. Your Khan, riders, and camp defenses can still defeat the attackers. Packing up makes attackers pursue the moving caravan again when it leaves their reach. The barricade uses the clan's existing resolve and protection rather than a separate health pool.

Battles alternate warned assaults, featured enemies, and recovery windows. Optional supply carts, loose herds, stranded households, and enemy gatherings invite short rides away from camp. Terrain-aware enemies use the current area’s passes, ramps, dry ground, and river crossings. Sustained riding charges a stronger volley; key technologies add paired rider shots, pinning arrows, and a slowing gallop wake.

Pastures deplete and spawn pressure increases while you stay. After 45 active seconds at a camp, press **M** to inspect routes. You choose when to leave. Stay to gather materials and grow, or pack up before grazing and provisions run out. Refugees strengthen your host but consume food. Starvation and attacks can cost families and livestock; losing all people or clan resolve ends the run.

Choose a river crossing for food and horses, an exposed ridge for materials and spirit, or blue banners for refugees and veteran riders. **Rewards arrive only after a successful crossing.** Each approach also offers a distinct optional encounter: attacks from both banks at a carved ford, an ambush ahead on an exposed ridge, or additional households to escort into the moving column. A crossing without casualties restores four extra resolve. The caravan travels east automatically; ride alongside it and defend the supply carts. Structures cannot be developed while packed. Arrival restores some resolve and a living Khan’s health, refreshes the pasture, and preserves your build and uncollected XP.

The journey's chapter pressures follow the clan through whichever camps it chooses. After the first crossing, the White Silence reduces grazing and caravan speed. After the second, the Earth That Walks brings ground eruptions that warn before striking. At the fictional Heart of the Steppe, the Red Eclipse weakens rituals and brings the Skybreaker. Protect your people for three minutes until the passage opens. **Victory depends on saving the clan; killing the boss is optional.** Defeating it restores resolve.

In a story expedition, victory opens **A place beside the fire**, a skippable epilogue reflecting survivors, recorded losses, clan identity, the clerk's shared tally, and the Skybreaker's fate. Journey results follow, with the epilogue available to read again. Story choices and memories reset with each new expedition and are preserved when resuming a saved expedition; they do not add permanent unlocks.

An expedition is intended to take about 15 minutes with roughly three minutes of growth per camp. Earlier departures shorten the journey; longer stays increase danger. This is a prototype balance, not a fixed time limit.

Plan supplies with the live **Food net** rate and **Stores empty in** estimate beneath
the resource bar. The estimate follows pasture depletion or recovery, current
households, winter conditions, and learned improvements; food can be increasing now
and still run out later. During crossings and the final stand, it reports whether
supplies last to arrival or the passage opening. Imminent shortages remain visible
when tips are hidden. In the camp inspector, **Provisions & gathering** breaks down
production, consumption, and material gathering. Eligible building inspectors preview
the actual purchase’s changes to combat and economy values, including food duration
and crossing costs. You can preview an upgrade while saving up its resource cost. Route cards show estimated travel
time, food needed en route, food after arrival rewards or rescue costs, and shortages
before arrival. Estimates assume current households and improvements without future
battle losses or purchases; risky routes remain your choice.

For a detailed reference to resources, combat, enemies, progression, and both upgrade trees, see [the game mechanics brief](docs/game-mechanics.md). For current camp rules and effects, see [the nomadic camp guide](docs/nomadic-camp.md); historical craft details and cultural sources remain in [the legacy camp catalog](docs/camp-upgrade-tree.md). For all 42 technologies and specialization routes, see [the patron tech tree](docs/patron-tech-tree.md). For adding progression content and extending the UI, see [the progression UI guide](docs/progression-ui.md).

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
| Zoom in / out                   | + / − / mouse wheel                  | RT / LT                       |
| Reset zoom                      | 0 / percentage button                | Right stick click             |
| Fullscreen                      | F11 / Alt+Enter / fullscreen button  | —                             |
| Quit                            | Quit game / window close             | Navigate to Quit game, then A |

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

**Continue expedition** resumes the latest full save. **Saved expeditions**, on the title, pause, and results screens, offers three manual slots plus an autosave, with location, journey time, population, level, and save date. Overwriting, deleting, and loading over a live expedition require confirmation. Loaded expeditions open paused (or at their unresolved camp story); no simulation runs while the game is closed. **Save and return to title** keeps the current journey. **New Game** starts fresh; the existing **Continue clan camp** still carries only the portable camp into a fresh journey.

Autosaves run every 30 active seconds, on pausing, after progression/story/travel checkpoints, and before a normal desktop close or Quit. Normal saves preserve the Khan and succession timer, research and unspent knowledge, resources and facilities, migration and objectives, story transcripts, enemies, projectiles, dropped XP, and ability/encounter cooldowns. Developer and cheated runs cannot overwrite normal saves. Manual slots remain available after defeat or victory.

Profile preferences remain in `profile.json`; full saves use `expedition-auto.json` and `expedition-slot-1.json` through `expedition-slot-3.json` beside it. Writes are validated, queued, flushed, and atomically renamed, with a previous-save `.bak` recovery copy. Damaged or incompatible slots show their status; failed saves never report success. A failed close-time save lets you keep playing and retry or explicitly quit without saving. Native saves never use the install directory or localStorage. Browser preview saves remain separate. See [the save-system contract](docs/expedition-saves.md).

## Project map

```text
src/game/config.ts             Balance, world, and journey timings (seconds)
src/game/types.ts              Run, clan, and snapshot contracts
src/game/state/run.ts          Experience, traditions, run lifecycle
src/game/state/khan.ts         Khan presence, lethal hits, and active-time succession
src/game/state/clan.ts         Economy, construction, migration, victory
src/game/state/camp.ts         Typed camp effects, neutral defaults, and once-only grants
src/game/data/clan.ts          Legacy crafts, routes, regions, formations
src/game/data/nomadicCamp.ts   Current camp building registry and level effects
src/game/state/nomadicCamp.ts  Validated building purchases and compatibility projections
src/game/data/landscapes.ts    Twelve location palettes, landmarks, vegetation, water, weather
src/game/data/enemies.ts       Five enemies, two elites, and the Skybreaker
src/game/data/patrons.ts       Eight patrons, playstyles, symbols, and descriptions
src/game/data/upgrades.ts      Patron technologies, ranks, and prerequisites
src/game/state/patrons.ts      Neutral patron effects, damage, recovery, and revival
src/game/systems/PatronSupport.ts Ancestral riders, slowing fields, pulse, and camp ward
src/game/assets/painterlyArt.ts Shared painted atlases, sizing, collision alignment, effects
src/game/assets/SteppeLandscape.ts Painterly ground, riverbanks, weather, regional scenery
src/game/assets/landscapeLayout.ts Seeded scenery placement and clear caravan corridor
src/game/assets/ClanLife.ts     Bounded workers, pack horses, and active-time camp activity
src/game/state/campLife.ts      Workplaces, population-driven shelters, and visual routes
public/art/                   Bundled painted PNGs and atlas frame metadata
src/game/scenes/ArenaScene.ts  Simulation, mounted host, combat, regional arenas
src/ui/GameUI.ts               Full-window HUD, title/pause menus, focus and input
src/ui/menuContent.ts          Camp, route, chronicle, settings, and help panels
src/ui/progressionTree.ts      Shared data-driven progression tree renderer
src/ui/researchContent.ts      Patron branches, ranks, and research state
src/ui/campContent.ts          Legacy camp nodes and shared parchment detail rendering
src/ui/campModel.ts            Camp panorama and nameplate composition
src/ui/nomadicCampModel.ts     Building locations, chooser, previews, and upgrade popovers
src/camp.css                  Camp landscape, sites, and responsive inspector layout
src/platform/                 Narrow native capability bridge and browser fallback
desktop/                      Secure Electron lifecycle and atomic profile storage
scripts/                      Build staging, packaging, icon, SteamPipe preparation
```

Actors use bounded pools and a spatial grid. Combat, economy, and physics stop in menus and on focus loss. Construction, route rewards, and banked knowledge points live in renderer-independent state modules. The renderer keeps sandboxing, context isolation, and disabled Node integration. `window.__gloam` remains a development-only test/inspection hook, absent from production.

## Checks

```sh
npm run check           # Formatting, renderer/desktop/Playwright typechecks, unit tests, production build
npm run test:coverage   # Unit tests with per-directory coverage floors
npm run test:local      # Local browser gameplay suite, then Electron (excludes @perf)
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
locally, including Golden Pasture's texture/FPS budgets; there is no desktop nightly
job. Software-rendered hosted runners do not provide reliable real-time simulation
or GPU performance results.

| Suite / configuration                                                               | Classification and where it runs                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format, renderer/desktop/Playwright typechecks, Vitest unit tests, production build | Fast correctness checks; GitHub Actions and local `npm run check`. Unit simulations advance explicit time without a live renderer or wall-clock gameplay.                                                                                                                                                  |
| `tests/e2e` browser specs                                                           | Mixed UI/save correctness and live gameplay/graphics coverage; local `npm run test:e2e`. Performance tests tagged `@perf` run separately through `test:perf`.                                                                                                                                              |
| `tests/desktop` Playwright specs                                                    | Native correctness, layout, gameplay, and graphics/performance coverage; local `npm run test:desktop`; `@perf` runs through `test:perf`.                                                                                                                                                                   |
| `tests/pages` artwork smoke                                                         | Release correctness at the Pages subpath without starting gameplay: bundled assets, fonts, introduction paintings, and the absence of development hooks and desktop capabilities; GitHub Actions and local `npm run test:pages` after a build. No combat, position, animation, or frame-budget assertions. |
| `tests/pages` `@gameplay` smoke                                                     | Real camp purchases, pause/resume, sound preference persistence, and play with unavailable storage; local `npm run test:pages` after a build. Tagged `@gameplay` and never run by GitHub Actions.                                                                                                          |
| `playwright.graphics.ts` and `tests/support/checkGraphics.ts`                       | Rendering configuration and local hardware-WebGL preflight, not a CI performance benchmark. The configuration's policy is unit-tested in `npm run check`; Pages keeps headless software rendering in CI.                                                                                                   |

Run `npm run test:local` before shipping gameplay or artwork changes. It runs the ordinary
browser and Electron specs. Also run `npm run test:perf` for the tagged graphics
and frame-rate budgets. Individual commands above
remain available for focused reviews; no test assertions are removed or relaxed.

`E2E_HEADLESS=1` also applies to `test:pages`. Desktop tests use the game's Electron
runtime, with the same local GPU flags and renderer check. For Electron, `CI` or
`E2E_HEADLESS=1` disables those overrides and checks; native windows still require
a display session or Xvfb on Linux.

Shared browser helpers use the compatibility 2D terrain by default, including on
headless local runs. To exercise those same regressions in the default angled 3D
view on a local GPU, run:

```sh
E2E_TERRAIN=3d E2E_PORT=5244 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

Specs with explicit renderer URLs retain that selection. The `world3d` suite
exercises 3D and its 2D fallback; the `landscapes`, `mountains`, and `rivers`
diagnostics inspect the compatibility renderer's Phaser objects and stay in 2D.

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
base branch first). It includes changed browser specs and specs that import changed
test helpers, plus keyboard/lifecycle and default 3D smoke tests. Add `--list` to
inspect the selection. Application, asset, dependency, config, and unknown file
changes conservatively run the full suite: Playwright cannot track the game modules
loaded inside the browser, so bare `--only-changed` can miss their regressions.

For a focused application review, explicitly name the relevant specs; both smoke
tests are still included:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e:changed -- origin/main --spec=mounted-tactics --spec=patron-effects
```

Repeat `--spec=pattern` for each affected area. This is partial review coverage;
run the full `test:local` suite before shipping gameplay changes.
The review command preserves the normal viewport, worker count, GPU policy, and
failure reporting. The local commands (`test:e2e`, `test:e2e:changed`, `test:desktop`, and
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

Browser tests cover keyboard, controller, touch, combat, traditions, planning, the Burning Tempest, caravan damage, route rewards, remote camp defense, three crossings, clan-survival victory, full-window layout, and paused chronicle/settings/help navigation. Electron tests exercise the offline build, layout, native save persistence, sandboxing, fullscreen, and quit using isolated saves. Tests never use normal save files. Linux needs a display session or Xvfb for Electron.

Further release work includes extended balancing and playtesting, target-hardware performance, a longer campaign, permanent unlocks, platform validation, release art, real Steamworks APIs, and Steam review.

Copyright © 2026 Leon Lee. All rights reserved.
