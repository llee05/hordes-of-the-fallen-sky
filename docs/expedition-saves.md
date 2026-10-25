# Expedition saves

Expeditions use versioned snapshots stored separately from profile preferences and portable camp checkpoints. `GamePlatform` is the renderer entry point. The desktop bridge exposes only four fixed slots (`auto`, `slot-1`, `slot-2`, `slot-3`) and list/load/save/delete operations; it never accepts paths. Browser previews use separate local storage keys.

`ProfileStore` validates bounded plain data before accepting a snapshot, serializes writes, flushes the temporary file, and atomically renames it. Each overwrite keeps the preceding valid snapshot in a `.bak` file. Loading recovers that backup if the primary is missing or corrupt, and the slot listing identifies recovered saves. A newer, unsupported version is reported as incompatible rather than silently replaced with an older backup. Deleting a slot removes its backup too.

Native files live in the existing Electron user-data `saves/` directory as `expedition-<slot>.json`. They are never written to the installation directory. Existing `profile.json` files remain compatible. Errors propagate to the caller; failed writes must not be reported as successful saves.
