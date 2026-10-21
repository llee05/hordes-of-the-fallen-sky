# Hordes of the Fallen Sky — Story Architecture

## Scope and dramatic spine

This document maps one expedition into **two acts**, framed by the prologue and epilogue. [World lore](lore.md) supplies the setting and writing boundaries; [the game loop](README.md#build-defend-migrate) supplies the playable structure. The playable prototype now adapts all eight beats into illustrated camp conversations, choices, a chronicle, and an epilogue. The scene descriptions below remain the writing blueprint; fully acted character scenes are future presentation work. See [the implementation guide](docs/story-prototype.md) for the exact current triggers and adaptations.

**Premise:** After the Iron Vow tears the sky, eight survivors gather beneath a blue banner and travel toward a mountain refuge. Their camp grows into a people through the decisions required to keep it moving.

**Dramatic question:** Can people who have lost their homes learn to entrust their lives to one another?

**External goal:** Bring the clan through the mountain passage alive.

**Internal movement:** The banner-bearer begins responsible for a handful of familiar survivors. By the end, they must accept responsibility for a community whose members have different histories, beliefs, and needs.

**Opposition:** The unreturned pursue the caravan while hunger, depleted pasture, broken terrain, and uncertainty strain the clan. The Last Court's attempt to secure permanent authority remains the political shadow over the journey.

## Expedition map

| Movement                           | Location                          | Dramatic work                                                              | Existing gameplay anchor                                       |
| ---------------------------------- | --------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Prologue · The Iron Vow            | Before the expedition             | Establish the rupture, the eight survivors, and the hope of refuge         | Five skippable painted chapters                                |
| Act I · Gather the Scattered       | Golden Pasture → Silent River     | Build a camp, welcome difference, and make a shared commitment to the road | Construction, traditions, first two crossings                  |
| Midpoint · A Promise Chosen        | Arrival at Broken Pass            | Make the blue banner a promise the assembled clan has chosen together      | Second crossing completed; people and supplies carried forward |
| Act II · Carry the Living          | Broken Pass → Heart of the Steppe | Test that promise under pressure and turn shared knowledge into escape     | Hazards, final crossing, three-minute mountain defense         |
| Epilogue · A Place Beside the Fire | Beyond the passage                | Show what the survivors can begin together                                 | Victory result; a new closing scene is proposed                |

Act boundaries follow arrival at a region. Camp duration remains the player's decision. The current expedition is intended to last roughly fifteen minutes, with substantial variation; narrative beats should follow events rather than fixed timestamps.

## Prologue — What was broken

Keep the five chapters in [the canonical intro script](lore.md#opening-slideshow): Heaven and Earth, the Iron Vow, the unreturned, the living hearth, and the road toward refuge.

The intro establishes what happened and why the clan travels. During play, survivors can disagree about its deeper causes. A later revelation should change how the clan understands its responsibilities without requiring the player to forget the opening account.

The first playable image should fulfill the intro's promise: a small camp, a blue banner, and people worth riding back to protect.

## Act I — Gather the Scattered

**Act question:** Who belongs within the circle of this camp?

**Starting condition:** Eight survivors share an old home and an immediate emergency. The banner-bearer can still imagine protecting everyone by watching every approach personally.

### 1. The first fire — Golden Pasture

Introduce the hearthkeeper through useful work: tending embers, counting blankets, and asking who has eaten. Establish a herder who knows the nearby land and a younger survivor who notices the adults' evasions. Give the player one small image to carry forward, such as a spare bowl kept beside the fire.

Building the camp makes the group tangible. Gers create room for more households; archers take over part of its defense; herding and sanctuary work give different people a place in the effort. The banner-bearer learns to leave tasks in other hands.

**Proposed exchange:** “Who is the empty bowl for?” / “Whoever reaches us next.”

### 2. More mouths, more hands — the first departure

As food, workers, and defenses compete for attention, introduce disagreement about what the clan can promise. The herder wants enough provisions to finish the crossing. The hearthkeeper wants a place for people still scattered outside the camp. Both have responsibilities the player can recognize.

Use the existing route decision to express priorities. A provision route can mean preparing to shelter people later; a rescue route can mean accepting immediate strain to gain families and riders. Avoid declaring one route the morally correct answer.

**Act turn:** Packing the gers makes departure real. The people carry their home into danger together, and the banner-bearer must defend what they have chosen to bring.

### 3. Familiar voices — Silent River

The White Silence makes ordinary cooperation difficult. A familiar voice from beyond the ice offers a survivor an easy route or news of someone missing. Keep its identity uncertain. Another person finds a practical way across: a remembered ford, a marked bank, or a route sheltered from the wind.

The hearthkeeper admits the limits of their knowledge. The player sees that old stories and immediate observation both matter. A proposed newcomer, a former clerk of the Last Court, recognizes the language of a promise that asks for obedience before offering safety.

**Pressure:** The clan has grown, and old households disagree about whose memories deserve trust. The river tests whether they can act together while those disagreements remain.

### 4. A promise chosen — second crossing and midpoint

After reaching Broken Pass, households add their own scraps of cloth to the blue banner. The hearthkeeper invites them to speak the names of people they carry in memory. The clerk contributes a blank strip, unable yet to speak about the court.

This proposed scene gives the journey a shared commitment: whoever travels under this banner will be counted when the wagons leave. The player has helped assemble the people who can now make that promise.

**Midpoint change:** The clan takes collective ownership of the journey. The banner-bearer becomes accountable to people who have chosen to follow, including strangers welcomed along the road.

## Act II — Carry the Living

**Act question:** How does the clan keep its promise when survival grows costly?

**Starting condition:** The community has a shared purpose. Its supplies, defenses, and trust now face the hardest terrain of the expedition.

### 5. The earth moves — Broken Pass

Use the moving ground and eruption warnings to test the clan's ability to respond together. The herder can recognize an unstable slope; a newcomer can mend a wheel; riders can give a wagon time to move. Let useful knowledge pass between people who argued at the river.

A proposed camp conversation can follow an actual setback or a successful arrival. A badly hurt clan needs reassurance and a practical plan. A strong clan can begin discussing whom it might shelter beyond the mountain. Neither version requires a scripted death or loss of resources.

**Character turn:** The banner-bearer's strength becomes most visible in the space they make for others to act.

### 6. The court's empty promise — before the final departure

The clerk finally explains their connection to the Last Court. They once recorded households as taxes, soldiers, and obligations. They heard the Iron Vow spoken and saw people seek certainty from an empty throne. Their testimony establishes human actions; their interpretation of the rupture remains fallible.

Give the confession a present consequence: the clerk asks to use their knowledge to organize supplies and keep families together. The question for the clan is whether a person implicated in the old order can earn trust through useful work.

**Revelation:** The court tried to make authority permanent. The survivors can choose how authority is exercised among them now. This develops the political meaning already present in the lore without supplying a final explanation of Tengri's intentions.

### 7. The narrow opening — Heart of the Steppe

At the mountain, the Red Eclipse reveals how exposed the clan still is. The Skybreaker approaches. The remembered refuge can be seen or described more clearly, but the passage will take time to open.

A proposed visual explanation is that people are clearing fallen stone and ice from the narrow approach. This would express the current survival timer through shared labor; it would not require a new worker assignment mechanic. Until such a scene is implemented, the existing objective remains to hold until the passage opens.

**Lowest point:** The refuge is close enough to imagine, and every remaining family is within reach of the advancing calamity. Keep losses responsive to the run the player has actually played.

### 8. Hold the road — climax

The final three-minute defense brings the expedition's choices together: riders hold approaches, wagons protect families, and the banner-bearer moves between threats. Narrative presentation should keep attention on the people behind the fighting.

The Skybreaker can fall or remain standing. The decisive event is the passage opening with the clan alive to use it. A proposed closing beat has the youngest survivor help carry the ember vessel through while the hearthkeeper steadies someone else.

**Resolution of the act question:** The clan keeps its promise through many people doing their part. The banner-bearer's last task is to make room for the final wagons to pass.

## Epilogue — A place beside the fire

A proposed short, skippable closing scene returns to the spare bowl, the ember vessel, and the patched banner. People unpack in the sheltered valley. Someone begins the next meal. The cloth now carries marks from more than one household.

Let the surviving population and the clan's developed identity affect a few details. The Iron Horde might post riders to watch the approach; the Children of the Eternal Sky might begin a song with several voices; the Wandering Nation might lay out space for more arrivals. Each version establishes ongoing duties and leaves the camp open to others.

The Sundering remains beyond the mountain. The clan has gained a place to begin again, and the ending pays off the game's survival objective.

**Proposed final line:** “Keep a place beside the fire. Someone is still coming home.”

## Character and motif payoffs

The prototype implements these roles as Saran, Boro, Erden, and Nara in camp conversations. Erden travels among the original eight survivors, so his presence does not depend on choosing a refugee route. The cast is represented through dialogue and brass symbols; individual companion movement and casualty identities are not simulated. A small remnant receives collective narration. The herder, clerk, and younger survivor may be combined or reduced in future revisions if the short expedition needs a smaller cast.

| Role or motif      | Act I setup                                     | Act II payoff                                                              |
| ------------------ | ----------------------------------------------- | -------------------------------------------------------------------------- |
| Banner-bearer      | Tries to watch every danger personally          | Protects the room others need to carry out the escape                      |
| Hearthkeeper       | Carries knowledge and the ember vessel          | Shares responsibility for both memory and the living hearth                |
| Herder             | Argues for realistic provision limits           | Uses practical knowledge to help the whole caravan cross                   |
| Former court clerk | Counts supplies while concealing their past     | Admits complicity and begins earning trust through service                 |
| Younger survivor   | Asks who the spare bowl is for                  | Helps make the next camp ready for someone else                            |
| Blue banner        | Identifies a small group of survivors           | Becomes a visibly shared promise made by many households                   |
| Ember vessel       | Holds a remnant of the lost home                | Lights a new hearth through several people's care                          |
| Iron standard      | Embodies the court's claim to lasting authority | Gives the clerk a concrete memory against which to judge their own conduct |

## Choices, delivery, and implementation boundary

Keep the geography and two-act structure shared across runs. Existing route choices, specializations, clan identity, and actual losses can support variations in dialogue and closing details. A provision route, a rescue route, or any of the three identities can lead to a fulfilling ending. Do not invent past choices or casualties to force a scene to fit.

For an initial implementation, aim for one brief arrival beat per region, the midpoint exchange, the clerk's confession, and the epilogue. Optional chronicle entries can hold longer conversations. Put substantial reading in paused menus; allow players to dismiss story scenes immediately and consult a record later if one is added. Combat objectives should remain understandable when all optional writing is skipped.

| Available foundation                                  | Proposed narrative addition                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Five-chapter intro and existing lore                  | Act titles and a visible record of story beats                   |
| Four regions, three crossings, route choices          | Arrival exchanges and responses to the chosen route              |
| Construction, specializations, clan identities        | Character reactions to the community's development               |
| Population, herd, food, resolve, and commander health | Dialogue reflecting the actual condition of the caravan          |
| Three-minute final defense and optional boss kill     | Passage-clearing presentation and the final wagon's departure    |
| Victory and defeat screens                            | Short epilogue variations and a restrained remembrance on defeat |

Failure remains an expedition ending. A proposed defeat remembrance may acknowledge the actual journey, but should not reveal later scenes or treat a restart as an established cycle of reincarnation. Long-term campaign continuation and persistent story consequences would need their own design.
