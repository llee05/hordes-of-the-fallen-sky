# Playable story prototype

Hordes of the Fallen Sky now implements one complete expedition through the two acts in [the story architecture](../story-architecture.md). The five-chapter prologue leads into camp construction, automatic mounted combat, three caravan crossings, a timed final defense, an epilogue, journey results, and a fresh run.

## Play

Use `npm run dev` for the desktop game, or `npm run build` followed by `npm start` for the offline build. `npm run package:linux` creates the standalone Linux game directory under `release/HordesOfTheFallenSky-linux-x64/`; run its `HordesOfTheFallenSky` executable and keep the rest of the directory alongside it.

Leave **Camp scenes: On** at the title to play the story. Ride with WASD or arrows; attacks are automatic. Space gallops, B develops camp, M opens available migration routes, and Tab / J opens the chronicle. Menus and conversations pause combat, physics, economy, character animation, and journey clocks.

## Two acts, eight memories

| Beat                      | Trigger                                  | Story work                                                                                |
| ------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| A place beside the fire   | Start the expedition                     | Meet Saran, Boro, Erden, and Nara; share the work or watch                                |
| More mouths, more hands   | Golden Pasture reaches 45 active seconds | Prepare provisions or wagon supplies before choosing a route                              |
| Voices across the ice     | Arrive at Silent River                   | Test the ground or gather the living voices; acknowledge rescued families when applicable |
| A promise chosen          | Arrive at Broken Pass                    | Begin Act II and make the blue banner a shared promise                                    |
| When the earth moves      | Broken Pass reaches 15 active seconds    | Mend the wheels or rest tired hands; acknowledge the clan's condition                     |
| The court’s empty promise | Broken Pass reaches 45 active seconds    | Hear Erden's connection to the Iron Vow; share his tally or record his account            |
| The narrow opening        | Arrive at Heart of the Steppe            | Organize the last watch or provisions while the passage is cleared                        |
| Hold the road             | Final defense reaches 90 active seconds  | Carry the embers forward while the defenders hold the approach                            |

Each scene occurs once. Triggers follow active gameplay time and arrival, so reading a scene cannot consume pasture or advance the final defense. Construction, formations, route rewards, and earned traditions remain available between scenes. Opening a route cannot bypass an outstanding departure conversation.

## Choices and memories

Each scene offers two responses. A response grants one modest benefit: 8 food, 6 materials, 4 spirit, or up to 5 clan resolve, and contributes one point toward the corresponding clan identity. Values live in `src/game/config.ts`. Benefits are granted once, and the record retains the actual resolved dialogue and selected response.

Choose **Continue without choosing**, Escape, or controller B to move on neutrally. **Camp scenes: Off** at the title suppresses conversation interruptions and gifts, while keeping a record that the clan passed those milestones without a council. The preference lasts across restarts in the current app session.

The chronicle's **Our story** tab contains the current run's memories. Expand a memory to read the transcript and decision. Controller navigation can focus and open these summaries. **Our remembered road** in the pause and end menus provides the same read-only record and returns to the menu it came from. Re-reading cannot grant rewards or resume an ended expedition.

## Refuge and failure

The mountain passage visibly clears during the final three-minute defense. Surviving with people and resolve reaches refuge even if the Skybreaker remains alive. The skippable epilogue reflects survivor and herd counts, actual population losses, clan identity, the shared-tally choice, and the boss's fate. It ends with the spare bowl and the promise of room beside the fire.

The four named companions are voices within an abstract population. The prototype does not assign individual casualties. Below five people, camp scenes use a remnant account; an ending with losses avoids assuming which named people survived. A one-person ending uses singular narration. No scene forces a death to serve the plot.

Defeat shows the actual journey result and leaves the memories available. A restart clears the story, choices, crossings, losses, and build. Only the existing longest-journey and sound preferences persist between app launches. Active expeditions and their transcripts are not resumable saves.

## Implementation and scope

`src/game/data/story.ts` contains the cast, conditional scenes, choices, and epilogue. `src/game/state/story.ts` handles once-only progression; `ArenaScene` owns phase transitions and pause behavior. `src/ui/storyContent.ts` and `src/story.css` render manuscript conversations using the existing locally bundled paintings. No new runtime service, voice synthesis, or remote asset loading is involved.

The complete story is playable as a short prototype. Dialogue is text-based, geography is shared across runs, and individual companion agents, a longer campaign, permanent progression, and campaign save/resume remain future work. Unit and browser coverage checks chronology, choices, losses, banked knowledge points, all crossings, victory, defeat, memories, controller input, layout, and restart. Electron smoke coverage checks the offline story panel and the existing native platform flow.

## Life beneath the banner

Validated camp purchases, departures, completed crossings, actual losses, and Khan succession add factual memories to the chronicle. A brief companion reaction may accompany a moment; reactions are spaced by eight active seconds and freeze in menus. Only displayed reactions receive a retained transcript. Fewer than five survivors use the collective remembered-road voice. Camp scenes: Off keeps factual memories without companion speech. Records are bounded to the latest 96 moments and 64 Khans, showing totals when earlier records have left the view.

Each Khan record retains the actual selection and fall times, regions, population at selection, and host victories during that tenure. Last Ember preserves the same Khan; succession adds one new record only after its active-time countdown finishes. Reading records never grants rewards or changes simulation.
