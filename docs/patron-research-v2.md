# Patron Research V2 implementation record

## Phase 0: verified architecture and gaps

The implementation handoff and design catalogue (28 October 2026) were read in full.
The repository, rather than the source document's path sketches, controls integration.

| Feature                | Existing implementation                                                                             | Adapter                                     | Tested / blocker                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Knowledge              | `state/run.ts`: XP levels bank points; purchases spend `pendingUpgrades`                            | Pure research transaction                   | Existing run and patron tests                                                               |
| Definitions            | `data/upgrades.ts`, `data/specializations.ts`: 42 IDs, eight two-rank foundations, callback effects | Preserve legacy adapters; typed V2 registry | Existing patron tree tests                                                                  |
| Preview                | `state/progressionPreview.ts`: clone and apply, combined camp/patron metrics                        | Same authoritative validator as purchase    | Existing progression preview tests                                                          |
| Reset                  | `createRun` constructs fresh ranks, stats and effects                                               | Preserve                                    | Run / succession tests                                                                      |
| Saves                  | `state/expeditionArchive.ts` persists active expeditions including research and runtime entities    | Preserve version 1; validate new fields     | Archive tests; source document's claim that runs are not persisted is outdated              |
| Camp                   | `state/camp.ts`, `clan.campEffects` aggregate developments                                          | Read-only modifier boundary                 | No 5-core / optional-slot system yet; separate branch owns it                               |
| Combat                 | `ArenaScene`: volleys, piercing hit registry, damage, kills; actors pooled                          | Dedicated typed runtime adapters            | Existing mounted tactics and patron effects tests                                           |
| Gallop / momentum      | `state/mountedCombat.ts`, scene dash timers                                                         | Active-time adapters                        | Existing tests; momentum is internally 0–1                                                  |
| Echoes                 | `systems/PatronSupport.ts`, `state/patronSupportClock.ts`                                           | Target and cadence adapters                 | Permanent bounded echoes; no expiry, split, stance or formation lifecycle                   |
| Terrain                | Slowing fields, eruption warnings, mounted wake, pin and burn                                       | Existing active-time hooks                  | No general Marked, bleed, vulnerability or status-owner component                           |
| Crossings              | `story.crossings` stores completed crossings; economy handles arrival once                          | Milestone selector                          | Crossing / economy tests                                                                    |
| Discovery              | `state/fieldObjectives.ts` issues one timed objective                                               | None until discovery milestone              | No unexplored POI pool, sacred-site discovery, unlockable regional routes, ambush lifecycle |
| Structures / followers | Aggregate clan resolve and visual riders                                                            | None until feature milestones               | No individual wagon loss, structure durability/repair, follower health or companion AI      |
| Food                   | Aggregate food/pasture/materials                                                                    | Existing economy selectors                  | No protected reserve, separate provision inventory/capacity or emergency provisioning       |

Phases remain separate working commits. The typed catalogue will retain proposed
content with explicit unavailable reasons where the substrate is missing. Such
content must never be sold or advertised as a working effect. No camp buildings,
new discovery system, individual wagon simulation or follower lifecycle is in scope.
V1 numerical values remain unchanged in the compatibility rollout. Respec remains
unavailable: existing one-shot vitality healing and Last Ember need a separate safe
refund contract.
