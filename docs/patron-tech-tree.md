# Patron tech tree

The catalog contains eight patrons and 42 technologies (50 authored ranks, including mutually exclusive alternatives). Their powers are original fantasy mechanics; cultural context and sourced writing boundaries live in [lore.md](../lore.md#patron-traditions).

## Purchase rules

Each level banks one knowledge point. Foundations have two ranks and cost one point per rank. Practices unlock after foundation rank one and cost one point. A focused capstone requires foundation rank two and its named practice and costs two points. Choose one capstone per patron; patron mixing and practice mixing remain unrestricted. A focused route therefore costs five knowledge points. Archery offers precision, piercing, and wide-volley capstones.

Stored Spirit is a separate camp currency. Expected-rank validation rejects stale purchases. Unspent points survive menus, succession, and crossings. New expeditions reset research. Complete mastery considers only reachable choices: excluded capstones do not prevent earned surplus knowledge from becoming provisions.

## Börte Chino · Hunting

Hunt the way the wolf hunts. Keep moving, finish what is wounded, and let every kill on the run carry you into the next.

| Technology / stable ID                       | Role                 | Cost | Requires                                               | Effect                                                                                                   |
| -------------------------------------------- | -------------------- | ---- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **The wolf’s trail** · `wolf-trail`          | foundation (2 ranks) | 1    | None                                                   | Each rank: while momentum is above half, your side deals 15% more damage. The Khan also rides 4% faster. |
| **The culling bite** · `culling-bite`        | practice             | 1    | The wolf’s trail rank 1                                | Your side deals 30% more damage to enemies below half health.                                            |
| **Never lose the quarry** · `pursuit-gallop` | practice             | 1    | The wolf’s trail rank 1                                | The gallop cooldown is 25% shorter: 2.25 seconds instead of 3.                                           |
| **Blood of the hunt** · `blood-of-the-hunt`  | capstone             | 2    | The wolf’s trail rank 2 + The culling bite rank 1      | Each kill made above half momentum heals the Khan for 2.                                                 |
| **Ride ahead of the storm** · `wind-rider`   | capstone             | 2    | The wolf’s trail rank 2 + Never lose the quarry rank 1 | Ride 10% faster. Above half momentum, attacks deal 20% more damage.                                      |

## Etügen Eke · Civilisation

Look after the ground that feeds you. Make the pasture last, feed more households, and build a camp that can survive the long road.

| Technology / stable ID                                | Role                 | Cost | Requires                                                      | Effect                                                                                                                    |
| ----------------------------------------------------- | -------------------- | ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Tend the living ground** · `tended-pasture`         | foundation (2 ranks) | 1    | None                                                          | Each rank: the camp produces 15% more food, and the pasture wears out 15% more slowly.                                    |
| **Many hands, one camp** · `shared-labour`            | practice             | 1    | Tend the living ground rank 1                                 | The camp gathers 25% more materials.                                                                                      |
| **Take only what we need** · `measured-herds`         | practice             | 1    | Tend the living ground rank 1                                 | Everyone eats 20% less food, on the road as well as in camp.                                                              |
| **The earth remembers care** · `living-earth`         | capstone             | 2    | Tend the living ground rank 2 + Take only what we need rank 1 | While the camp stays put, the pasture regrows 0.12 percentage points every active second, offsetting what the herds take. |
| **Hands that build a people** · `hands-of-the-steppe` | capstone             | 2    | Tend the living ground rank 2 + Many hands, one camp rank 1   | Gather 40% more materials to keep the travelling camp growing.                                                            |

## Khükhedei Mergen · Archery

Make every shot count. Reach farther, drive shafts through the unreturned, and darken the approach with arrows.

| Technology / stable ID                                 | Role                 | Cost | Requires                                                  | Effect                                                                                                                       |
| ------------------------------------------------------ | -------------------- | ---- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **The measured bow** · `power`                         | foundation (2 ranks) | 1    | None                                                      | Each rank: shared attack damage rises 25%, and the Khan and riders can target enemies 30 paces farther out.                  |
| **An unbroken volley** · `haste`                       | practice             | 1    | The measured bow rank 1                                   | The mounted host’s firing interval falls by 15%.                                                                             |
| **One shaft, two shadows** · `piercing-shaft`          | practice             | 1    | The measured bow rank 1                                   | Friendly arrows pierce one additional enemy. A single arrow cannot hit the same creature twice.                              |
| **A sky full of arrows** · `sky-volley`                | capstone             | 2    | The measured bow rank 2 + Arrows across the steppe rank 1 | Every Khan volley carries two more arrows, and your volleys fan out a further 35%.                                           |
| **Arrows across the steppe** · `wide-quiver`           | practice             | 1    | The measured bow rank 1                                   | Each Khan volley carries one more arrow and your volleys fan out 20% wider, but shared damage drops 10%.                     |
| **The unerring bow** · `one-perfect-shot`              | capstone             | 2    | The measured bow rank 2 + An unbroken volley rank 1       | Shared attack damage rises 60%, and the Khan and riders can target enemies 60 paces farther out. For heavier, truer volleys. |
| **Through the gathered shadows** · `through-the-horde` | capstone             | 2    | The measured bow rank 2 + One shaft, two shadows rank 1   | Your arrows pass through two more enemies. Best against deep ranks closing in.                                               |

## Golomt · Survival

Carry the hearth through the dark. Heal from wounds, shelter the Khan, and hold one last ember in reserve against defeat.

| Technology / stable ID                          | Role                 | Cost | Requires                                                    | Effect                                                                                                               |
| ----------------------------------------------- | -------------------- | ---- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Keep the hearth alive** · `vitality`          | foundation (2 ranks) | 1    | None                                                        | Each rank: the Khan gains 20 maximum health and, if alive, recovers 35 health at once.                               |
| **The carried embers** · `carried-embers`       | practice             | 1    | Keep the hearth alive rank 1                                | The Khan recovers 0.3 health every active second.                                                                    |
| **Felt around the flame** · `felt-and-fire`     | practice             | 1    | Keep the hearth alive rank 1                                | The Khan takes 15% less damage.                                                                                      |
| **The last ember** · `last-ember`               | capstone             | 2    | Keep the hearth alive rank 2 + The carried embers rank 1    | Once per expedition, a hit that would kill the Khan instead restores 40% of maximum health.                          |
| **Shelter the living Khan** · `unbroken-hearth` | capstone             | 2    | Keep the hearth alive rank 2 + Felt around the flame rank 1 | The Khan gains 40 maximum health and takes a further 15% less damage. Steady protection, in place of the last ember. |

## Lus · Terrain

Pay attention to the ground and the water. Slow the enemy’s approach, read the earth before it breaks, and turn the current against the horde.

| Technology / stable ID                              | Role                 | Cost | Requires                                                      | Effect                                                                                                             |
| --------------------------------------------------- | -------------------- | ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Find the watercourse** · `watercourse`            | foundation (2 ranks) | 1    | None                                                          | Each rank: enemies within 165 paces of the Khan or the camp move 12% slower.                                       |
| **Shelter among the reeds** · `reed-beds`           | practice             | 1    | Find the watercourse rank 1                                   | The slowing fields reach 65 paces farther.                                                                         |
| **Read the shifting ground** · `turned-earth`       | practice             | 1    | Find the watercourse rank 1                                   | Eruption warnings last one second longer. Eruptions deal half damage to Khan and clan.                             |
| **The returning current** · `returning-current`     | capstone             | 2    | Find the watercourse rank 2 + Shelter among the reeds rank 1  | Every 4 active seconds, the Khan’s field strikes for 75% shared damage and pushes enemies back 80 paces.           |
| **Quiet ground beneath the storm** · `still-waters` | capstone             | 2    | Find the watercourse rank 2 + Read the shifting ground rank 1 | The slowing fields slow enemies by a further 18 percentage points, and eruption warnings last another half-second. |

## Ongod · Summoning

Let the remembered ride beside the living. Ancestral echoes draw the bow with you, help gather what the fallen leave, and ride together as a council.

| Technology / stable ID                                 | Role                 | Cost | Requires                                                    | Effect                                                                                                                      |
| ------------------------------------------------------ | -------------------- | ---- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **A rider remembered** · `ancestral-companion`         | foundation (2 ranks) | 1    | None                                                        | Each rank calls one ancestral echo to ride with the Khan. Echoes fire for 55% shared damage every 1.1 seconds.              |
| **Hands remember the bow** · `remembered-aim`          | practice             | 1    | A rider remembered rank 1                                   | Ancestral arrows deal 90% shared damage instead of 55%.                                                                     |
| **Follow the spirit thread** · `spirit-thread`         | practice             | 1    | A rider remembered rank 1                                   | Shards are drawn in from 40% farther away, and kills store 25% more Spirit for building the camp.                           |
| **The council rides with us** · `council-of-ancestors` | capstone             | 2    | A rider remembered rank 2 + Hands remember the bow rank 1   | A third ancestral echo joins the others, and every echo’s firing interval is 30% shorter.                                   |
| **Gather the scattered memory** · `keeper-of-names`    | capstone             | 2    | A rider remembered rank 2 + Follow the spirit thread rank 1 | Shards are drawn in from 30% farther away, and kills store 50% more Spirit. Keep two echoes and put the gain into the camp. |

## Sülde · Leadership

One people under one standard. Raise a mounted host, sharpen its volleys, and keep spirits up until every wagon is through.

| Technology / stable ID                                | Role                 | Cost | Requires                                                       | Effect                                                                                                                 |
| ----------------------------------------------------- | -------------------- | ---- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Riders of one standard** · `sworn-riders`           | foundation (2 ranks) | 1    | None                                                           | Each rank brings one more rider to ride with you, whatever the Khan’s arrow count.                                     |
| **Rally to the blue cloth** · `rallying-banner`       | practice             | 1    | Riders of one standard rank 1                                  | The riders with you deal 25% more arrow damage.                                                                        |
| **No wagon left behind** · `ordered-march`            | practice             | 1    | Riders of one standard rank 1                                  | The caravan’s migration mobility rises 15%.                                                                            |
| **The unbroken standard** · `unbroken-standard`       | capstone             | 2    | Riders of one standard rank 2 + Rally to the blue cloth rank 1 | Two more riders join you, and every enemy kill restores 0.15 clan resolve.                                             |
| **Every wagon reaches the dawn** · `caravan-vanguard` | capstone             | 2    | Riders of one standard rank 2 + No wagon left behind rank 1    | Migration mobility rises 25%, and the clan takes a further 25% less damage. A safer crossing, in place of more riders. |

## Guardian of Burkhan Khaldun · Construction

Make shelter wherever the clan stops. This imagined guardian of the mountain inspires thrifty building, watchfires, and a passage held against the dark.

| Technology / stable ID                               | Role                 | Cost | Requires                                                              | Effect                                                                                                                   |
| ---------------------------------------------------- | -------------------- | ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Foundations we can carry** · `caravan-foundations` | foundation (2 ranks) | 1    | None                                                                  | Each rank: camp building costs 10% fewer materials, and the clan takes 10% less damage.                                  |
| **Watchfires on the ridge** · `watchfires`           | practice             | 1    | Foundations we can carry rank 1                                       | The Wagon circle’s firing interval is 25% shorter. Needs a Wagon circle.                                                 |
| **A circle of sheltered ground** · `stone-shelter`   | practice             | 1    | Foundations we can carry rank 1                                       | A ward around the camp strikes enemies within 125 paces for 65% shared damage every 2 active seconds, even on the march. |
| **Hold the passage** · `hold-the-passage`            | capstone             | 2    | Foundations we can carry rank 2 + A circle of sheltered ground rank 1 | The clan takes a further 20% less damage, on top of formations and camp armor.                                           |
| **A fortress on the road** · `rolling-fortress`      | capstone             | 2    | Foundations we can carry rank 2 + Watchfires on the ridge rank 1      | Wagon circle arrows deal 50% more damage, in camp and on the march. Needs a Wagon circle.                                |

## Implementation

Stable content IDs and dependencies live in `data/upgrades.ts` and `data/specializations.ts`; balance values live in `GAME.patrons.specializations`. `state/run.ts` validates rank, prerequisites, local exclusivity, and price before applying a purchase once. `state/progressionPreview.ts` projects that same purchase on an isolated copy and compares current combined statistics, including camp modifiers. It preserves succession and never advances active time. Full-run persistence is documented in [the expedition save contract](expedition-saves.md).
