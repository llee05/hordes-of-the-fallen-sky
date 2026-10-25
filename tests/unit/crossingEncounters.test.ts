import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import { beginMigration, advanceClan } from '../../src/game/state/clan';
import {
  advanceCrossingEncounter,
  settleCrossingEncounter,
} from '../../src/game/state/crossingEncounters';
import { CROSSING_ENCOUNTERS } from '../../src/game/data/crossings';
import { crossingLandscape } from '../../src/game/data/crossingLandscapes';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { TerrainNavigation } from '../../src/game/terrain/TerrainNavigation';
import { WORLD_REGIONS } from '../../src/game/data/worldRegions';
const camp = { x: 2600, y: 2600 };
function crossing(route: 'river' | 'ridge' | 'refuge') {
  const r = createRun();
  r.phase = 'route';
  r.clan.stageTime = 45;
  expect(beginMigration(r, route)).toBe(true);
  r.phase = 'playing';
  return r;
}
describe('distinct crossing encounters', () => {
  it('warns before a bounded assault and never pays an optional reward early or twice', () => {
    for (const route of ['river', 'ridge'] as const) {
      const r = crossing(route);
      r.clan.integrity = 50;
      expect(advanceCrossingEncounter(r, 1, camp, camp, 0)).toBe(false);
      r.clan.migrationProgress = 0.2;
      expect(advanceCrossingEncounter(r, 0.1, camp, camp, 0)).toBe(true);
      r.phase = 'paused';
      const before = structuredClone(r);
      advanceCrossingEncounter(r, 10, camp, camp, 0);
      expect(r).toEqual(before);
      r.phase = 'playing';
      advanceCrossingEncounter(r, 4, camp, camp, 0);
      expect(r.crossing!.phase).toBe('assault');
      r.crossing!.spawned = r.crossing!.defeated = CROSSING_ENCOUNTERS[route].guards;
      expect(settleCrossingEncounter(r)).toBe(false);
      const materials = r.clan.materials;
      r.clan.migrationProgress = 1;
      expect(settleCrossingEncounter(r)).toBe(true);
      const paid = structuredClone(r);
      expect(settleCrossingEncounter(r)).toBe(false);
      expect(r).toEqual(paid);
      expect(r.clan.materials - materials).toBe(route === 'ridge' ? 10 : 0);
      expect(r.clan.integrity).toBe(route === 'river' ? 66 : 60);
    }
  });
  it('requires a protected escort to join the caravan and keeps failed objectives optional', () => {
    const r = crossing('refuge');
    r.crossing!.escort = { ...camp, progress: 0, exposure: 0, joined: false, lost: false };
    advanceCrossingEncounter(r, 2, camp, camp, 1);
    expect(r.crossing!.escort.joined).toBe(false);
    advanceCrossingEncounter(r, 2, camp, camp, 0);
    expect(r.crossing!.escort.joined).toBe(true);
    expect(advanceClan(r, 100)).toBe('arrived');
    expect(r.clan.population).toBe(18);
    const failed = crossing('refuge');
    failed.crossing!.escort = { ...camp, progress: 0, exposure: 0, joined: false, lost: false };
    advanceCrossingEncounter(failed, 8, camp, camp, 1);
    expect(failed.crossing!.escort.lost).toBe(true);
    expect(advanceClan(failed, 100)).toBe('arrived');
    expect(failed.clan.population).toBe(16);
  });
  it.each(Object.keys(WORLD_REGIONS) as (keyof typeof WORLD_REGIONS)[])(
    'keeps broad caravan approaches connected for river and ridge routes in %s',
    (id) => {
      for (const route of ['river', 'ridge']) {
        const c = crossingLandscape(id, route),
          terrain = new ComposedTerrain(c.terrain, c.landscape.water),
          nav = new TerrainNavigation(terrain);
        expect(nav.isWalkable(2600, 2600, 24, true)).toBe(true);
        for (let x = 2600; x <= 3750; x += 32) {
          expect(nav.isWalkable(x, 2600, 24, true), `${route} at ${x}`).toBe(true);
        }
        if (route === 'river') expect(terrain.river!.distance(3420, 2600)).toBeLessThan(160);
      }
    },
  );
});
