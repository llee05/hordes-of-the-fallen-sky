# Expedition saves

Expeditions use versioned snapshots stored separately from profile preferences and portable camp checkpoints. `GamePlatform` is the renderer entry point. The desktop bridge exposes only four fixed slots (`auto`, `slot-1`, `slot-2`, `slot-3`) and list/load/save/delete operations; it never accepts paths. Browser previews use separate local storage keys.

`ProfileStore` validates bounded plain data before accepting a snapshot, serializes writes, flushes the temporary file, and atomically renames it. Each overwrite keeps the preceding valid snapshot in a `.bak` file. Loading recovers that backup if the primary is missing or fails envelope validation, and the slot listing identifies recovered saves. A newer, unsupported version is reported as incompatible rather than silently replaced with an older backup. Deleting a slot removes its backup too.

Native files live in the existing Electron user-data `saves/` directory as `expedition-<slot>.json`. They are never written to the installation directory. Existing `profile.json` files remain compatible. Errors propagate to the caller; failed writes must not be reported as successful saves.

## Playing and resuming

The title offers **Continue expedition** for the most recently saved valid slot. **Saved expeditions** is available from the title, pause, and results screens. Three manual slots show location, active journey time, clan population, Khan level, and local save date. Overwrite and delete actions require explicit confirmation; loading over a living expedition also confirms replacement. The autosave slot can be loaded or deleted but is written automatically. Starting a new expedition replaces autosave when the expedition begins; manual slots remain independent. Defeat/victory leave the last playable saves available to load.

Autosaves happen every 30 active seconds, when pausing (including focus loss), on starting an expedition, and after successful camp purchases, departure, and arrival. Checkpoint requests coalesce after synchronous changes finish; a request during a pending write schedules a fresh snapshot afterward. Restarting the scene invalidates old completion callbacks. Menus and time spent outside the game never advance simulation. Browser reloads recover the last completed save; desktop closes capture the current state first.

**Save and return to title** only leaves the expedition after saving succeeds. Developer checkpoints and cheated expeditions cannot save over normal expeditions. The old **Continue clan camp** action still starts a fresh journey using its portable facilities and supplies; it is independent from full saves.

## Snapshot and hydration contract

`game/state/expeditionArchive.ts` captures and validates version 1 data independently of Phaser. The envelope is bounded plain JSON (2 MB, bounded depth/arrays/strings/node count); the renderer additionally checks required nested state, enums, known enemy/location IDs, pool capacities, and actor references before restarting the scene. Chronicle Khan and clan-memory regions are limited to chapters 0–3; a Khan with `fallenAt` must also have `fallenRegion`. Recorded crossings use chapters 1–3 and known route IDs. Saved titles and clan memories render as escaped text. `GamePlatform` applies the same gameplay validation before offering browser or native saves for loading, including recovered backups. Slots with incompatible gameplay content report `incompatible` rather than `ready` or `recovered`, without trying another backup; content invalidated after listing is rejected on load and updates the slot status while retaining the current expedition. Structural schemas follow required default state, with explicit rules for optional and variable-size content. Changing incompatible gameplay schemas/content requires a version change or an explicit migration; future versions are never guessed at.

Legacy version 1 saves may contain retired research fields and pre-removal story records. Research fields are ignored, including unknown IDs; when retired progression is present, persistent stats are rebuilt from retained buildings and starting tradition. When story data is present, crossings and people lost migrate into legacy records if absent there, and recorded chosen responses remove their choice doctrine points before story data is discarded. Companion lines and reaction timers are removed from factual memories; their order and repeated entries remain. Story migration also clears the transient clan message and rebuilds ongoing camp modifiers from retained buildings and starting tradition, dropping story-granted lasting effects while preserving personal stats. Resources, levels, XP, and succession remain; already-applied resource gifts are not reversed. Loading does not replay gifts or purchases.

Snapshots preserve the entire run, including already-applied camp/stat effects and XP, succession and selected traits, crossing rewards and escort state, field objectives, and clan memories. They also preserve player/camp/rider positions, velocity and facing, animation clocks, combat/camp-support/encounter timers, hazards, live enemies, both projectile pools, and dropped XP.

Version 1 accepts an optional validated `run.character` profile. Saves without it
receive the default Mounted Archer identity while retaining stored stats and
effects; loading never reapplies class, background, oath, or progression bonuses.
The optional `world.timers.closeDefenseTimer` preserves the close-defense cooldown;
older saves without it start with close defense ready. `profile.json` separately
accepts an optional validated character profile for new expeditions; see
[developer class testing](developer-mode.md#playable-class-testing) for picker behavior.

Enemy pool slots and incarnation counters survive hydration, including inactive pool entries. Projectile hit references and enemy-owned warnings therefore continue to reference the same incarnation. Loading initializes actors directly rather than using spawn placement rules, which would reject existing nearby enemies. The boss reference is rebuilt from its saved definition. Terrain/navigation are reconstructed from the saved chapter, location, and migration route. Zoom is restored within the current viewport's limits. Non-gameplay defeat copies, dust, packing transitions, and ambient voices are recreated rather than persisted.

Hydration never calls purchase/apply-upgrade, arrival, healing, succession completion, or an active-time update. Stored effects are used directly for current saves. Version 1 also accepts the optional validated `clan.nomadicCamp` ownership record; saves without it undergo [legacy camp migration](nomadic-camp.md#portable-checkpoints-and-full-expeditions) before resuming. Compatibility building counters and craft flags are then derived from ownership. Loading opens **paused**; returning to combat is explicit. Held movement/touch inputs and cheat flags reset. No rewards or cooldowns are refreshed by loading.

## Desktop lifecycle and verification

The sandboxed preload supplies a narrow close-request/acknowledgement subscription. Native window close and Quit request the renderer's snapshot, pause active gameplay, wait for platform writes and the native queue, then exit. A storage failure keeps the game open and offers an explicit quit-without-saving choice. A stalled renderer gets a timeout dialog; a crashed/uninitialized renderer can still close using the last completed save. Sender/frame checks remain in place for every operation. No filesystem paths, raw IPC, Node access, or process control are exposed to the renderer.

Unit coverage exercises atomic replacement/recovery, ordering, invalid capabilities and data, preview persistence, nested snapshot validation, exact progression/cooldowns, succession, migration, and actor pool capacities. Browser coverage exercises save/load after reload, overwrite/delete confirmation, damaged-save errors, title return, developer isolation, and responsive layout. Electron coverage closes the actual window, reads isolated native files, relaunches, resumes paused, and verifies manual saves remain independent.
