# Hordes of the Fallen Sky

A Mongolian-inspired nomadic civilization builder × mounted bullet heaven. **TypeScript + Phaser 3 + Electron + Vite.** The cities have fallen, the sky is going dark, and a small clan survives by moving. Build a people, defend their temporary home, and protect the caravan on its journey to the sacred heart of the steppe.

This playable prototype includes a complete two-act expedition: eight illustrated camp encounters with choices, four companions, three defended crossings, a final mountain stand, and an epilogue reflecting the people who arrive. Its civilization systems include eight camp facilities, five encampment tiers, and six internal development paths, abstracted population and workers, three resources, four journey chapters with eight additional named camp destinations, five standard enemies, two elites, and one boss. The supernatural calamity and its creatures are original fantasy. A larger historical campaign, thousands of individually simulated units, and broader campaign unlocks remain future work.

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

The packaged game includes its runtime, painted art, fonts, and synthesized sound. It makes no runtime asset downloads or AI calls. The desktop fills its window and provides fullscreen, quit, and durable native saves.

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

The title and pause menus contain **Settings** and **How to play**. Sound preference saves automatically. Fullscreen is available in Settings or with F11 / Alt+Enter. Escape backs out to the menu you came from; closing Settings during a paused expedition keeps that expedition paused. Native Quit game is available in the main and pause menus. Keyboard, mouse, controller, and touch-preview actions use the same scene-owned run state.

The sound palette uses bowstring snaps, grounded hoofbeats, wood and leather impacts, rope twangs, harness bells, breathy clan horns, and warm plucked strings. Barricade hits sound at the struck panel; nearby action pans and fades with distance. Cart creaks accompany migration, with quiet gusts over the steppe. Distinct cues mark construction, research, departure, arrival, a fallen Khan, succession, and the expedition's outcome. World sounds stop in menus, while purchases and journey outcomes retain their brief cues. Muting fades existing voices as well as suppressing new ones. All 21 sounds are synthesized locally, with bounded mixing and no audio downloads. See [the sound design guide](docs/sound-design.md).

## The Living Steppe Tapestry

The game now uses a stylized painterly 2.5D presentation: golden brushwork grasslands, miniature mounted warriors, decorated ivory gers, turquoise and vermilion banners, and cold, unsettling calamity creatures. Soft shadows, ground-position depth sorting, drifting wind and snow, and parchment panels carry the direction through gameplay. Visible camp workers carry felt between shared stores and established workplaces. A bounded pack herd grazes at camp and walks with the caravan. Additional households raise more shelters, while losses reduce the visible group. Packing briefly folds the old camp into the travelling carts while departure begins immediately. These visual representatives use the existing population and worker assignments; they do not add a second economy. All artwork ships locally. See [the art direction and generation prompts](docs/living-steppe-tapestry.md).

Every location has a distinct painted landscape: golden meadow, frozen river, slate pass, forested foothills, snowy peaks and glaciers, volcanic steppe, granite desert, and braided river pasture. Terrain colors, vegetation, watercourses, landmark silhouettes, and atmosphere follow the chosen place. Migration cards preview the same scenery before departure. See [the twelve-location landscape catalog](docs/location-landscapes.md).

Mount Otgontenger uses five stepped elevation tiers: connected ridges, terraces,
rock shelves, snowy summits, and broad winding passes. Full cliff faces, contact
occlusion, and cast shadows communicate height around open camp and caravan space.
Rubble gathers below cliffs, scrub occupies shelves, and sparse conifers stay low.
Camera-sized chunks reuse the existing 2D textures and painted prop frames.
In development, choose Otgontenger with **F8** and press **F9** to cycle elevation,
slope, cliff-placement, and traversal overlays. See [the mountain terrain guide](docs/mountain-terrain.md)
for configuration, rendering, traversal, and limits.

Angled 2.5D scenes are now the default across all twelve destinations. An orthographic
Three.js world supplies genuine raised shelves, vertical cliff faces, snowfields,
shadows, river gorges, and timber crossings. Existing painted characters and camps
stand on the terrain while Phaser retains physics, combat, and animation. Riding
follows screen directions. F6 changes camera angle, F7 isolates terrain, and F9
cycles debug views in development. Use `?terrain=2d` in browser preview or
`VITE_TERRAIN_RENDERER=2d npm run dev` for the previous presentation. See
[the angled scene guide](docs/world-3d.md) and [painted asset prompts](docs/angled-scene-art.md).
The [environment quality guide](docs/environment-quality.md) describes painted material blending,
weathered cliffs, shared riverbeds and shores, clustered vegetation, and render budgets.

The Khan, allied archers, and all six creature designs have painted sprite animation: four gait or hovering frames and two attack poses each. Riding speed drives the gait, galloping quickens it, and actual volleys, charges, and strikes trigger release poses. Hits briefly tint the character; defeated enemies fade through a small visual pool after their collision bodies leave immediately. Character animation and these effects freeze in every paused run phase. See [the sprite sheets, registration, and generation prompts](docs/character-animation.md).

## Build, defend, migrate

Camp scenes are **On** by default. Saran the hearthkeeper, Boro the herder, Erden the tally keeper, and Nara the youngest survivor travel through the story with the Blue Banner clan. Conversations pause the world and offer two responses, each with a displayed resource benefit. Escape / controller B continues without choosing. Turn **Camp scenes: Off** at the title for uninterrupted combat; this preference lasts through run restarts in the current app session.

Act I begins at Golden Pasture and continues at the first chosen camp. Arrival at the second chosen camp begins Act II, followed by the fictional Heart of the Steppe. Silent River and Broken Pass remain the default intermediate stops. The chronicle's **Our story** tab keeps the actual conversations and decisions from the current expedition. It also remembers construction, departures, arrivals, losses, and succession. Companions offer brief reactions during play, spaced by active time; a small remnant uses a collective voice, and Camp scenes: Off records facts without spoken reactions. **Your clan** and **Our story** record each Khan’s time carrying the banner and the host’s victories during that tenure. The record retains the latest 96 clan moments and 64 Khans, with total counts visible. Pause, victory, and defeat menus also offer **Our remembered road**. Read-only memories never restart simulation or grant a choice again.

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

Press **B** to visit one large painted **nomadic camp**. Select an embedded building or empty plot to open a small anchored parchment with its level, effects, cost, prerequisites, and upgrade action. **Unfold levels & specialisations** expands that parchment with a vertical path and clear forks; there are no permanent side panels. The central **Clan Encampment** progresses through Wandering Clan, Established Encampment, Prosperous Ordo, Great Ordo, and Imperial Ordo, unlocking two through six facility plots and separate internal-development allowances. Eight facilities have three levels; archery, feltmaking, the sanctuary, and wagons offer mutually exclusive fourth-level choices. Six internal paths strengthen governance, remembrance, craft, warfare, logistics, and travelling exchange without taking full plots. Existing crafts and effects remain. Planning freezes the world; Escape dismisses the parchment first, then leaves camp. Purchases and completed crossings save a portable camp checkpoint through the existing profile system. **Continue clan camp** restores that organisation and its stores into a fresh expedition; it does not resume an interrupted battle or patron research. **New Game** begins a new eight-person clan. See [the nomadic camp guide](docs/nomadic-camp.md) for costs, architecture, compatibility and scope.

| Building             | What it adds                                        | Development paths                                                              |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Family gers          | Families and faster material gathering              | Hearthkeepers repair clan resolve; refugee beacons welcome more people         |
| Archery grounds      | Three mounted archers, encirclement, charging wedge | Fire arrows or veteran riders                                                  |
| Herding grounds      | Horses, food production, feigned retreat            | Faster remount herds or food-preserving winter stores                          |
| Spirit sanctuary     | Lightning strikes against nearby enemies            | Wind shamans or an ancestral camp guardian                                     |
| Wagon circle         | Defensive volleys, including during migration       | War carts or felt armor, then wheelwrights or layered screens; shared lashings |
| Feltmakers’ workshop | Faster material gathering                           | Wool sorting, weatherproof covers, pack frames, and master felt craft          |
| Provisioning ger     | Food supplies and production                        | Aaruul, borts, hospitality, and shared arrival provisions                      |
| Örtöö relay          | Faster crossings                                    | Pasture scouts, supply caches, family messengers, and fresh horses             |

**Fire arrows + wind shamans = the Burning Tempest:** curving, flaming arrow fans with lingering burn damage. Military, spiritual, and migration decisions gradually establish the Iron Horde, Children of the Eternal Sky, or Wandering Nation identity.

**The Khan is a title carried by successive leaders.** If he falls, the clan spends **10 active seconds choosing a new Khan** while riders, ancestral echoes, and camp defenses keep fighting. A visible countdown marks succession. The successor returns at the current camp or moving caravan with full maximum health, a ready gallop, and 3 seconds of protection. All research, resources, buildings, and journey progress carry on. Menus pause the countdown. Golomt’s Last Ember saves the current Khan immediately once per expedition; its charge does not refresh for successors. Losing the clan’s people or resolve still ends the expedition.

A portable barricade of lashed wooden hurdles and indigo and rust felt bands surrounds the camp. It expands around growing households and new crafts, then travels as low wheeled screens around the caravan. Enemies stop at its edge and repeatedly attack clan resolve until defeated; hostile shots strike the barrier itself. Struck panels briefly jolt and brighten, and worn wood and frayed cloth reflect low resolve. Your Khan, riders, and camp defenses can still defeat the attackers. Packing up makes attackers pursue the moving caravan again when it leaves their reach. The barricade uses the clan's existing resolve and protection rather than a separate health pool.

Pastures deplete and spawn pressure increases while you stay. After 45 active seconds at a camp, press **M** to inspect routes. You choose when to leave. Stay to gather materials and grow, or pack up before grazing and provisions run out. Refugees strengthen your host but consume food. Starvation and attacks can cost families and livestock; losing all people or clan resolve ends the run.

Choose a river crossing for food and horses, an exposed ridge for materials and spirit, or blue banners for refugees and veteran riders. **Rewards arrive only after a successful crossing.** The caravan travels east automatically; ride alongside it and defend the supply carts. Structures cannot be developed while packed. Arrival restores some resolve and a living Khan’s health, refreshes the pasture, and preserves your build and uncollected XP.

The journey's chapter pressures follow the clan through whichever camps it chooses. After the first crossing, the White Silence reduces grazing and caravan speed. After the second, the Earth That Walks brings ground eruptions that warn before striking. At the fictional Heart of the Steppe, the Red Eclipse weakens rituals and brings the Skybreaker. Protect your people for three minutes until the passage opens. **Victory depends on saving the clan; killing the boss is optional.** Defeating it restores resolve.

In a story expedition, victory opens **A place beside the fire**, a skippable epilogue reflecting survivors, recorded losses, clan identity, the clerk's shared tally, and the Skybreaker's fate. Journey results follow, with the epilogue available to read again. Story choices and memories reset with each new expedition; they do not add permanent unlocks or a resumable save.

An expedition is intended to take about 15 minutes with roughly three minutes of growth per camp. Earlier departures shorten the journey; longer stays increase danger. This is a prototype balance, not a fixed time limit.

Plan supplies with the live **Food net** rate and **Stores empty in** estimate beneath
the resource bar. The estimate follows pasture depletion or recovery, current
households, winter conditions, and learned improvements; food can be increasing now
and still run out later. During crossings and the final stand, it reports whether
supplies last to arrival or the passage opening. Imminent shortages remain visible
when tips are hidden. In the camp inspector, **Provisions & gathering** breaks down
production, consumption, and material gathering, while eligible craft cards preview
their before/after rates, immediate food grants, time until stores empty, and the
range of food needed across the available crossing routes. You can
preview a craft while saving up its resource cost. Route cards show estimated travel
time, food needed en route, food after arrival rewards or rescue costs, and shortages
before arrival. Estimates assume current households and improvements without future
battle losses or purchases; risky routes remain your choice.

For a detailed reference to resources, combat, enemies, progression, and both upgrade trees, see [the game mechanics brief](docs/game-mechanics.md). For every camp cost, dependency, effect, and cultural source, see [the camp upgrade tree](docs/camp-upgrade-tree.md). For all 42 technologies and specialization routes, see [the patron tech tree](docs/patron-tech-tree.md). For adding progression content and extending the UI, see [the progression UI guide](docs/progression-ui.md).

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

Longest journey and sound preference persist. Writes are validated, serialized, and atomically renamed. Native saves never use the install directory or localStorage. Browser preview saves remain separate. A run itself is not resumable after quitting.

## Project map

```text
src/game/config.ts             Balance, world, and journey timings (seconds)
src/game/types.ts              Run, clan, and snapshot contracts
src/game/state/run.ts          Experience, traditions, run lifecycle
src/game/state/khan.ts         Khan presence, lethal hits, and active-time succession
src/game/state/clan.ts         Economy, construction, migration, victory
src/game/state/camp.ts         Typed camp effects, neutral defaults, and once-only grants
src/game/data/clan.ts          Buildings, specializations, routes, regions, formations
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
src/ui/campContent.ts          Camp nodes, prerequisites, costs, and exclusive paths
src/ui/campModel.ts            Painted camp scene with anchored upgrade parchments
src/camp.css                  Camp landscape, sites, and responsive inspector layout
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

Copyright © 2026 Leon Lee. All rights reserved.
