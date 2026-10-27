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

## Runtime slice and gate

The first enabled V2 nodes are Feathered Fan, Spirit Signal, Memory Vessels,
Quiet Council and Ancestral Archers. The scene calls shard and Khan-hit hooks;
echo support consumes target priority, firing cadence and bounded twin releases.
Timers use active expedition seconds and are retained in optional version-1 save
fields; old saves need no migration. Quiet Council protects aggregate resolve only
while an actual echo is within 165 paces of camp. Feathered Fan affects personal
multi-arrow volleys, separately from rider and echo shots.

**Phase 3 gate is not passed:** Ongod's Bond of Ashes has no expiring echo lifecycle;
Whispered Orders has no echo stances; Ancestral Legion needs coordinated formation
ownership; Council of Many Voices needs temporary lesser-echo lifecycle. These
systems require their own gameplay milestone. Remaining Archery/Ongod effects are
registered but unavailable at this gate; no claim of two complete Mythic paths is
made. The shipped portion is a tested compatibility and early-research slice.

## Interface and camp boundary

The overview places eight patron regions around General Research, with a separate
Hybrid Discoveries region and sixteen labelled Early/Advanced bridge cards. Working
bridges show proximity to their gates; unavailable discoveries remain clearly marked
as proposals. The branch map zooms from 60–150%; Compact list and narrow layouts
keep text and keyboard controls usable without shrinking the whole catalogue.

Select a locked node to inspect all blockers, required ranks, ANY alternatives,
patron spending and crossing milestones. Pin a working goal to retain its legal
purchase path, including side purchases that fund tier gates. The bounded path
search refuses unavailable goals instead of displaying an invented working route.
Pinned targets remain reachable when a search filter hides their branch. Doctrine
and Mythic purchases require a second explicit confirmation; no respec is offered.

Combined stat previews run the real transaction on a clone. Building contributions
are listed separately. The read-only adapter strips the legacy Rolling Fortress
technology multiplier from the **building** source label while retaining it in the
combined runtime total. Optional counts/categories remain zero until the separate
camp branch supplies that contract. No camp structures or save IDs are repurposed.

The [effect inventory](patron-research-v2-status.md) lists every unimplemented effect.
Registered, purchasable and functional counts are intentionally distinct: 166
registered technologies, 53 working/purchasable technologies, 113 unavailable proposals.
