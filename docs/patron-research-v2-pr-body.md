Patron Research V2 now wires 65 of the 67 previously deferred effects. Of those,
50 are working and 15 remain unavailable because their prerequisites need missing
systems. Across the full registry, 103 technologies are working and 63 unavailable
(48 unwired plus 15 prerequisite-blocked). Prerequisites and wired handlers are retained.

The following complete prerequisite-blocked inventory is excluded from the working total:

- Call of the Pack (`bc-call-of-the-pack`): effect wired; blocked by prerequisite Signals in the Dark (`bc-signals-in-the-dark`) (needs an unexplored point-of-interest discovery pool).
- Endless Pursuit (`bc-endless-pursuit`): effect wired; blocked by prerequisite Signals in the Dark (`bc-signals-in-the-dark`) (needs an unexplored point-of-interest discovery pool).
- Camp of Craftspeople (`ee-camp-of-craftspeople`): effect wired; blocked by prerequisite Many Hands at Work (`ee-many-hands`) (needs the separate camp branch’s optional building count); prerequisite Shared Tools (`ee-shared-tools`) (needs a stationary material-node harvesting lifecycle).
- The Wandering City (`ee-wandering-city`): effect wired; blocked by prerequisite Many Hands at Work (`ee-many-hands`) (needs the separate camp branch’s optional building count); prerequisite Shared Tools (`ee-shared-tools`) (needs a stationary material-node harvesting lifecycle).
- Unbroken Seasons (`ee-unbroken-seasons`): effect wired; blocked by prerequisite Bounty in Scarcity (`ee-bounty-in-scarcity`) (needs a food reserve capacity/percentage contract); prerequisite Milk and Meat (`ee-milk-and-meat`) (needs travelling provision inventory and capacity); prerequisite Winter Larder (`ee-winter-larder`) (needs a separate protected-food reserve channel).
- Horn of the Host (`su-horn-of-the-host`): effect wired; blocked by prerequisite Banner Orders (`su-banner-orders`) (needs a rider Focus Fire command).
- Banner Formation (`su-banner-formation`): effect wired; blocked by prerequisite Call to Arms (`su-call-to-arms`) (needs individual exposed wagons and rider guard assignments).
- The Last Wagon (`su-last-wagon`): effect wired; blocked by prerequisite Roadward Captains (`su-roadward-captains`) (needs individual wagon hit events and rider escort assignments); prerequisite Discipline of the Road (`su-discipline-of-the-road`) (needs an individual rider loss model).
- The Great Kurultai (`su-great-kurultai`): effect wired; blocked by prerequisite Captains of Ten (`su-captains-of-ten`) (needs a companion combat damage-resistance channel); prerequisite Banner Orders (`su-banner-orders`) (needs a rider Focus Fire command).
- Defended Passage (`gu-defended-passage`): effect wired; blocked by prerequisite Shelter Stakes (`gu-shelter-stakes`) (needs individual structure durability).
- Fast Unpacking (`gu-fast-unpacking`): effect wired; blocked by prerequisite Repair Crews (`gu-repair-crews`) (needs structure durability and material repair).
- City of Felt and Wood (`gu-city-of-felt-and-wood`): effect wired; blocked by prerequisite Moving Workshop (`gu-moving-workshop`) (needs structure rebuilding time and repair-waste channels); prerequisite Repair Crews (`gu-repair-crews`) (needs structure durability and material repair).
- Living Waters (`hy-living-waters`): effect wired; blocked by prerequisite Milk and Meat (`ee-milk-and-meat`) (needs travelling provision inventory and capacity); prerequisite Winter Larder (`ee-winter-larder`) (needs a separate protected-food reserve channel).
- Thousand Arrows (`hy-thousand-arrows`): effect wired; blocked by prerequisite Banner Orders (`su-banner-orders`) (needs a rider Focus Fire command).
- Last Stand of the Hearth (`hy-last-stand-of-hearth`): effect wired; blocked by prerequisite Ring of Stones (`gu-ring-of-stones`) (needs a structure protection/durability channel); prerequisite Shelter Stakes (`gu-shelter-stakes`) (needs individual structure durability).

Bounty in Scarcity (`ee-bounty-in-scarcity`) remains deferred for the missing
reserve-percentage/capacity contract. Roadward Captains (`su-roadward-captains`)
remains deferred for missing individual wagon events and escort assignments.
The reusable crossing material-spend ledger is retained.

Vigilant Herders forecasts now integrate its remaining active duration across
camp pasture boundaries, final-stand limits, crossing previews and migration
shortages. Behavioral regressions compare forecast depletion with simulated food
depletion and crossing stores. The outer validation phases supply final check results.

Wagon ricochets emit exactly one arrow with the incoming hit damage, without
reapplying volley factors, Burning Tempest expansion or Encircle damage. Browser
regressions exercise the combined bonuses for piercing and nonpiercing arrows
and confirm ricochets cannot trigger another ricochet.

Captured Full triage output supplied for this delivery:

```text
tier: Full
head: 9bfd5df87b96  changed_files: 45  changed_lines: 4917
reasons: core/save/platform path: src/game/config.ts; core/save/platform path: src/game/scenes/ArenaScene.ts; core/save/platform path: src/game/state/clan.ts; core/save/platform path: src/game/state/economy.ts; core/save/platform path: src/game/state/encounters.ts; core/save/platform path: src/game/state/expeditionArchive.ts; core/save/platform path: src/game/state/khan.ts; core/save/platform path: src/game/state/mountedCombat.ts; core/save/platform path: src/game/state/nomadicCamp.ts; core/save/platform path: src/game/state/patronSupportClock.ts; core/save/platform path: src/game/state/patrons.ts; core/save/platform path: src/game/state/researchCompanions.ts; core/save/platform path: src/game/state/researchEchoes.ts; core/save/platform path: src/game/state/researchGuardian.ts; core/save/platform path: src/game/state/researchHybrids.ts; core/save/platform path: src/game/state/researchLeadership.ts; core/save/platform path: src/game/state/researchRuntime.ts; core/save/platform path: src/game/state/researchTerrain.ts
checkpoint: none
skip: none
run: no-mistakes axi run --intent "<captain intent>" --verification-plan "<the exact test commands and specs you already ran, and what they proved>"
```
