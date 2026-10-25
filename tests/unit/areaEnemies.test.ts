import { describe, expect, it } from 'vitest';
import { ALL_ENEMIES, AREA_ENEMIES, ENEMIES, areaRoster } from '../../src/game/data/enemies';
import { AREA_ENCOUNTERS } from '../../src/game/data/areaEncounters';
import { createRun } from '../../src/game/state/run';
import { encounterEnemy, supportingAreaEnemy } from '../../src/game/state/encounters';
import type { LocationId } from '../../src/game/types';

const locations = Object.keys(AREA_ENCOUNTERS) as LocationId[];
function randomSequence() {
  let seed = 84735;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
describe('local and shared enemy rosters', () => {
  it('gives every location two exclusive native definitions with working painted archetypes', () => {
    expect(new Set(ALL_ENEMIES.map((e) => e.id)).size).toBe(ALL_ENEMIES.length);
    expect(AREA_ENEMIES).toHaveLength(locations.length * 2);
    for (const location of locations) {
      const locals = AREA_ENEMIES.filter((e) => e.home === location);
      expect(locals.map((e) => e.id)).toEqual(AREA_ENCOUNTERS[location].natives);
      for (const e of locals) {
        expect(e.title).toBeTruthy();
        expect(e.health).toBeGreaterThan(0);
        expect(e.xp).toBeGreaterThan(0);
        expect(ENEMIES.some((shared) => shared.texture === e.texture)).toBe(true);
        expect(e.id).not.toBe(e.texture);
      }
    }
  });
  it.each(locations)(
    'mixes natives with shared enemies in %s without importing another location’s creatures',
    (location) => {
      const r = createRun();
      r.phase = 'playing';
      r.clan.locationId = location;
      r.clan.region = 1;
      r.clan.stageTime = 40;
      r.elapsed = 300;
      const random = randomSequence(),
        seen = new Set<string>();
      let natives = 0;
      for (let i = 0; i < 1500; i++) {
        const e = encounterEnemy(r, random).definition;
        seen.add(e.id);
        if (e.home) {
          expect(e.home).toBe(location);
          natives++;
        }
      }
      for (const id of AREA_ENCOUNTERS[location].natives) expect(seen.has(id)).toBe(true);
      expect(natives / 1500).toBeGreaterThan(0.64);
      expect(natives / 1500).toBeLessThan(0.76);
      expect([...seen].some((id) => ENEMIES.some((e) => e.id === id))).toBe(true);
      for (let i = 0; i < 12; i++) {
        const e = supportingAreaEnemy(r, i, ['wisp']);
        expect(!e.home || e.home === location).toBe(true);
      }
    },
  );
  it('preserves the introductory wolves and introduces secondary native roles after time in the actual area', () => {
    const r = createRun();
    r.elapsed = 1000;
    r.clan.stageTime = 1;
    for (let i = 0; i < 20; i++) expect(encounterEnemy(r, () => 0).definition.id).toBe('wisp');
    r.clan.region = 1;
    r.clan.locationId = 'bogd-khan-uul';
    expect(
      areaRoster('bogd-khan-uul', 1000, 1)
        .filter((e) => e.home)
        .map((e) => e.id),
    ).toEqual(['rootshade-stalker']);
    expect(areaRoster('bogd-khan-uul', 1000, 40).filter((e) => e.home)).toHaveLength(2);
    r.clan.stage = 'migration';
    r.clan.destinationId = 'eej-khairkhan';
    r.clan.stageTime = 40;
    for (let i = 0; i < 12; i++)
      expect(supportingAreaEnemy(r, i, ['wisp']).home).not.toBe('eej-khairkhan');
  });
});
