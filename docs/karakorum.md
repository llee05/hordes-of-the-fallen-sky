# Karakorum level

Karakorum is a prologue-only authored battlefield at the edge of the imperial city. Phase 1 makes
the place independently playable through Developer mode; it does not yet add the prologue flow,
tutorial beats, scripted omen, boss, report scene, or route lock. Run `npm run dev` or
`npm run dev:web`, press **F8**, and choose **Karakorum**.

Karakorum is a ninth valid location for checkpoints, saves, area encounters, and world rendering.
It is flagged `prologueOnly`, excluded from `DESTINATIONS`, and therefore never appears in normal
migration choices or the chronicle journey map. The eight established destinations remain the
ordinary expedition route network.

## Layout

`src/game/data/karakorum.ts` is the source for centre-relative coordinates, where +x is east and
+y is south. The playable rectangle is 6,400 × 4,000 world units on an 8,704-unit padded terrain
canvas.

- A compact placeholder city footprint occupies the north-east. Palisade runs mark the wall and
  western gate; gers, a canopy, banners, and racks suggest the inhabited edge without making the
  whole capital explorable.
- The gate connects directly to the training yard and report post.
- A broad worn road leaves the gate west through three track points, the abandoned patrol cart,
  and the ovoo where the first omen will later occur.
- A southern branch connects the cart, patrol rally, and expedition camp site.
- The camp site is a 520-unit protected clearing on the flat pasture. `campShelf: false` and low
  relief keep mounted movement and horde combat readable.
- A shallow decorative bend of the upper Orkhon follows the northern edge, outside every authored
  route and tutorial site.

Every named site and road is on connected walkable ground. City wall and structure footprints are
solid navigation obstacles; the roads, gate opening, yard, camp clearing, and future objective
anchors remain clear.

## Placeholder presentation

`world3d/karakorumDressing.ts` deterministically reuses the bundled Orkhon terrain and scenery
pack. The authored terrain shader supplies calm manuscript grass, worn earth, gravel, water, and
bank textures. Existing palisades, gers, canopy, cart, blue banner, weapon racks, standing stone,
ovoo, shrubs, and trees supply the city edge and pasture dressing. Everything remains untinted,
keeps its painted ground anchor, and leaves routes and combat space open.

This is deliberately temporary. [The Karakorum city-kit art order](art-orders/karakorum-city-kit.md)
specifies the dedicated wall, gate, roofline, market, granary, stone turtle, training target, and
hitching rail that will replace the most conspicuous placeholders in the later art phase.

## Content boundaries

Karakorum has a local area encounter and two palette variants so the Phase 1 checkpoint follows the
same complete data contract as every other place. These are ordinary developer-camp encounters,
not the scripted prologue omen. Prologue-specific spawn control and narrative logic belong to later
phases.

The setting presents Karakorum as the player's home city at the height of the Mongol Empire. It
does not name or depict a historical ruler, court ritual, or real tradition as supernatural. The
fictional calamity remains distinct from the real city's history. Geographic context follows
[UNESCO's Orkhon Valley Cultural Landscape](https://whc.unesco.org/en/list/1081/), which includes
the archaeological remains of Karakorum within the wider pastoral landscape.

## Verification

`tests/unit/karakorumLevel.test.ts` covers catalogue visibility, the developer checkpoint, save
round-tripping, world bounds, connected site navigation, solid city footprints, authored field
sites, western arrivals, deterministic dressing, and use of bundled atlas frames.

`npm run visual:karakorum` is the repeatable local-only capture entry point for the gate, training
yard, and west track. It is not part of `npm run check` and should run only when browser capture is
explicitly approved.
