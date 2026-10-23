# Migration destinations

The first two crossings can lead to eight additional named camps: Mount Otgontenger,
Bogd Khan Uul, Altai Tavan Bogd, Khan Tengri Peak, Mount Belukha (Üch-Sümer), Altan
Ovoo, Eej Khairkhan, and Orkhon Valley. The original Silent River and Broken Pass
remain available. Visited named camps are excluded from later choices. The third
crossing still leads to the fictional Heart of the Steppe and its 180-second final
stand. An expedition still has three crossings, eight story encounters, and two acts.

Destinations are camps in the surrounding landscape, not summit ascents or depictions
of ceremonies. The journey compresses geography and travel time for a fantasy game;
it is not a geographically accurate itinerary. The White Silence and Earth That
Walks remain fictional chapter events that can affect whichever camp is chosen.
The calamity, hostile creatures, passage, and all resource modifiers are invented.
Real sacred sites are not the source of the calamity or rewards for religious acts.
Mongolian, Turkic, and Altaian traditions retain their distinct contexts.

## Content and simulation

`data/clan.ts` defines `LOCATIONS` with stable IDs, names, geographical/cultural
context, visual terrain, and gameplay modifiers from `GAME.locations`. Food and
materials modifiers affect production at the current camp. Mobility affects departures
from that camp; the chosen destination's crossing modifier affects the incoming trip.
All modifiers stack with seasonal conditions, camp developments, and patrons.

`state/journey.ts` resolves the current camp, pending arrival, and available
destinations. The numeric `clan.region` remains the story/difficulty chapter;
`clan.locationId` identifies the actual camp, and `clan.destinationId` exists only
while travelling. Legacy chapter camps are used when no explicit location is set.
`beginMigration` validates the route and destination before changing anything. Arrival
changes the location and records it in the crossing and clan memories exactly once;
it preserves the existing buildings, research, supplies, succession, and XP rules.
Khan records retain both their chosen and fallen locations.

The simulation and `crossingForecast` share `crossingDuration`; forecasts never
count arrival rewards toward provisions consumed before arrival.

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
