# Mount Belukha (Uch-Sumer) level

Mount Belukha is an authored glacial-valley battlefield beneath the paired white heights of the Altai.
Its 6,400 × 4,000-unit playable rectangle matches the approved Orkhon Valley and Altan Ovoo scale while leaving the camera, combat, saves, migration rules and interface unchanged.
Run `npm run dev`, press **F8**, and choose **Mount Belukha**.

## Layout

`src/game/data/belukha.ts` is the single source for centre-relative level coordinates, where +x is east and +y is south.

- The camp sits on open lower meadow at (-2100, 1050), away from both painted-ground joins, with a 540-unit spawn-safe clearing.
- An inaccessible northern headwall carries the paired summit silhouette and glacier pieces; it frames the camp-sized valley rather than turning the level into a summit ascent.
- Western moraine and eastern larch terraces form the upper tier, 240 units above the valley floor.
- One west ramp and two east ramps connect the accessible terraces to the lower ground.
- Connected trails link camp, the western moraine, the Akkem-inspired lake shore, the east bank and bridge, conifer hollow, larch overlook, and glacial outwash.
- A milky glacial lake feeds one impassable outflow, crossed at a single timber bridge.

Every worn trail ends at a named terrain place or rejoins the network.
Broad camp, central-meadow and southern lanes remain open for horde combat.

## Hybrid terrain and scenery

The four ground paintings project across the existing elevation geometry.
Cliffs, ramps, water, bridge, trees, glacier and summit cutouts, camp objects, actors, collision, and shadows remain separate runtime geometry or sprites.
The upper tiers therefore retain the same matte manuscript brushwork as the valley rather than becoming smooth generated materials.

Deterministic conifer clusters frame the outer valley and terrace rims; moraine stone bands reinforce the north and south edges.
The camp clearing, roads, ramp mouths, lake, outflow, bridge approaches and broad fighting lanes remain clear.
The summit, glacier, pines, larches, boulders and pebbles all reuse bundled scenery.

The playable rectangle is centred inside a 9,216-unit terrain square.
That off-playfield margin keeps fallback-painted terrain under the yawed three-quarter camera at every legal position and zoom, preventing an untextured wedge from appearing beyond the arena edge.

## Painted ground

Four 1,600 × 1,000 macro paintings cover the 3,200 × 2,000 north-west, north-east, south-west and south-east quadrants.
They share one continuous manuscript painting, split only after its road, moraine, lake-bed and outwash joins were resolved.
The existing 1,024² neutral detail layer adds close paper-and-brush grain.
Outside the playable rectangle, an irregular feather blends into the bundled `mount-belukha.png` fallback.

The development-only `?belukhaPaintedGround=0` query disables the macro paintings for diagnosis.
`?belukhaLevel=generated` restores the former generated composition and omits the authored water, terraces, paths and dressing.

The four quadrant uploads occupy 34,131,696 bytes (32.55 MiB) with complete mip chains.
Including the detail layer, painted ground occupies 39,724,100 bytes (37.88 MiB).

## Points of interest and follow-ups

Points of interest are terrain and scenery only; this level adds no objective or reward systems.
Separate follow-ups could add:

- lake, glacier, moraine or outwash objectives and rewards;
- avalanche, crevasse, frost, current or rockfall hazards;
- wildlife or snow-leopard signs;
- dedicated ice-wall, braided-water, larch or Akkem-shore artwork;
- lore delivery or summit rituals.

The 350-enemy profile was not measured locally because the shared machine was overloaded by parallel level jobs and the isolated Chromium renderer repeatedly terminated during capture setup.
The regular unit, type, formatting and production-build checks remain the delivery verification; browser suites are deferred to GitHub CI under the task's no-local-browser-test rule.
