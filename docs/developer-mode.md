# Developer tools

Press **F10** in a development build to open the compact, paused console with its
command input focused. The console is also at the top of **Developer mode / F8**,
alongside the full level selector.
Type a command and press Enter, or click **Khan invincibility** to toggle it.
Escape, F8, or F10 restores the exact previous screen. Up / Down recalls commands
and restores the unfinished input after the newest entry. Holding Enter does not
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
Invincibility and console history carry between developer checkpoints, and reset
when starting a normal new run or reloading. They are never saved to the profile.
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
`heal`, `status`, and `clear`. Omitting the invincibility argument toggles it.
Invincibility protects the Khan; the clan's damage, food, and journey rules continue.
Healing applies only to a living Khan and never refreshes Last Ember or skips
succession. Commands validate their arguments, cap output at 80 entries and history
at 40 commands, and retain history when output is cleared.

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
