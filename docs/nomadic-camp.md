# The nomadic camp

Camp management is a single illustrated manuscript landscape with small parchment nameplates, diamond badges and a contextual upgrade popover. Existing painted gers, horses, carts, banners and props remain local assets. The central Khan's Ger and four other core households always exist; five additional locations let a player choose five different workplaces from fourteen options. This replaces the former eight-facility, five-tier and internal-development systems.

## Buildings and progression

Every building has Basic, Established and Advanced levels. Each level has authored resource costs, continuing effects, prerequisites and a registered visual state. The architecture can extend to five levels by adding content, prices and raising the shared validated maximum; UI layout and purchase logic do not assume three fixed cards.

| Permanent core  | Purpose and current benefits                                                                         | Deferred benefits                          |
| --------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Khan's Ger      | Material gathering, population capacity (40 / 80 / 120); gates the matching level of other buildings | Leadership                                 |
| Horse Lines     | Migration mobility                                                                                   | Mount speed and effectiveness              |
| Herding Grounds | Passive food production, existing grazing and retreat formation support                              | Leather and wool                           |
| Communal Hearth | Food efficiency, active-time Khan recovery and stationary resolve recovery                           | —                                          |
| Wagon Yard      | Existing defensive-cart support, migration mobility and materials after a completed crossing         | Storage capacity and relocation efficiency |

All five cores start at level 1. They cannot be removed or exchanged, reserve no additional workers, and take no optional location. Each optional building reserves one worker on construction, retained through its upgrades. Casualties do not destroy workplaces or prevent upgrades that reserve no new workers.

| Optional building         | Category             | Current integration                                                                 | Deferred integration                                                      |
| ------------------------- | -------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Archery Range             | Military             | Existing mounted archers and combat formations; damage, firing cadence and piercing | —                                                                         |
| Smith's Forge             | Military             | Weapon damage and clan protection                                                   | Equipment crafting and armour effectiveness                               |
| Warrior's Training Ground | Military             | Existing escort damage                                                              | Companion capacity, strength and abilities                                |
| Scout's Watchpost         | Military             | Collection radius and materials after crossings                                     | Exploration radius, hidden discoveries and expedition reward improvements |
| Fletcher's Workshop       | Military             | Additional projectile, firing cadence, piercing and fire-arrow unlock               | —                                                                         |
| Palisade & Watchfires     | Military             | Clan protection                                                                     | Guard strength                                                            |
| Hunting Lodge             | Economy & survival   | Food production and food after crossings                                            | Rare animal resources and hunting expeditions                             |
| Artisan's Ger             | Economy & survival   | Material gathering and food efficiency                                              | Crafting and equipment systems                                            |
| Trading Post              | Economy & survival   | Materials after crossings                                                           | Trade rates, merchant stock and rare trade goods                          |
| Healer's Ger              | Economy & survival   | Maximum health and active-time recovery                                             | Healing-effectiveness modifiers                                           |
| Sacred Ovoo               | Spiritual & cultural | Existing sanctuary lightning, Spirit gain and protection                            | Patron blessings                                                          |
| Shaman's Ger              | Spiritual & cultural | Burn damage and the story world's fictional wind-magic unlock                       | Spiritual abilities, rituals and corruption cleansing                     |
| Ancestral Standard        | Spiritual & cultural | Existing escort damage and resolve recovery                                         | Companion morale and patron-related bonuses                               |
| Storyteller's Hearth      | Spiritual & cultural | Experience gain, banked technology progression and Spirit gain                      | Lore discoveries                                                          |

These spiritual benefits describe the fictional Sundering and the game's supernatural calamity; they are not claims about historical Tengri practices. Unsupported mechanics are stored as typed `future` effect data and explicitly labelled **Planned** in the inspector. They do not create pretend merchants, inventories, companion actors, corruption systems or mount simulation.

All five optional locations begin empty and are immediately selectable. Inspecting a choice never reserves a location or charges supplies. One validated construction action occupies the selected location; a type already owned cannot be constructed again or moved into another location. There is no demolition or replacement action yet. The slot instances and IDs allow those actions to be introduced later without redesigning ownership.

Default construction costs are 24 materials; levels 2 and 3 cost 40 and 70 materials. Spiritual buildings additionally cost 8, 12 and 20 Spirit respectively. Core level 1 is provided. Guardian material discounts apply with rounding up; workers are reserved rather than consumed. Level 2/3 requires the Khan's Ger at level 2/3. All balance values live in `GAME.camp.nomadic`.

The Khan's Ger capacity governs new rescued or arriving households. Migration never deletes people already above their newly mapped capacity; they remain with the clan, and further arrivals wait until capacity is sufficient. A building purchase never heals or resurrects a fallen Khan, changes succession time, refreshes Last Ember, or opens the technology menu. Experience bonuses use the existing level-up banking rules.

## State, rendering and simulation

- `shared/nomadicCamp.ts` defines versioned ownership and validates exactly five cores, five optional slots, unique optional IDs and supported integer levels.
- `game/data/nomadicCamp.ts` is the reusable 19-building registry. Definitions own categories, descriptions, levels, costs, prerequisites, effects and visual states. Core positions are stable; optional positions belong to slots, not to a building type.
- `game/state/nomadicCamp.ts` validates and performs a purchase atomically. It applies typed ongoing effects and supported player modifiers once, records a chronicle memory, and preserves progression and existing patron modifiers. Future mechanics are derived from the same owned level data.
- `clan.nomadicCamp` is authoritative. `clan.buildings` and the few remaining craft flags are derived compatibility projections for existing battlefield actors, camp lightning, formations and fire-arrow interactions. They are not a second editable progression model. New runs reject the retired craft/tier purchase APIs.
- `ui/nomadicCampModel.ts` renders snapshot data using the existing shared parchment content builder and actual purchase previews. `GameUI` retains only selection/search state; `ArenaScene` owns action dispatch, persistence and phase changes.

The camp keeps one picture, rather than adding permanent navigation or inspector columns. Each location is clickable through its art or nameplate. Hover and visible keyboard focus identify the selected nameplate; Escape/controller Back dismisses its popover before leaving management. Search, Provisions and Combinations remain available above the painting. Small windows pan the map and retain a bounded popover. No simulation or character clock advances while planning.

Combination links inspect a building independently of the previously selected construction location. A combination is closed when its distinct missing optional buildings, including prerequisites, exceed the remaining locations; shared prerequisites count once.

The panorama and three-stage ger, wagon-workplace and archery-ground paintings are bundled local assets. Higher ranks add canopies, carved entrances, stores and equipment; existing sheep, horses, cairns and banners complete the scene. See [the artwork record](nomadic-camp-artwork.md) for assets, atlas metadata and generation prompts. Portable forges, healer/herbal supplies, hunting racks, storyteller circles and distinct companion-training equipment would further improve workplace differentiation.

## Portable checkpoints and full expeditions

The existing profile's version-1 camp envelope can include a strictly validated `nomadicCamp` ownership record. New checkpoints save choices and every level. Restoring a checkpoint begins a fresh expedition and reconstructs each camp benefit once, then restores the actual saved supplies. Each purchased building level restores its two doctrine points; free core level 1 awards none. It does not replay arrival, welcome or food gifts. Patron research and battle actors restart, as before. Full expedition saves retain battle, story, research, health, succession, earned knowledge and serialized clan identity without awarding building points again.

Old profiles and both save types migrate automatically:

| Old facility         | New building            |
| -------------------- | ----------------------- |
| Family gers          | Khan's Ger              |
| Örtöö relay          | Horse Lines             |
| Herding grounds      | Herding Grounds         |
| Provisioning ger     | Communal Hearth         |
| Wagon circle         | Wagon Yard              |
| Archery grounds      | Archery Range, optional |
| Feltmakers' workshop | Artisan's Ger, optional |
| Spirit sanctuary     | Sacred Ovoo, optional   |

Earned ordinary levels 2 and 3 carry over; an old exclusive craft is not mistaken for a free ordinary level. All five cores are provided at least at level 1. The three corresponding optional facilities retain ownership and occupy at most three locations, leaving at least two available choices.

Removed craft branches, central encampment tier purchases and internal ranks return their materials and Spirit at the applicable catalog prices. Old crafts are refunded rather than retained as hidden alternatives. Current population, livestock, food, stores and already-paid arrival/welcome gifts remain. Only retired building contributions are removed from ongoing camp effects, preserving lasting story-choice benefits before the new mapped levels are applied; the old remount speed multiplier is removed before applying the new model. Research, trust, transcripts, chronicles and every banked knowledge point remain intact in full expeditions. A versioned ownership record marks migration complete, preventing repeat refunds or effect stacking.

Legacy catalog definitions and explicit legacy test fixtures remain to validate old archives, reconstruct historical purchase effects and calculate refunds. They are not available through the current camp UI. New or malformed ownership records with duplicate choices, missing cores, unknown IDs or invalid levels are rejected by the existing validated save boundary; no filesystem or IPC capabilities were added.

## Verification

Tests cover all 19 registry entries, five empty locations, duplicate prevention, selected-slot construction, affordability and exact deductions, prerequisites, worker reservation, maximum levels, live effects, deferred effect data, save round-trips, old save migration, no double refunds, no replayed gifts, preserved knowledge and succession, and visible level states. Browser coverage exercises the painted map, optional chooser, popovers, search, controller confirmation/Back and both desktop sizes plus compact windows. Native Electron coverage verifies the production build, persistent choices/levels and layout across app restart.
