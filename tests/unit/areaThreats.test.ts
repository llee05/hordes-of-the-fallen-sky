import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import {
  createAreaThreats,
  addAreaThreat,
  advanceAreaThreats,
  areaMovementMultiplier,
} from '../../src/game/state/areaThreats';
import { createRun } from '../../src/game/state/run';
import {
  createAreaEncounter,
  advanceAreaEncounter,
  areaArrivalAngle,
} from '../../src/game/state/areaEncounters';
import { AREA_ENCOUNTERS } from '../../src/game/data/areaEncounters';
import {
  areaSurface,
  habitatPreference,
  areaRiverTangent,
} from '../../src/game/systems/AreaHabitat';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import { composedRegion } from '../../src/game/data/worldRegions';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import type { AreaThreatKind } from '../../src/game/data/areaEncounters';

describe('bounded local terrain and spell threats', () => {
  it('warns before damage, freezes in menus, and expires fields without stacking slows', () => {
    const state = createAreaThreats(),
      point = { x: 2600, y: 2600 };
    let damage = 0;
    const actions = {
      ownerActive: () => true,
      hit: (_t: unknown, n: number) => {
        damage += n;
      },
    };
    addAreaThreat(state, 'frost', point);
    addAreaThreat(state, 'mire', point);
    advanceAreaThreats(state, 'playing', 1, actions);
    expect(damage).toBe(0);
    expect(areaMovementMultiplier(state, point)).toBe(1);
    const paused = structuredClone(state);
    advanceAreaThreats(state, 'paused', 20, actions);
    expect(state).toEqual(paused);
    advanceAreaThreats(state, 'playing', 1, actions);
    expect(damage).toBe(5);
    expect(areaMovementMultiplier(state, point)).toBe(0.7);
    advanceAreaThreats(state, 'playing', 10, actions);
    expect(state.threats).toHaveLength(0);
    expect(areaMovementMultiplier(state, point)).toBe(1);
  });
  it('bounds storms of simultaneous casters and cancels a defeated or reused pooled incarnation before release', () => {
    const state = createAreaThreats();
    for (let i = 0; i < 1000; i++)
      addAreaThreat(state, 'rockfall', { x: 3000, y: 3000 }, 0, `${i % 20}:1`);
    expect(state.threats).toHaveLength(GAME.areaCombat.maxThreats);
    expect(state.threats.filter((t) => t.owner === '0:1').length).toBeLessThanOrEqual(
      GAME.areaCombat.maxOwnerThreats,
    );
    let hits = 0;
    advanceAreaThreats(state, 'playing', 3, {
      ownerActive: () => false,
      hit: () => {
        hits++;
      },
    });
    expect(hits).toBe(0);
    expect(state.threats).toHaveLength(0);
    addAreaThreat(state, 'mire', { x: 3000, y: 3000 }, 0, '3:2');
    advanceAreaThreats(state, 'playing', 2, {
      ownerActive: () => true,
      hit: () => {
        hits++;
      },
    });
    advanceAreaThreats(state, 'playing', 0.1, {
      ownerActive: () => false,
      hit: () => {
        hits++;
      },
    });
    expect(state.threats).toHaveLength(1); // Released ground remains after the caster falls.
  });
  it('supports every authored warning and rejects invalid time and positions', () => {
    for (const kind of Object.keys(GAME.areaCombat.threats) as AreaThreatKind[]) {
      const state = createAreaThreats();
      expect(addAreaThreat(state, kind, { x: NaN, y: 0 })).toBe(false);
      expect(addAreaThreat(state, kind, { x: 0, y: 0 }, 1)).toBe(true);
      const before = structuredClone(state);
      for (const dt of [NaN, -1, 0, Infinity])
        advanceAreaThreats(state, 'playing', dt, {
          ownerActive: () => true,
          hit: () => {
            throw Error('invalid tick');
          },
        });
      expect(state).toEqual(before);
      expect(state.threats[0]!.warning).toBe(GAME.areaCombat.threats[kind].warning + 1);
    }
  });
});
describe('local rules follow the physical landscape', () => {
  it('aligns bank approaches to the real curved river instead of an arbitrary compass direction', () => {
    const id = 'orkhon-valley',
      terrain = new ComposedTerrain(composedRegion(id), LANDSCAPES[id].water);
    const bridge = terrain.river!.bridges[0]!,
      angle = areaRiverTangent(terrain, id, { x: bridge.x, y: bridge.z }, 2.5);
    expect(Math.abs(Math.cos(angle) * bridge.nz - Math.sin(angle) * bridge.nx)).toBeGreaterThan(
      0.97,
    );
    expect(areaRiverTangent(undefined, 'eej-khairkhan', { x: 2600, y: 2600 }, 1.2)).toBe(1.2);
  });
  it('teaches once, respects recovery, never banks bursts, and resets on actual migration/arrival', () => {
    const r = createRun();
    r.phase = 'playing';
    r.clan.region = 1;
    r.clan.locationId = 'orkhon-valley';
    const state = createAreaEncounter();
    expect(advanceAreaEncounter(state, r, 2)).toBe('lesson');
    r.clan.stageTime = 65;
    expect(advanceAreaEncounter(state, r, 100)).toBeUndefined();
    r.clan.stageTime = 30;
    expect(advanceAreaEncounter(state, r, 0.05)).toBe('terrain');
    expect(advanceAreaEncounter(state, r, 0.05)).toBeUndefined();
    const before = structuredClone(state);
    r.phase = 'paused';
    advanceAreaEncounter(state, r, 100);
    expect(state).toEqual(before);
    r.phase = 'playing';
    r.clan.stage = 'migration';
    r.clan.stageTime = 30;
    advanceAreaEncounter(state, r, 100);
    expect(state.sequence).toBe(0);
    r.clan.locationId = 'eej-khairkhan';
    r.clan.stage = 'camp';
    expect(advanceAreaEncounter(state, r, 2)).toBe('lesson');
    expect(state.sequence).toBe(0);
  });
  it('uses different approach patterns while preserving the gentle opening', () => {
    const r = createRun(),
      state = createAreaEncounter();
    state.arrivals = 0;
    expect(areaArrivalAngle(state, r, 0)).toBe(0);
    r.clan.region = 1;
    r.clan.locationId = 'orkhon-valley';
    expect(areaArrivalAngle(state, r, 0)).toBe(-Math.PI / 2);
    state.arrivals = 1;
    expect(areaArrivalAngle(state, r, 0)).toBe(Math.PI / 2);
    r.clan.locationId = 'bogd-khan-uul';
    expect(areaArrivalAngle(state, r, 0)).toBe(Math.PI / 3);
  });
  it('shares rendered grove, shore, snow and shelter masks and treats bridges as safe from bank pooling', () => {
    const id = 'orkhon-valley',
      terrain = new ComposedTerrain(composedRegion(id), LANDSCAPES[id].water);
    for (const b of terrain.river!.bridges)
      expect(areaSurface(terrain, id, b.x, b.z).shore).toBe(0);
    expect(areaSurface(terrain, id, 2600, 2600).grove).toBe(0);
    const forest = new ComposedTerrain(composedRegion('bogd-khan-uul'));
    let max = 0;
    for (let x = 1300; x < 2400; x += 128)
      for (let y = 1300; y < 2400; y += 128)
        max = Math.max(
          max,
          habitatPreference(
            areaSurface(forest, 'bogd-khan-uul', x, y),
            AREA_ENCOUNTERS['bogd-khan-uul'].habitat,
          ),
        );
    expect(max).toBeGreaterThan(0.5);
  });
});
