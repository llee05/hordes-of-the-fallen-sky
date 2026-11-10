# Developer tools

Press **Backtick** (<kbd>&#96;</kbd>, below Escape on a US keyboard) in a development
build to open the console directly over the battlefield. No developer-menu visit
or developer checkpoint is required. The command input receives focus immediately;
gameplay, physics, economy, and succession pause while the console is open.
Backtick, Escape, or F10 closes it and restores the previous screen. **F10** is an
alternate console shortcut. **F8** opens the separate level selector, which also
retains an embedded console.

See [the angled scene guide](world-3d.md#tools-and-limits) for camera controls,
terrain-only rendering, debug overlays, and their console commands.

Type a command and press Enter, or click the Khan/clan invincibility toggles.
Up recalls older commands; Down moves forward and restores unfinished input after
the newest entry. The latest 40 commands survive closing the console, developer
checkpoints, New Game, reloads, and app restarts. Commands are saved as recall text
through the existing profile store and never execute automatically. Holding Enter does not
repeat a command. Keyboard typing does not trigger movement, gallop, or menus.

Use `invincible on` (or `god on`) to ignore all damage to the Khan, including
contact, hostile projectiles, and hazards. `invincible off` restores normal damage.
This is a separate developer flag: it does not extend the normal hit/gallop
protection timer or make the Khan blink continuously. The HUD displays **INVINCIBLE**
while enabled. It does not resurrect a fallen Khan or prevent clan losses.

Use `clan-invincible on` to protect clan resolve, people, and livestock from
attacks, hostile projectiles, hazards, and starvation losses. `clan-invincible off`
restores normal losses; omitting the argument toggles it. This is independent of
Khan invincibility. Food consumption, economy, and journey clocks continue, and
protection does not replenish supplies or resurrect a lost clan. Both protection
flags carry between developer checkpoints and reset on a normal new run.
`state/clan.ts` accepts transient `ClanProtection` options; only the scene's DEV
guard supplies them for cheats, and they are never written into run or save data.

Cheats require an expedition that has started and has not ended. Using a cheat in
a normal expedition marks it as a developer run, preserving saved journey records.
Invincibility carries between developer checkpoints and resets when starting a
normal new run or reloading. Cheat flags are never saved to the profile; command
history is saved independently and remains available for recall.
The console, input bindings, and cheat effects are guarded by `import.meta.env.DEV`
and are absent from production and packaged play.

| Command                                 | Behaviour                                              |
| --------------------------------------- | ------------------------------------------------------ |
| `help`                                  | Lists commands and their usage.                        |
| `invincible [on\|off]`, `god [on\|off]` | Protects the Khan; no argument toggles.                |
| `heal`                                  | Restores the living Khan to full health.               |
| `clan-invincible [on\|off]`             | Protects clan resolve, people, and livestock.          |
| `status`                                | Displays invincibility, Khan health, and clan resolve. |
| `clear`                                 | Clears output while keeping command history.           |

Developer console rules live in the renderer-independent `src/game/dev/commands.ts`.
Use `help` for the complete command catalog. Omitting either
invincibility argument toggles that protection. Food and journey rules continue;
clan losses require the separate clan toggle to be protected.
Healing applies only to a living Khan and never skips
succession. Commands validate their arguments, cap output at 80 entries and history
at 40 commands, and retain history when output is cleared.
The scene owns a separate `console` phase and its return phase, independently of
the `developer` level-selector phase. Backtick is consumed once per native event,
including repeat/replay handling, and does not insert a stray character when
opening or closing the console. `GameUI` renders a dark console at the top of the
screen while retaining the battlefield and HUD underneath. Both controls remain
absent from production and packaged play.

## Playable class testing

Open **Developer mode** with F8 or from the title or pause menu, then select a
button under **Playable classes · start fresh expedition**. The selection
immediately replaces the current run with a fresh expedition at Mount Otgontenger,
using the selected starting tradition and class. Unlike stocked level checkpoints,
class runs use normal opening supplies plus character loadout bonuses. The saved
character profile supplies background, oath, and appearance when present;
otherwise the defaults are Steppe Herder and Oath of the Steppe.

This temporary picker does not save the class as a preference. Class runs show
**DEVELOPER RUN**, retain the current cheat toggles, and cannot overwrite normal
expedition saves or longest-journey records. A normal new run uses the saved
profile, if any. See [playable classes](game-mechanics.md#playable-classes) for
weapons, abilities, and progression. Character creation remains separate work.

## Level checkpoints

Run `npm run dev` for Electron or `npm run dev:web` for the browser. Choose
**Developer mode** at the title or pause menu, or press **F8** from any screen.
The selector pauses the entire expedition. Escape, F8, and Back return to the
original screen, retaining its paused or ended-run state.

Selecting a checkpoint replaces the current expedition immediately
and rebuilds the scene. Enemies, projectiles, shards, hazards, defeat
effects, camp packing, and succession start fresh. The HUD identifies
the expedition as **DEVELOPER RUN**. Start a new run from Pause or an outcome menu
to return to the title and begin a normal expedition with the original preferences.

The checkpoint catalog in `src/game/dev/levels.ts` lists exactly one entry per real
place, in `LOCATIONS` order, under **Real places**. IDs are `place:<location id>`,
for example `place:orkhon-valley`. There are no chapter or crossing checkpoints.

`createDeveloperRun(id)` returns a fresh, renderer-independent test expedition camped
at the chosen place, or `undefined` for an unknown or retired ID. Routes are
available immediately; migrations use the normal route and arrival rules.

Test expeditions have a healthy Khan, 24 people and generous supplies. No camp developments are selected automatically.
Guidance is off for the test expedition. Normal new games retain their
usual state and preferences. Test provisions are configured in `GAME.developer`.

Both the menu and scene actions are guarded by `import.meta.env.DEV`; production
and packaged builds have no selector or F8 binding. Developer defeats
leave the saved longest journey unchanged. Settings still save normally.

`npm run check` covers checkpoint state and the production build. Browser regression
tests in `tests/e2e/developer-mode.spec.ts` launch every checkpoint and cover frozen
menus, input, scene cleanup, records, normal restarts, and narrow layouts.
`npm run test:desktop` also checks the selector at native window sizes using an
isolated profile and a local Vite server, and checks its absence in the offline build.

## Crowd frame profile

`window.__gloam.hooks.profileCrowd(options)` measures a repeatable heavy fight in a
development build. Start a level checkpoint, then call it from the browser console:

```js
await window.__gloam.hooks.profileCrowd({ count: 350, seed: 1 });
```

It seeds `Math.random`, stops new arrivals, protects the Khan and clan, and spawns
`count` of the current place's enemies in a 240–1400 unit ring around the Khan, with
1e6 base health so the crowd survives. It pins the 3D render scale to 100%, waits
`warmup` seconds (default 2), then samples real frames for `seconds` (default 4).
The result gives fps, frame-time percentiles, simulation, render and idle time, and
mean milliseconds and calls per frame for each scene system and 3D render stage.
`navigation: true` also times terrain route and sight queries; those wrappers add
overhead to enemy behaviour, so compare such runs only with each other.
`hooks.crowd(options)` spawns the same seeded crowd without measuring.

Frame rate depends on the GPU. On a software rasterizer such as SwiftShader the GPU
wait hides CPU changes, so compare simulation and render milliseconds there.
The profiler only wraps methods during the sample and lives in `src/game/dev/frameProfile.ts`.

## Game-control hooks

Development builds expose typed controls on `window.__gloam.hooks` for agents,
scripts and browser tests (`ArenaTestHooks` in `src/game/scenes/arena/testHooks.ts`).
Validation and the state snapshot live in the renderer-independent
`src/game/dev/gameControls.ts`. Like the other hooks they are imported only under
`import.meta.env.DEV`; production and packaged builds contain none of them.
All options are checked before anything changes; an unknown option name throws.

| Control                   | What it does                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `getState()`              | Plain JSON: phase, place, elapsed, Khan, clan resources and camp, level and stats, enemies by type, shots, camera.  |
| `loadScenario(options)`   | Restarts at a real place with seeded randomness, an optional crowd, then (by default) freezes. Resolves with state. |
| `setCamera(options)`      | Centres on `{ x, y }` and stops following, sets `zoom`, or `{ follow: true }` follows the Khan again.               |
| `freezeVisuals(on)`       | Stops every scene step while rendering continues; pins the 3D render scale to 100%.                                 |
| `captureScene(options?)`  | Resolves once the view is unchanged for `frames` (default 3) rendered frames with no terrain pending.               |
| `exportMetrics(options?)` | Samples `seconds` (default 2) of frames: fps, frame times, per-system profile, counts, three.js `renderer.info`.    |

```js
const h = window.__gloam.hooks;
await h.loadScenario({ place: 'orkhon-valley', seed: 7, elapsed: 600, enemies: 200 });
h.setCamera({ x: 2600, y: 2400, zoom: 1 });
await h.captureScene(); // now take the screenshot
h.getState().enemies.byType; // { [enemyId]: { count, elites, positions } }
h.freezeVisuals(false);
await h.exportMetrics({ seconds: 3 });
```

`loadScenario` options: `place` (a `LOCATIONS` ID, as in the `place:<id>` checkpoints),
`seed` (default 1), `elapsed` (sets active seconds, which scale enemy health and
unlocks; omitted keeps the checkpoint's), `enemies` (seeded crowd, the same one
`hooks.crowd` places, default 0), `minRadius`/`maxRadius` (crowd ring, default
240–1400), `arrivals` (default false holds new arrivals), `protect` (Khan and clan
invincibility, default true), `settle` (fixed 60Hz simulated seconds before freezing,
default 0) and `freeze` (default true). It seeds `Math.random` when the restarted
scene starts and applies every option before the first scene step, so the same
options give the same scene. `Math.random` stays seeded afterwards so `advance`
repeats; reload the page to restore the browser's generator.

`freezeVisuals(true)` shadows Phaser's scene step, so simulation, physics, tweens,
particles and the gameplay-time animation clocks (characters, water) all hold still
while frames keep drawing. `advance(seconds)` still steps a frozen scene
deterministically. The camera keeps easing toward its follow target while frozen;
`captureScene` waits for that and for terrain chunks to finish loading.
`exportMetrics` counts frozen frames too; unfreeze first to measure simulation.

Not built yet: terrain editing (`setTerrain`) and a headless balance simulation
(`runSimulation`).

## Reference scenes

`tests/e2e/reference-scenes.spec.ts` compares fixed scenes with committed baseline
screenshots at 1280×800, so a change's effect on the look can be checked reliably.
Each scene is loaded with `loadScenario`, `setCamera` and `freezeVisuals`, then
`captureScene` before `toHaveScreenshot`. Scenes: each of the eight real places near
camp, an Orkhon Valley plateau edge with a ramp, a seeded 200-enemy fight, and the
title, character creation, saves and camp screens.

It is excluded from `npm run test:e2e` and runs only with its own script, which takes
the shared browser lock:

```sh
npm run test:reference                       # compare with the baselines
npm run test:reference -- --update-snapshots # write new baselines after an intended change
```

Baselines live in `tests/e2e/reference-scenes.spec.ts-snapshots/` and depend on the
GPU and browser that drew them, so create and compare them on the same machine.
Update them only for intended visual changes, inspect each new image, and commit
them with the change. A scene may differ by up to 1% of its pixels (per-pixel colour
threshold 0.2) to absorb antialiasing noise.
