# The portable clan encampment

The camp represents travelling infrastructure, household skills, movable possessions, and clan organisation. It is inspired by the Family Estate’s role as a household foundation in [CK3: Roads to Power](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-roads-to-power); this game’s progression, economy and fiction remain its own.

## Progression model

The five central tiers are Wandering Clan, Established Encampment, Prosperous Ordo, Great Ordo, and Imperial Ordo. They unlock 2, 3, 4, 5, and 6 building plots, and 1, 2, 3, 4, and 6 internal development slots. The central encampment occupies no plot and cannot be demolished. The starting Family gers occupy the first plot. Six plots among eight facilities make construction a strategic choice; there is no demolition or respecialisation in this prototype.

| Tier | Encampment             | Upgrade price before discounts | Plots / internal slots | Additional requirement      | Continuing benefit                                   |
| ---- | ---------------------- | ------------------------------ | ---------------------- | --------------------------- | ---------------------------------------------------- |
| 1    | Wandering Clan         | Provided                       | 2 / 1                  | —                           | Starting organisation                                |
| 2    | Established Encampment | 45 materials                   | 3 / 2                  | Tier 1                      | Material gathering ×1.1                              |
| 3    | Prosperous Ordo        | 95 materials +10 Spirit        | 4 / 3                  | Tier 2; Family gers level 2 | Food production ×1.1; clan damage taken ×0.95        |
| 4    | Great Ordo             | 165 materials +25 Spirit       | 5 / 4                  | Tier 3; Family gers level 3 | Host firing interval ×0.95; migration mobility ×1.06 |
| 5    | Imperial Ordo          | 260 materials +45 Spirit       | 6 / 6                  | Tier 4; Family gers level 3 | Material gathering ×1.2; clan damage taken ×0.85     |

Benefits accumulate. Guardian discounts apply to material prices, rounded up; Spirit and worker requirements are unchanged.

All eight existing facilities have three levels. Archery grounds, Spirit sanctuary, Wagon circle, and Feltmakers’ workshop offer mutually exclusive fourth-level specialisations. Family gers and Herding grounds retain their earlier household/herding choices. The original 37 craft IDs and all their gameplay checks remain; 16 ordinary facility levels and two felt specialisations extend the catalogue to 55 developments. `clan.buildings` still counts establishment plus learned developments. Use `buildingLevel()` for an actual facility level, rather than treating that counter as a level.

Clan Council, Ancestral Hearth, Master Craftsmen, War Council, Supply Organisation, and Travelling Merchants have two ranks each and reserve internal slots independently of plots. Their production, consumption, Spirit income, rider damage, and arrival benefits use the existing simulation. Merchants are an abstract arrival benefit, not a trading/inventory subsystem.

| Internal development | First available tier | Benefit per rank                    |
| -------------------- | -------------------- | ----------------------------------- |
| Clan Council         | 1                    | Food consumption ×0.95              |
| Ancestral Hearth     | 1                    | Stored Spirit from defeats ×1.15    |
| Master Craftsmen     | 1                    | Material gathering ×1.1             |
| War Council          | 2                    | Accompanying rider damage ×1.15     |
| Supply Organisation  | 2                    | +8 food on completed crossings      |
| Travelling Merchants | 3                    | +6 materials on completed crossings |

An internal first rank costs 24 materials, 4 Spirit, and one reserved worker. Its second rank costs 42 materials and 10 Spirit, needs camp tier 3, and reserves no additional worker or slot. Ordinary facility levels 2 and 3 cost 30 materials and 55 materials +5 Spirit respectively, with corresponding camp-tier requirements. Family gers welcome four people at each of these level upgrades. Fourth-level choices retain the facility's authored specialisation costs and require camp tier 4 and facility level 3.

## Code contracts

- `data/campEstate.ts` authors tiers, internal developments, and facility level extensions. Existing facilities and crafts remain in `data/clan.ts`.
- `GAME.camp.estate` holds new balance values, costs, slot allowances, and effect strengths.
- `state/campEstate.ts` derives facility levels, validates plot/tier/building/worker requirements, and purchases central or internal improvements. Each successful purchase adds one chronicle memory titled with the tier or rank; rejected purchases record nothing. Reactions come from `estateReaction` in `data/storyReactions.ts` and follow the shared memory bounds, reaction spacing, remnant voice, and Camp scenes setting described in [the story guide](story-prototype.md#lived-history).
- `state/clan.ts` still validates and charges facility purchases. Plot assignment happens only after all blockers pass. Replayed purchases cannot charge again.
- `state/camp.ts` applies typed effects once. Economy, patron stacking, targeting, protection, support fire, and arrival rewards consume the existing effect state. Spirit multipliers now include camp effects.

`clan.estate` contains only the central tier, plot assignments, and internal ranks. Facility levels and specialisations use stable IDs in `clan.paths`, so there is no second progression copy in the DOM. Migration keeps these objects and their accumulated effects. Packed camps cannot purchase. New worker reservations require spare families; upgrades that reserve no new workers remain possible after casualties. Combination planning totals the missing central tiers, facility levels, and prerequisite crafts once, using current patron discounts.

Legacy in-memory snapshots without `estate` retain their original craft gates and reservations until they adopt central progression. Existing facilities are grandfathered when reconstructing plot assignments, including any old camp over the six-plot limit; they are never silently deleted. New expeditions always receive the new two-plot rules. Tests for legacy craft prices explicitly use legacy snapshots; fresh-estate tests exercise the new restrictions.

## Verification

Unit tests cover starting capacity, exact discounted costs, invalid and replayed purchases, independent slot types, worker reservation, camp/building gates, sequential facility levels, exclusive choices, tier caps, mechanical modifiers, and migration retention. The existing craft, economy, and patron tests continue to cover their established effects.

## The painted interface

Camp management is one full illustrated scene. The large central ger opens encampment progression and its internal developments. Buildings occupy the painted plots; an empty unlocked plot opens a construction chooser. Locked plots explain the central tier needed to claim them. There are no persistent navigation, development, or inspector columns.

One parchment is open at a time, positioned beside its selected site and clamped into the viewport. It shows facility level, description, continuing bonuses, actual next-purchase changes, costs, blockers, and a validated action. **Unfold levels & specialisations** expands that same parchment with a vertical path and explicit forks. Complementary crafts remain in a folded section. Clicking a completed or locked entry inspects it without spending. Escape/controller Back dismisses the parchment first and restores focus to its building, then closes camp management on the next press. The frame’s return/close actions leave camp directly.

`campModel.ts` composes the existing local painted PNGs and registered resting poses into the scene. `campPopups.ts` adapts state and authored effects into small parchment views. `GameUI` retains only selection and foldout state; purchases and phase transitions remain in `ArenaScene`. Search, provisions, and combinations also use temporary parchments. Narrow screens keep the scene behind a bounded popup, and live reduced-motion preferences still stop ornamental motion.

## Portable camp saves

The profile has an optional, versioned `camp` record. Old profiles still load unchanged; a malformed camp field is discarded without discarding score, sound, or command-history preferences. `shared/campArchive.ts` validates bounded IDs, ranks, plot arrays, and finite supplies before native persistence. `GamePlatform.saveCamp` deep-copies queued snapshots; the existing sandboxed bridge and atomic `ProfileStore` handle disk writes. No new filesystem or IPC capability is exposed.

`captureCampArchive` records organisation, owned facilities, stable craft IDs, internal ranks, and stores. `runFromCampArchive` reconstructs a fresh run from known content and applies each continuing benefit once. Saved stores replace replayed immediate grants, so load cannot repeatedly award welcome gifts or food. Removed content is ignored; contradictory specialisations and descendants of their excluded branches cannot stack. Profile and archive tests cover old profiles, malformed records, native round trips, independent copies, and identical reconstruction.

This is a **portable camp checkpoint**, not a mid-battle expedition save. The integration saves after successful purchases and completed migrations. **Continue clan camp** brings that organisation and those stores into a fresh expedition; patron research, battle actors, journey time, and story progression restart. **New Game** still starts with the original eight people and a new two-plot camp. Developer/cheated runs do not overwrite the camp checkpoint.

For resuming the complete journey, including research and the battlefield, use **Continue expedition** or **Saved expeditions**. See [the separate full-save contract](expedition-saves.md).
