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

## Purchase and observation interfaces

`state/research.ts` owns `validateResearchPurchase`, `purchaseResearch` and
`previewResearchPurchase`. They accept a canonical ID and **expected current rank**;
refusal never mutates ranks, points or receipts. `state/run.ts`'s `applyResearch`
executes that transaction and the canonical effect adapter. The existing
`applyUpgrade(..., nextRank)` API remains a compatibility wrapper. Stat previews
project the same transition on a clone, raising only its hypothetical knowledge
budget; actual purchase blockers always retain the real budget.

New purchases retain `{ id, rank, cost, at }` receipts. Spend gates use costs actually
paid; ranks from older saves fall back to their unchanged authored prices. Version-1
expedition saves accept these optional receipts and observations without replaying
any purchase. Duplicate/unowned receipts are rejected. New expeditions discard them.
The final Ancestral Archers implementation counts each echo's targeted attacks
independently; empty release intervals do not advance its fourth-attack bonus.

The development console's `research-metrics` command is read-only. It reports
level-earned and accounted knowledge separately (developer grants can differ),
unspent/spent points, patron spend, tiers, Doctrine/Mythic/hybrid choices and the
first observed Mythic time. Damage groups distinguish Khan arrows, other allied
arrows, and support/other effects; they count effective health removed, excluding
overkill. Active-frame observations retain count, mean engine-frame delta and worst
delta, not a claimed GPU render profile. Menus add no observations. Older saves
retain unknown timestamps and frame history as unknown. No telemetry is uploaded.

## Balance evidence and release gate

Run `npm run research:benchmark` to reproduce twelve existing expedition pressure
models plus legal, dependency-validated allocation simulations at 45/60/75 points.
The models use real economy/purchases with modelled combat cadence and legacy build
choices; they are **not observed player runs or a combat simulation of gated effects**.

| Model schedule  | Full-journey time | Knowledge earned | Survivors |
| --------------- | ----------------- | ---------------- | --------- |
| Early migration | 518.25–538.5 s    | 7                | 4–7       |
| Riding          | 589–602.75 s      | 11               | 4–7       |
| Guarding        | 730.75–748 s      | 10               | 27–29     |

All twelve survive three crossings. The proposed 45–60-point budget is not supported
by this model. The unchanged XP curve requires 6,300 / 11,100 / 17,250 XP for
45 / 60 / 75 points. Every authored Mythic has a legal 17-point completion; hybrids
cost 6, 13, 19 or 23 points including their prerequisites and fillers.

| Authored example                                                    | Total knowledge | Fits 45 / 60 / 75 |
| ------------------------------------------------------------------- | --------------- | ----------------- |
| Focused Storm Archer with early hybrid and U3 general research      | 25              | yes / yes / yes   |
| Two-patron Thousand Arrows with two Mythics and U4 general research | 44              | yes / yes / yes   |
| Three-patron generalist with U3 general research                    | 55              | no / yes / yes    |

These are separate authoring scenarios, not simultaneous ownership of exclusive
alternatives and not permission to buy unavailable effects. No numerical V1
rebalance or knowledge-award increase is committed. Before enabling the gated late
tree, review its economy against observed runs: either lower new tier costs/gates
or expand expedition rewards after measuring combat, survival and caravan pressure.
Changing the whole XP economy from this model alone would not be justified.

The full 166-effect release gate remains unmet. This branch delivers the tested
53-technology slice and complete gated catalogue. Individual wagons/follower health,
structure repair/durability, provisions, discovery/ambush/route pools, temporary
summon lifecycles and the separate camp branch remain explicit feature milestones.

Performance verification used the project's exclusive-lock hardware-WebGL suite.
The browser pooled-combat case passes: 350 enemies, 19 textures, 29 draws and about
45 sampled FPS on Intel Iris Xe. Native combat records 350 enemies, 20 textures,
34 draws and about 60.56 FPS, then fails the existing `<20` texture assertion. Per
firstmate's confirmed baseline, the extra blank warnings texture is the existing
main-branch defect tracked by the [separate pending fix](https://github.com/llee05/hordes-of-the-fallen-sky/pull/30).
Texture bridge, renderer, assets and actor sources are unchanged from `main`; this
branch adds no texture allocations. The assertion is retained unchanged. Native
performance is therefore recorded as a known baseline failure, not a clean pass.

## Review corrections

Food forecasts integrate the difference between full-pasture and empty-pasture production, including Deep Roots during pasture depletion and recovery. Research selection resolves its branch from the complete catalogue and clears filters for prerequisite, route, bridge, graph and pinned-target actions.

Personal volley previews and firing share `state/volley.ts`, including Burning Tempest spacing, Feathered Fan, active Galloping Barrage and the current formation. Preview damage excludes momentum, retreat, charged-shot and enemy-specific bonuses, as labelled in the inspector.

All 166 technologies have a distinct `research:<id>` icon key. `src/ui/researchIcons.ts` authors each icon as a distinct subject/detail pair rendered through the existing 48-unit inline SVG brass silhouette system in `src/ui/artwork.ts`. Patron seals remain separate secondary badges. The unit regression checks both 166 unique keys and 166 distinct rendered drawings.
