# Starting clan traditions

The title's **Starting tradition** button opens four preparations for the fictional Blue Banner clan. **New Game** still opens the prologue immediately using the selected arrangement. The picker pauses all simulation; Back retains the selection for the next new expedition in this app session.

| Arrangement     | Food | Materials | Ongoing benefit                                               |
| --------------- | ---: | --------: | ------------------------------------------------------------- |
| Shared hearth   |   70 |        50 | Original balanced opening                                     |
| Outrider circle |   45 |        45 | One additional allied rider                                   |
| Hearthkeepers   |   70 |        30 | 15% less clan damage                                          |
| Pathfinders     |   55 |        40 | 7% faster Khan, 15% greater shard reach, 10% caravan mobility |

Every arrangement starts with eight people, three horses, the same [camp foundations and optional locations](nomadic-camp.md), and no learned patron technologies. These are original gameplay choices within one fictional clan, not historical classifications. They do not lock research, buildings, formations, or destinations. The resource tradeoffs delay provisions or early construction; benefits stack with later research and remain through migration and succession. Balance lives in `GAME.clan.starts`, metadata in `data/clan.ts`, and initialization in `state/run.ts`. The chronicle retains the chosen name and opening role.

Full expedition saves retain the stable arrangement ID and already-modified personal stats. Hydration never reapplies movement bonuses or starting supplies. Pre-feature saves omit the ID and use neutral ongoing modifiers. **Continue clan camp** retains its fresh-journey semantics and uses Shared hearth with the checkpoint's actual supplies, rather than granting another tradition's starting gift. Developer checkpoints remain neutral.

Unit tests cover costs, neutral compatibility, patron access, stacking, and save round trips. Browser tests cover selection, paused time, the prologue, narrow layout, and persistence after reload.
