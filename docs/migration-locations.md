# Migration destinations

The game contains eight real places: Mount Otgontenger, Bogd Khan Uul, Altai Tavan
Bogd, Khan Tengri Peak, Mount Belukha (Üch-Sümer), Altan Ovoo, Eej Khairkhan, and
Orkhon Valley. A new expedition starts at Mount Otgontenger. From any camp the clan
can migrate to any of the other seven, including places it left earlier. The four
fictional chapter camps, the crossing encounters, and the final stand have been
removed; the run shape will be redesigned later.

Destinations are camps in the surrounding landscape, not summit ascents or depictions
of ceremonies. The journey compresses geography and travel time for a fantasy game;
it is not a geographically accurate itinerary.
The calamity, hostile creatures, and all resource modifiers are invented.
Real sacred sites are not the source of the calamity or rewards for religious acts.
Mongolian, Turkic, and Altaian traditions retain their distinct contexts.

## Narrative reference

Earlier narrative treatments for each named destination are archived in [`docs/archive/story/`](archive/story/README.md) as reference for a future story rework.

## Content and simulation

`data/clan.ts` defines `LOCATIONS` with stable IDs, names, geographical/cultural
context, visual terrain, and gameplay modifiers from `GAME.locations`. Food and
materials modifiers affect production at the current camp. Mobility affects departures
from that camp; the chosen destination's travel modifier affects the incoming trip.
All modifiers stack with camp developments.

`state/journey.ts` resolves the current camp, pending arrival, and available
destinations. `clan.locationId` identifies the actual camp, and `clan.destinationId`
exists only while travelling. `legacy.crossings` (a retained save key) lists completed
migrations; its length counts camps reached after the first.
`beginMigration` validates the route and destination before changing anything. Arrival
changes the location and records it in the migration and clan memories exactly once;
it preserves the existing buildings, supplies, succession, and XP rules.
Khan records retain both their chosen and fallen locations.

The simulation and `travelForecast` share `travelDuration`; forecasts never
count arrival rewards toward provisions consumed before arrival.

`ui/migrationContent.ts` renders the destination picker and the three approach cards.
The selected destination is temporary UI view state until `ArenaScene.chooseRoute`
validates and starts the migration. Inspection preserves focus, scroll, and every
simulation value. Keyboard arrows, Tab, mouse, and controller navigation can inspect
destinations without departing. Escape closes planning. Camp purchase previews use
the food-cost range across all currently available destination/approach combinations.
The chronicle lists all eight places, marking the current camp, places already
reached, and the chosen destination while travelling. Cultural descriptions and the resource effects are displayed
separately. All art, fonts, and source context ship locally. Each location has its own terrain,
vegetation, watercourse (where present), painted landmarks, and atmosphere; migration
cards preview the same scenery. See [the landscape catalog](location-landscapes.md)
for the eight compositions and renderer contract.

## Cultural context and sources

- **Otgontenger, Altan Ovoo, Eej Khairkhan:** Mongolia's submission describes their
  sacred-landscape context and the interaction of shamanic and Buddhist traditions.
  Altan Ovoo is a volcanic mountain in Dariganga; Eej Khairkhan is in Govi-Altai.
  [Sacred Mountains of Mongolia, UNESCO tentative list](https://whc.unesco.org/en/tentativelists/6068/).
- **Bogd Khan Uul:** the same submission describes the history of state protection
  and reverence. It is distinct from the similarly named Great Bogd Mountain.
  [Sacred Mountains of Mongolia](https://whc.unesco.org/en/tentativelists/6068/).
- **Altai Tavan Bogd:** the Mongolian submission places the high peaks and national
  park in the Mongol Altai. Its sacred-landscape context is also discussed in the
  Burkhan Khaldun evaluation.
  [Highlands of Mongol Altai](https://whc.unesco.org/en/tentativelists/5955/),
  [UNESCO cultural-property evaluations, 2015](https://whc.unesco.org/archive/2015/whc15-39com-inf8B1-en.pdf).
- **Khan Tengri:** the Abai Institute describes its Tian Shan setting, Turkic name,
  and association with sacred geography.
  [Khan Tengri Peak](https://oq.gov.kz/en/abai/khan-tanhiri-shynhy).
- **Belukha / Üch-Sümer:** the Sacred Land Film Project describes Belukha's particular
  reverence among Altaian people. UNESCO places Belukha in the Golden Mountains of
  Altai property. The game retains the user's requested Altaian alternate name.
  [Golden Mountains site report](https://standingonsacredground.org/film-series/pilgrims-and-tourists/altai-republic-russia/site-report-golden-mountains),
  [Golden Mountains of Altai](https://whc.unesco.org/en/list/768/).
- **Orkhon Valley:** UNESCO describes the cultural landscape's Turkic and Mongol
  heritage and continuing nomadic pastoralism.
  [Orkhon Valley Cultural Landscape](https://whc.unesco.org/en/list/1081/).
