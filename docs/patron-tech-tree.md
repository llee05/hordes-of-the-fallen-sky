# Patron tech tree

The catalog contains eight patrons and 42 technologies (50 authored ranks, including mutually exclusive alternatives). Their powers are original fantasy mechanics; cultural context and sourced writing boundaries live in [lore.md](../lore.md#patron-traditions).

## Purchase rules

Each level banks one knowledge point. Foundations have two ranks and cost one point per rank. Practices unlock after foundation rank one and cost one point. A focused capstone requires foundation rank two and its named practice and costs two points. Choose one capstone per patron; patron mixing and practice mixing remain unrestricted. A focused route therefore costs five knowledge points. Archery offers precision, piercing, and wide-volley capstones.

Stored Spirit is a separate camp currency. Expected-rank validation rejects stale purchases. Unspent points survive menus, succession, and crossings. New expeditions reset research. Complete mastery considers only reachable choices: excluded capstones do not prevent earned surplus knowledge from becoming provisions.

## Börte Chino · Hunting

Run with the hunt. Keep momentum, finish wounded enemies, and turn each moving kill into strength for the next pursuit.

| Technology / stable ID                       | Role                 | Cost | Requires                                               | Effect                                                                     |
| -------------------------------------------- | -------------------- | ---- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| **The wolf’s trail** · `wolf-trail`          | foundation (2 ranks) | 1    | None                                                   | Each rank: +15% friendly damage above half momentum; Khan rides 4% faster. |
| **The culling bite** · `culling-bite`        | practice             | 1    | The wolf’s trail rank 1                                | Friendly attacks deal 30% more damage to enemies below half health.        |
| **Never lose the quarry** · `pursuit-gallop` | practice             | 1    | The wolf’s trail rank 1                                | Gallop cooldown falls by 25%, from 3 seconds to 2.25.                      |
| **Blood of the hunt** · `blood-of-the-hunt`  | capstone             | 2    | The wolf’s trail rank 2 + The culling bite rank 1      | Every kill above half momentum restores 2 Khan health.                     |
| **Ride ahead of the storm** · `wind-rider`   | capstone             | 2    | The wolf’s trail rank 2 + Never lose the quarry rank 1 | Ride 10% faster; attacks above half momentum deal 20% more damage.         |

## Etügen Eke · Civilisation

Care for the living ground. Sustain the pasture, feed more households, and build a civilisation that can survive the long road.

| Technology / stable ID                                | Role                 | Cost | Requires                                                      | Effect                                                                                           |
| ----------------------------------------------------- | -------------------- | ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Tend the living ground** · `tended-pasture`         | foundation (2 ranks) | 1    | None                                                          | Each rank: food production +15%; pasture depletion falls by 15%.                                 |
| **Many hands, one camp** · `shared-labour`            | practice             | 1    | Tend the living ground rank 1                                 | Camp material gathering increases by 25%.                                                        |
| **Take only what we need** · `measured-herds`         | practice             | 1    | Tend the living ground rank 1                                 | People consume 20% less food, including during migration.                                        |
| **The earth remembers care** · `living-earth`         | capstone             | 2    | Tend the living ground rank 2 + Take only what we need rank 1 | Regrow 0.12 pasture percentage points each active second while stationary, offsetting depletion. |
| **Hands that build a people** · `hands-of-the-steppe` | capstone             | 2    | Tend the living ground rank 2 + Many hands, one camp rank 1   | Gather 40% more materials, strengthening the travelling camp economy.                            |

## Khükhedei Mergen · Archery

Make every shot count. Extend the host’s reach, send shafts through the unreturned, and fill the approach with arrows.

| Technology / stable ID                                 | Role                 | Cost | Requires                                                  | Effect                                                                                                   |
| ------------------------------------------------------ | -------------------- | ---- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **The measured bow** · `power`                         | foundation (2 ranks) | 1    | None                                                      | Each rank: shared attack damage +25%; Khan and rider targeting range +30 paces.                          |
| **An unbroken volley** · `haste`                       | practice             | 1    | The measured bow rank 1                                   | The mounted host’s firing interval falls by 15%.                                                         |
| **One shaft, two shadows** · `piercing-shaft`          | practice             | 1    | The measured bow rank 1                                   | Friendly arrows pierce one additional enemy. A single arrow cannot hit the same creature twice.          |
| **A sky full of arrows** · `sky-volley`                | capstone             | 2    | The measured bow rank 2 + Arrows across the steppe rank 1 | Add two arrows to every Khan volley. Friendly volley spacing widens a further 35%.                       |
| **Arrows across the steppe** · `wide-quiver`           | practice             | 1    | The measured bow rank 1                                   | One additional Khan arrow per volley; shared damage falls 10%, and friendly volley spacing widens 20%.   |
| **The unerring bow** · `one-perfect-shot`              | capstone             | 2    | The measured bow rank 2 + An unbroken volley rank 1       | Shared attack damage +60%; Khan and rider targeting range +60 paces. Focus on powerful, precise volleys. |
| **Through the gathered shadows** · `through-the-horde` | capstone             | 2    | The measured bow rank 2 + One shaft, two shadows rank 1   | Friendly arrows pierce two additional enemies. Focus on deep ranks of approaching enemies.               |

## Golomt · Survival

Carry the hearth through darkness. Recover from wounds, shelter the Khan, and keep one last ember against defeat.

| Technology / stable ID                          | Role                 | Cost | Requires                                                    | Effect                                                                                                    |
| ----------------------------------------------- | -------------------- | ---- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Keep the hearth alive** · `vitality`          | foundation (2 ranks) | 1    | None                                                        | Each rank: +20 maximum Khan health. A living Khan immediately recovers 35 health.                         |
| **The carried embers** · `carried-embers`       | practice             | 1    | Keep the hearth alive rank 1                                | Recover 0.3 Khan health per active second.                                                                |
| **Felt around the flame** · `felt-and-fire`     | practice             | 1    | Keep the hearth alive rank 1                                | Khan damage taken falls by 15%.                                                                           |
| **The last ember** · `last-ember`               | capstone             | 2    | Keep the hearth alive rank 2 + The carried embers rank 1    | Once this expedition, a lethal hit instead restores 40% of maximum Khan health.                           |
| **Shelter the living Khan** · `unbroken-hearth` | capstone             | 2    | Keep the hearth alive rank 2 + Felt around the flame rank 1 | Maximum Khan health +40; Khan damage taken falls a further 15%. Choose steady protection over Last Ember. |

## Lus · Terrain

Shape the ground of the battle. Slow the enemy approach, read eruptions before they strike, and turn the current against the horde.

| Technology / stable ID                              | Role                 | Cost | Requires                                                      | Effect                                                                                             |
| --------------------------------------------------- | -------------------- | ---- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Find the watercourse** · `watercourse`            | foundation (2 ranks) | 1    | None                                                          | Each rank: enemies within 165 paces of Khan or camp move 12% slower.                               |
| **Shelter among the reeds** · `reed-beds`           | practice             | 1    | Find the watercourse rank 1                                   | The slowing fields extend 65 paces farther.                                                        |
| **Read the shifting ground** · `turned-earth`       | practice             | 1    | Find the watercourse rank 1                                   | Eruption warnings last one second longer. Eruptions deal half damage to Khan and clan.             |
| **The returning current** · `returning-current`     | capstone             | 2    | Find the watercourse rank 2 + Shelter among the reeds rank 1  | Every 4 active seconds, the Khan’s field deals 75% shared damage and pushes enemies back 80 paces. |
| **Quiet ground beneath the storm** · `still-waters` | capstone             | 2    | Find the watercourse rank 2 + Read the shifting ground rank 1 | Slowing fields gain 18 percentage points of slow; eruption warnings last another half-second.      |

## Ongod · Summoning

Let remembered riders travel beside the living. Ancestral echoes answer the bow, gather scattered vitality, and ride as a council.

| Technology / stable ID                                 | Role                 | Cost | Requires                                                    | Effect                                                                                                        |
| ------------------------------------------------------ | -------------------- | ---- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **A rider remembered** · `ancestral-companion`         | foundation (2 ranks) | 1    | None                                                        | Each rank summons one ancestral echo. Echoes follow the Khan and fire at 55% shared damage every 1.1 seconds. |
| **Hands remember the bow** · `remembered-aim`          | practice             | 1    | A rider remembered rank 1                                   | Ancestral arrows rise from 55% to 90% shared damage.                                                          |
| **Follow the spirit thread** · `spirit-thread`         | practice             | 1    | A rider remembered rank 1                                   | Shard attraction radius +40%; kills grant 25% more stored Spirit for camp construction.                       |
| **The council rides with us** · `council-of-ancestors` | capstone             | 2    | A rider remembered rank 2 + Hands remember the bow rank 1   | Summon a third ancestral echo. Echo firing intervals fall by 30%.                                             |
| **Gather the scattered memory** · `keeper-of-names`    | capstone             | 2    | A rider remembered rank 2 + Follow the spirit thread rank 1 | Shard attraction radius +30%; Spirit gained from kills +50%. Keep two echoes and invest in the clan economy.  |

## Sülde · Leadership

A people beneath one standard. Recruit a mounted host, strengthen its volleys, and bring every wagon through with resolve.

| Technology / stable ID                                | Role                 | Cost | Requires                                                       | Effect                                                                                                        |
| ----------------------------------------------------- | -------------------- | ---- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Riders of one standard** · `sworn-riders`           | foundation (2 ranks) | 1    | None                                                           | Each rank recruits one accompanying rider, independent of Khan arrow count.                                   |
| **Rally to the blue cloth** · `rallying-banner`       | practice             | 1    | Riders of one standard rank 1                                  | Accompanying riders deal 25% more arrow damage.                                                               |
| **No wagon left behind** · `ordered-march`            | practice             | 1    | Riders of one standard rank 1                                  | Caravan migration mobility increases by 15%.                                                                  |
| **The unbroken standard** · `unbroken-standard`       | capstone             | 2    | Riders of one standard rank 2 + Rally to the blue cloth rank 1 | Recruit two more riders. Every enemy kill restores 0.15 clan resolve.                                         |
| **Every wagon reaches the dawn** · `caravan-vanguard` | capstone             | 2    | Riders of one standard rank 2 + No wagon left behind rank 1    | Migration mobility +25%; clan damage taken falls a further 25%. Choose a protected crossing over more riders. |

## Guardian of Burkhan Khaldun · Construction

Raise a shelter wherever the clan stops. This imagined mountain guardian inspires economical construction, watchfires, and a defended passage.

| Technology / stable ID                               | Role                 | Cost | Requires                                                              | Effect                                                                                                           |
| ---------------------------------------------------- | -------------------- | ---- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Foundations we can carry** · `caravan-foundations` | foundation (2 ranks) | 1    | None                                                                  | Each rank: camp material costs fall by 10%; clan damage taken falls by 10%.                                      |
| **Watchfires on the ridge** · `watchfires`           | practice             | 1    | Foundations we can carry rank 1                                       | Wagon circle firing intervals fall by 25%. Requires a Wagon circle to fire.                                      |
| **A circle of sheltered ground** · `stone-shelter`   | practice             | 1    | Foundations we can carry rank 1                                       | A camp ward strikes enemies within 125 paces for 65% shared damage every 2 active seconds, even while migrating. |
| **Hold the passage** · `hold-the-passage`            | capstone             | 2    | Foundations we can carry rank 2 + A circle of sheltered ground rank 1 | Reduce all clan damage by a further 20%, stacking with formations and camp armor.                                |
| **A fortress on the road** · `rolling-fortress`      | capstone             | 2    | Foundations we can carry rank 2 + Watchfires on the ridge rank 1      | Wagon circle arrow damage +50%, while stationary and migrating. Requires a Wagon circle to fire.                 |

## Implementation

Stable content IDs and dependencies live in `data/upgrades.ts` and `data/specializations.ts`; balance values live in `GAME.patrons.specializations`. `state/run.ts` validates rank, prerequisites, local exclusivity, and price before applying a purchase once. `state/progressionPreview.ts` projects that same purchase on an isolated copy and compares current combined statistics, including camp modifiers. It preserves succession and never advances active time. Active run data is not persisted, so profile saves need no migration.
