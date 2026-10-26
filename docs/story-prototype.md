# Playable story

Hordes of the Fallen Sky implements the two-act expedition in
[the story architecture](../story-architecture.md). The five-chapter prologue
leads into camp construction, automatic mounted combat, three caravan crossings,
a timed final defense, an epilogue, journey results, and a fresh run. This guide
describes what is playable now.

## Play

Use `npm run dev` for the desktop game, or `npm run build` followed by `npm start` for the offline build. `npm run package:linux` creates the standalone Linux game directory under `release/HordesOfTheFallenSky-linux-x64/`; run its `HordesOfTheFallenSky` executable and keep the rest of the directory alongside it.

Leave **Camp scenes: On** at the title to play the story. Ride with WASD or arrows; attacks are automatic. Space gallops, B develops camp, M opens available migration routes, and Tab / J opens the chronicle. Menus and conversations pause combat, physics, economy, character animation, and journey clocks.

## Two acts, eight scenes

**Act I · Gather the Scattered** asks whose knowledge and needs have a place beside
the fire. **Act II · Carry the Living** asks how the clan keeps that promise when it
becomes costly, through Erden's confession and the final passage.

| Beat ID     | Scene                                                      | Trigger                                  | Story work                                                                               |
| ----------- | ---------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `fire`      | A place beside the fire                                    | Start the expedition                     | Meet the cast; the starting tradition shapes the setting and Boro's worry                |
| `departure` | More mouths, more hands                                    | Golden Pasture reaches 45 active seconds | Nara sees blue banners; fill the stores (Boro) or make room in the wagons (Saran, Erden) |
| `river`     | Destination-specific (Silent River: Voices across the ice) | Arrive at the first chosen camp          | Local conflict; test and provide, or listen and keep people connected                    |
| `promise`   | A promise chosen                                           | Arrive at the second chosen camp         | Act II begins; local framing for tying cloth into the banner                             |
| `earth`     | Destination-specific (Broken Pass: When the earth moves)   | Second camp reaches 15 active seconds    | Local work under the Earth That Walks; prepare equipment or relieve tired hands          |
| `court`     | The court’s empty promise                                  | Second camp reaches 45 active seconds    | Erden's confession; share the tally, record his account, or give the tally to Nara       |
| `opening`   | The narrow opening                                         | Arrive at Heart of the Steppe            | Recalls the first camp's chosen lesson and who keeps the tally                           |
| `road`      | Hold the road                                              | Final defense reaches 90 active seconds  | Nara takes the embers; recalls the second camp's chosen lesson                           |

Each scene occurs once. Triggers follow active gameplay time and arrival, so reading a scene cannot consume pasture or advance the final defense. Construction, formations, route rewards, and earned traditions remain available between scenes. Opening a route cannot bypass an outstanding departure conversation.

The first crossing can reach Silent River or any of the eight named destinations in
[the destination guide](migration-locations.md); the second can reach Broken Pass or
any named destination not yet visited. Every eligible camp has its own scene in each
slot it can occupy: a first-stop title, setting, disagreement, and two responses, and
a second-stop banner framing, work scene, and two responses. Treatments live in
`src/game/data/storyDestinations.ts`. The third crossing always reaches the fictional
Heart of the Steppe.

## The cast

| Companion | Voice                                                            | Arc                                                                     |
| --------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Saran     | Hearthkeeper; measured, speaks in images of fire and cloth       | Carries everyone's care, and learns to let others carry hers            |
| Boro      | Herder; terse and practical, thinks in grass, horses, and stores | Turns scarcity into shared judgment; distrusts Erden until the truth    |
| Erden     | Keeper of the tally; formal and exact, hints at a larger past    | Hides his court service, then gives an accountable witness statement    |
| Nara      | Youngest survivor; blunt questions, notices who is missing       | Takes on real responsibility and carries the embers through the passage |

Rescued households speak as **A newcomer** without an invented name, community, or
belief. They appear only after an actual blue-banner rescue.

## Choices and consequences

Each response grants one modest gift (8 food, 6 materials, 4 spirit, or up to 5 clan
resolve) and one point toward the matching clan identity. Most responses before the
final defense also carry a **lasting** camp effect, shown on the button and in the
chronicle: for example, _Careful rations: 3% less food eaten_ or _Room in the wagons:
+1 person from each blue-banner rescue_. Lasting effects are applied once through
`clan.campEffects` when the response is chosen. Values live in `GAME.story`; mappings
by stable choice ID live in `src/game/data/storyConsequences.ts`.

Responses also shift **companion trust**. Trust is derived from resolved records by
`state/storyBonds.ts`, never stored separately, so saves and transcripts remain the
single source. The chronicle's **Beside the fire** row shows each companion's current
standing. Trust and earlier decisions change later dialogue and the ending:

- Saran answers the departure dispute by recalling whether the clan shared work or named watches.
- First arrivals acknowledge an actual rescue, an actual loss, or wagon room that went unused.
- Boro's reaction to the confession recalls whether Erden repacked the wagons “like an army.”
- The final approach recalls the first camp's chosen lesson and who keeps the tally.
- Saran hands Nara the embers readily only if the clan has trusted Nara with real work.
- The last stand recalls the second camp's chosen lesson.
- Boro and Saran reconcile in the ending only if the clan honoured both of their priorities.

Choose **Continue without choosing**, Escape, or controller B to move on neutrally; a
skipped scene grants nothing and creates no later callback. **Camp scenes: Off** at the
title suppresses conversations and gifts while recording that the clan passed those
milestones without a council. The preference lasts across restarts in the current app session.

The chronicle's **Our story** tab contains the current run's scenes. Expand one to read the transcript, decision, and lasting effect. **Our remembered road** in the pause and end menus provides the same read-only record and returns to the menu it came from. Re-reading cannot grant rewards or resume an ended expedition.

## Lived history

Validated camp purchases, departures, completed crossings, actual losses, Khan
succession, and the Skybreaker's defeat add factual memories to the chronicle. A
brief reaction may accompany a moment, voiced by the companion it concerns
(`src/game/data/storyReactions.ts`):

- **Camp work:** Boro reacts to herds, bows, and stores; Nara to felt and relays; Erden to wagons; Saran to gers and sanctuaries. `buildingReaction(id, pathId)` gives each facility a line for being established and one for each development it learns, keyed by path ID, so levels 2 and 3 and each specialization sound different. A development without its own line uses the building's general craft line. Lines speak only of the facility just purchased. The sanctuary's lines speak of remembrance and shared care and never promise that a real rite works.
- **Journey moments:** departures, starvation, arrivals, crossing outcomes, and completed field objectives speak through the same data file, each paired with the collective voice heard below five survivors.
- **Crossings:** each approach has its own lines. Boro packs for the river, the ridge, or the extra mouths of a rescue. Saran sets down the embers after a quiet arrival. Nara counts heads after a crossing without losses. A held ford is Erden's count of wagons, a broken ridge ambush is Boro's intact packs, and households brought into the column are Saran's to welcome. A newcomer speaks only when people actually arrived by the blue banners; if the wagons were too full to take anyone in, Saran says so instead. Lines name no place.
- **Field objectives and hunger:** Boro takes in the scattered supplies and the loose herd, Saran welcomes stranded households without naming any of them, and Nara counts the defeated raiders from an enemy gathering. Each kind has its own remnant line. When the stores run out, Boro speaks unless the court scene gave Nara the tally, in which case she records it.
- **Losses:** recorded by whoever keeps the tally after the court scene. From the third loss, Saran answers instead.
- **Succession:** a first fall recalls a shared watch if the clan named one. A successor is greeted according to the chosen trait.
- **[The Skybreaker](final-stand.md):** Boro turns the clan back to the wagons, echoing his line in the road scene.

Reactions are spaced by eight active seconds and freeze in menus. Only displayed reactions receive a retained transcript. Fewer than five survivors use the collective remembered-road voice. Camp scenes: Off keeps factual memories without companion speech. Records are bounded to the latest 96 moments and 64 Khans.

## Refuge and failure

The mountain passage visibly clears during the final three-minute defense. Surviving with people and resolve reaches refuge even if the Skybreaker remains alive. The skippable epilogue covers, in order:

1. The survivor and herd counts, the Skybreaker's fate, and any Khans who fell.
2. Actual losses, or the spare bowl and any rescued households.
3. One remembered image from each chosen camp, in visit order. Camps whose scenes were skipped are named only as halts.
4. Companion outcomes from trust and the court decision.
5. The clan identity.

It ends with the spare bowl and the promise of room beside the fire.

The named companions are voices within an abstract population. The game never assigns individual casualties. Below five people, scenes use a remnant account and the ending omits named companions. At the two chosen camps, that account is the destination’s own `remnant` line, written to hold for a single survivor. After any loss, the ending speaks of companions' practices (“as Erden promised”) rather than placing all four at the new fire. A one-person ending uses singular narration. No scene forces a death to serve the plot.

Defeat shows the actual journey result and leaves the memories available. A restart clears the story, choices, crossings, losses, and build. Full expedition saves preserve active choices, resolved transcripts, applied lasting effects, crossings, losses, and clan memories. Loading does not resolve a choice or grant its benefit again. See [the expedition-save contract](expedition-saves.md).

## Implementation

- `src/game/data/story.ts`: composes each scene once, on opening, from the cast, the chapter, the place, and the actual journey.
- `src/game/data/storyDestinations.ts`: destination treatments.
- `src/game/data/storyConsequences.ts`: trust shifts and lasting effects.
- `src/game/data/storyReactions.ts`: lived-history reactions, remnant voices, and the wording memories use for approaches and completed objectives.
- `src/game/state/story.ts`: once-only progression and gifts.
- `src/game/state/storyBonds.ts`: derives trust.
- `ArenaScene`: owns phase transitions and pause behavior.
- `src/ui/storyContent.ts` and `src/story.css`: render manuscript conversations using the existing locally bundled paintings.

No runtime service, voice synthesis, or remote asset loading is involved.

Unit coverage plays every ordered pair of eligible camps with two answer sets. It checks that no unvisited place is named, and covers rescue acknowledgment, callbacks, the third court response, lasting effects applied exactly once, trust-dependent endings, loss and remnant phrasing, fallen Khans, and reactions. Browser coverage checks the complete two-act run, the three-choice confession, the companion standings, controller input, layout, and restart.
