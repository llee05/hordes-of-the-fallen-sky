# Developer tools

Press **Backtick** (<kbd>&#96;</kbd>, below Escape on a US keyboard) in a development
build to open the console directly over the battlefield. No developer-menu visit
or developer checkpoint is required. The command input receives focus immediately;
gameplay, physics, economy, and succession pause while the console is open.
Backtick, Escape, or F10 closes it and restores the previous screen. **F10** is an
alternate console shortcut. **F8** opens the separate level selector, which also
retains an embedded console.

The opt-in 3D terrain slice adds F6 for camera angle, F7 for terrain-only rendering,
and expanded F9 overlays. Its console commands are `camera-angle 55..80`,
`terrain-debug [mode]`, and `terrain-only [on|off]`. See [the 3D terrain guide](world-3d.md)
for enabling the prototype and inspecting its geometry.

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
The command catalog includes `help`, `invincible [on|off]` (`god` is an alias),
`clan-invincible [on|off]`, `heal`, `status`, and `clear`. Omitting either
invincibility argument toggles that protection. Food and journey rules continue;
clan losses require the separate clan toggle to be protected.
Healing applies only to a living Khan and never refreshes Last Ember or skips
succession. Commands validate their arguments, cap output at 80 entries and history
at 40 commands, and retain history when output is cleared.
The scene owns a separate `console` phase and its return phase, independently of
the `developer` level-selector phase. Backtick is consumed once per native event,
including repeat/replay handling, and does not insert a stray character when
opening or closing the console. `GameUI` renders a dark console at the top of the
screen while retaining the battlefield and HUD underneath. Both controls remain
absent from production and packaged play.

## Level checkpoints

Run `npm run dev` for Electron or `npm run dev:web` for the browser. Choose
**Developer mode** at the title or pause menu, or press **F8** from any screen.
The selector pauses the entire expedition. Escape, F8, and Back return to the
original screen, retaining its story, research, or ended-run state.

Selecting a checkpoint replaces the current expedition immediately, bypasses the
introduction, and rebuilds the scene. Enemies, projectiles, shards, hazards, defeat
effects, camp packing, succession, and boss state start fresh. The HUD identifies
the expedition as **DEVELOPER RUN**. Start a new run from Pause or an outcome menu
to return to the title and begin a normal expedition with the original preferences.

The checkpoint catalog in `src/game/dev/levels.ts` covers all four journey chapters,
all three approaches to each of the three crossings, and all eight named camps in
both chapters 2 and 3. IDs derive from the existing chapter, route, and location data.

`createDeveloperRun(id)` returns a fresh, renderer-independent test expedition or
`undefined` for an unknown ID. It uses the normal migration and arrival rules to
establish earlier crossings and their remembered destinations. The selected crossing
begins at zero progress; its rewards still require arrival. Camp checkpoints have
routes available immediately, and the final stand starts with its full timer and
the Skybreaker still to come.

Test expeditions have a healthy Khan, 24 people, generous supplies, and 40 unspent
knowledge points. No technologies or camp developments are selected automatically.
Camp scenes and guidance are off for the test expedition; earlier encounters are
recorded as passed without granting story gifts. Normal new games retain their
usual state and preferences. Test provisions are configured in `GAME.developer`.

Both the menu and scene actions are guarded by `import.meta.env.DEV`; production
and packaged builds have no selector or F8 binding. Developer victories and defeats
leave the saved longest journey unchanged. Settings still save normally.

`npm run check` covers checkpoint state and the production build. Browser regression
tests in `tests/e2e/developer-mode.spec.ts` launch every checkpoint and cover frozen
menus, input, scene cleanup, records, normal restarts, and narrow layouts.
`npm run test:desktop` also checks the selector at native window sizes using an
isolated profile and a local Vite server, and checks its absence in the offline build.
