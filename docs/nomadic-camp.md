# The portable clan encampment

The camp represents travelling infrastructure, household skills, movable possessions, and clan organisation. It is inspired by the Family Estate’s role as a household foundation in [CK3: Roads to Power](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-roads-to-power); this game’s progression, economy and fiction remain its own.

## Progression model

The five central tiers are Wandering Clan, Established Encampment, Prosperous Ordo, Great Ordo, and Imperial Ordo. They unlock 2, 3, 4, 5, and 6 building plots, and 1, 2, 3, 4, and 6 internal development slots. The central encampment occupies no plot and cannot be demolished. The starting Family gers occupy the first plot. Six plots among eight facilities make construction a strategic choice; there is no demolition or respecialisation in this prototype.

All eight existing facilities have three levels. Archery grounds, Spirit sanctuary, Wagon circle, and Feltmakers’ workshop offer mutually exclusive fourth-level specialisations. Family gers and Herding grounds retain their earlier household/herding choices. The original 37 craft IDs and all their gameplay checks remain; 16 ordinary facility levels and two felt specialisations extend the catalogue to 55 developments. `clan.buildings` still counts establishment plus learned developments. Use `buildingLevel()` for an actual facility level, rather than treating that counter as a level.

Clan Council, Ancestral Hearth, Master Craftsmen, War Council, Supply Organisation, and Travelling Merchants have two ranks each and reserve internal slots independently of plots. Their production, consumption, Spirit income, rider damage, and arrival benefits use the existing simulation. Merchants are an abstract arrival benefit, not a trading/inventory subsystem.

## Code contracts

- `data/campEstate.ts` authors tiers, internal developments, and facility level extensions. Existing facilities and crafts remain in `data/clan.ts`.
- `GAME.camp.estate` holds new balance values, costs, slot allowances, and effect strengths.
- `state/campEstate.ts` derives facility levels, validates plot/tier/building/worker requirements, and purchases central or internal improvements.
- `state/clan.ts` still validates and charges facility purchases. Plot assignment happens only after all blockers pass. Replayed purchases cannot charge again.
- `state/camp.ts` applies typed effects once. Economy, patron stacking, targeting, protection, support fire, and arrival rewards consume the existing effect state. Spirit multipliers now include camp effects.

`clan.estate` contains only the central tier, plot assignments, and internal ranks. Facility levels and specialisations use stable IDs in `clan.paths`, so there is no second progression copy in the DOM. Migration keeps these objects and their accumulated effects. Packed camps cannot purchase.

Legacy in-memory snapshots without `estate` retain their original craft gates and reservations until they adopt central progression. Existing facilities are grandfathered when reconstructing plot assignments, including any old camp over the six-plot limit; they are never silently deleted. New expeditions always receive the new two-plot rules. Tests for legacy craft prices explicitly use legacy snapshots; fresh-estate tests exercise the new restrictions.

## Verification

Unit tests cover starting capacity, exact discounted costs, invalid and replayed purchases, independent slot types, worker reservation, camp/building gates, sequential facility levels, exclusive choices, tier caps, mechanical modifiers, and migration retention. The existing craft, economy, and patron tests continue to cover their established effects.
