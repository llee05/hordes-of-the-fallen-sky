# Expedition saves

Expeditions use versioned snapshots stored separately from profile preferences and portable camp checkpoints. `GamePlatform` is the renderer entry point. The desktop bridge exposes only four fixed slots (`auto`, `slot-1`, `slot-2`, `slot-3`) and list/load/save/delete operations; it never accepts paths. Browser previews use separate local storage keys.

`ProfileStore` validates bounded plain data before accepting a snapshot, serializes writes, flushes the temporary file, and atomically renames it. Each overwrite keeps the preceding valid snapshot in a `.bak` file. Loading recovers that backup if the primary is missing or corrupt, and the slot listing identifies recovered saves. A newer, unsupported version is reported as incompatible rather than silently replaced with an older backup. Deleting a slot removes its backup too.

Native files live in the existing Electron user-data `saves/` directory as `expedition-<slot>.json`. They are never written to the installation directory. Existing `profile.json` files remain compatible. Errors propagate to the caller; failed writes must not be reported as successful saves.

## Playing and resuming

The title offers **Continue expedition** for the most recently saved valid slot. **Saved expeditions** is available from the title, pause, and results screens. Three manual slots show location, active journey time, clan population, Khan level, and local save date. Overwrite and delete actions require explicit confirmation; loading over a living expedition also confirms replacement. The autosave slot can be loaded or deleted but is written automatically. Starting a new expedition replaces autosave when the expedition begins; manual slots remain independent. Defeat/victory leave the last playable saves available to load.

Autosaves happen every 30 active seconds, when pausing (including focus loss), on starting an expedition, and after successful camp purchases, research, story choices, departure, and arrival. Checkpoint requests coalesce after synchronous changes finish; a request during a pending write schedules a fresh snapshot afterward. Restarting the scene invalidates old completion callbacks. Menus and time spent outside the game never advance simulation. Browser reloads recover the last completed save; desktop closes capture the current state first.

**Save and return to title** only leaves the expedition after saving succeeds. Developer checkpoints and cheated expeditions cannot save over normal expeditions. The old **Continue clan camp** action still starts a fresh journey using its portable facilities and supplies; it is independent from full saves.

## Snapshot and hydration contract

`game/state/expeditionArchive.ts` captures and validates version 1 data independently of Phaser. The envelope is bounded plain JSON (2 MB, bounded depth/arrays/strings/node count); the renderer additionally checks required nested state, enums, known enemy/location/research IDs, research rank limits, pool capacities, and actor references before restarting the scene. Invalid data reports an error while retaining the current expedition. Structural schemas follow required default state, with explicit rules for optional and variable-size content. Changing incompatible gameplay schemas/content requires a version change or an explicit migration; future versions are never guessed at.

Snapshots preserve the entire run, including already-applied camp/patron/stat effects, unspent points and XP, Last Ember charges, succession and selected traits, crossing rewards and escort state, field objectives, clan memories and resolved story transcripts. Lasting story effects are already applied to `clan.campEffects`; companion trust is recomputed from the transcripts, so it needs no separate field. They also preserve player/camp/rider positions, velocity and facing, animation clocks, combat/support/encounter timers, hazards, live enemies, both projectile pools, and dropped XP.

Enemy pool slots and incarnation counters survive hydration, including inactive pool entries. Projectile hit references and enemy-owned warnings therefore continue to reference the same incarnation. Loading initializes actors directly rather than using spawn placement rules, which would reject existing nearby enemies. The boss reference is rebuilt from its saved definition. Terrain/navigation are reconstructed from the saved chapter, location, and migration route. Zoom is restored within the current viewport's limits. Non-gameplay defeat copies, dust, packing transitions, and ambient voices are recreated rather than persisted.

Hydration never calls purchase/apply-upgrade, arrival, story resolution, healing, succession completion, or an active-time update. Stored effects are used directly. Loading opens **paused**, except an unresolved story choice opens that same story; returning to combat is explicit. Held movement/touch inputs and cheat flags reset. No rewards or cooldowns are refreshed by loading.

## Desktop lifecycle and verification

The sandboxed preload supplies a narrow close-request/acknowledgement subscription. Native window close and Quit request the renderer's snapshot, pause active gameplay, wait for platform writes and the native queue, then exit. A storage failure keeps the game open and offers an explicit quit-without-saving choice. A stalled renderer gets a timeout dialog; a crashed/uninitialized renderer can still close using the last completed save. Sender/frame checks remain in place for every operation. No filesystem paths, raw IPC, Node access, or process control are exposed to the renderer.

Unit coverage exercises atomic replacement/recovery, ordering, invalid capabilities and data, preview persistence, nested snapshot validation, exact progression/cooldowns, story rewards, succession, migration, and actor pool capacities. Browser coverage exercises save/load after reload, overwrite/delete confirmation, damaged-save errors, title return, developer isolation, and responsive layout. Electron coverage closes the actual window, reads isolated native files, relaunches, resumes paused, and verifies manual saves remain independent.
