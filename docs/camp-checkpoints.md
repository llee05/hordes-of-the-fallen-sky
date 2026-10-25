# Portable camp checkpoint contract

The profile's optional `camp` field stores a versioned, bounded record of portable infrastructure. It contains the central tier, plot assignments, established facility IDs, learned craft/level IDs, internal-development ranks, and supplies. It contains no renderer objects or executable content.

`src/shared/campArchive.ts` validates the record for both renderer and native persistence and normalises it to known schema fields. `normalizeProfile` keeps old version-1 profiles compatible and drops an invalid camp field without dropping valid score, sound, or developer-history preferences. `ProfileStore.save` rejects invalid records before its existing atomic write. The preload and trusted-sender checks are unchanged.

`GamePlatform.saveCamp` copies the camp, then queues an independent deep profile snapshot. A subsequent setting or camp write cannot change an earlier queued snapshot. Desktop writes use the existing native profile store; the browser preview uses its existing storage adapter.

`captureCampArchive` takes a portable camp record from a run. `runFromCampArchive` creates a fresh run, restores known facilities and their craft IDs, reconstructs each continuing effect once, and finally restores saved supplies. Replayed establishment/population/food callbacks cannot grant their gifts a second time. Unknown removed content is ignored, and conflicting specialisations cannot stack. The returned run has fresh battle, patron, journey-clock, and story state: this API is not a mid-battle resume mechanism.

The scene decides when a normal run should save and when an explicit Continue action should load. Developer/cheated expeditions must not replace the normal camp checkpoint. Profile-store and archive unit tests exercise bounded validation, compatibility, independent copies, deterministic effect reconstruction, and native filesystem round trips.
