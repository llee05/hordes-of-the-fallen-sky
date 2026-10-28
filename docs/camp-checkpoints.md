# Portable camp checkpoint contract

The profile's optional `camp` field stores a versioned, bounded record of portable infrastructure. Its version-1 envelope includes the optional, strictly validated `nomadicCamp` ownership record and actual saved supplies. Legacy tier, slot, building, path and internal-rank fields remain for compatibility; new camp ownership uses `nomadicCamp`. It contains no renderer objects or executable content.

`src/shared/campArchive.ts` validates the record for both renderer and native persistence and normalises it to known schema fields. `normalizeProfile` keeps old version-1 profiles compatible and drops an invalid camp field without dropping valid score, sound, or developer-history preferences. `ProfileStore.save` rejects invalid records before its existing atomic write. The preload and trusted-sender checks are unchanged.

`GamePlatform.saveCamp` copies the camp, then queues an independent deep profile snapshot. A subsequent setting or camp write cannot change an earlier queued snapshot. Desktop writes use the existing native profile store; the browser preview uses its existing storage adapter.

`captureCampArchive` takes a portable camp record from a run. `runFromCampArchive` creates a fresh run, restores building choices and levels, reconstructs each purchased level’s effects and two doctrine points once, and finally restores saved supplies. Free core level 1 supplies its starting effects but no doctrine points. Arrival, welcome, population and food gifts are not replayed. Checkpoint restoration starts at full maximum Khan health. Full expedition saves instead preserve serialized clan identity without awarding building points again. See [the camp guide](nomadic-camp.md#portable-checkpoints-and-full-expeditions) for legacy ownership migration and refunds. The returned run has fresh battle, patron, journey-clock, and story state: this API is not a mid-battle resume mechanism.

The scene decides when a normal run should save and when an explicit Continue action should load. Developer/cheated expeditions must not replace the normal camp checkpoint. Profile-store and archive unit tests exercise bounded validation, compatibility, independent copies, deterministic effect reconstruction, and native filesystem round trips.

Full battlefield resumption is provided separately by [expedition saves](expedition-saves.md). The portable camp API keeps its fresh-expedition semantics and remains compatible with old profiles.
