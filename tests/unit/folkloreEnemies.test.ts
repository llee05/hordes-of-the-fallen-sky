import { describe, expect, it } from 'vitest';
import {
  ALL_ENEMIES,
  ENCOUNTER_ENEMIES,
  FOLKLORE_ENEMIES,
  areaRoster,
  chooseEnemy,
} from '../../src/game/data/enemies';
import { GAME } from '../../src/game/config';
import {
  advanceAlmas,
  createFolkloreEnemyState,
  type FolkloreEnemyState,
} from '../../src/game/systems/folkloreEnemies';

const origin = { x: 0, y: 0 };

function ready(): FolkloreEnemyState {
  return { ...createFolkloreEnemyState(), cooldown: 0 };
}

describe('folklore enemy catalog', () => {
  it('keeps the Almas spawnable and save-valid without adding it to any live roster', () => {
    const almas = FOLKLORE_ENEMIES.find((enemy) => enemy.id === 'almas');
    expect(almas).toMatchObject({ behavior: 'almas', health: 240, speed: 28, damage: 20 });
    expect(ALL_ENEMIES).toContain(almas);
    expect(ENCOUNTER_ENEMIES).not.toContain(almas);
    expect(areaRoster('orkhon-valley', Number.MAX_SAFE_INTEGER, 9999)).not.toContain(almas);
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999])
      expect(chooseEnemy(9999, () => roll)).not.toBe(almas);
  });
});

describe('Almas attacks', () => {
  it.each([
    [70, 'claw'],
    [150, 'slam'],
    [350, 'charge'],
  ] as const)('commits to a telegraphed %s-distance %s attack', (distance, attack) => {
    const state = ready();
    const step = advanceAlmas(state, 1 / 60, origin, { x: distance, y: 0 });
    expect(step.started).toBe(attack);
    expect(state).toMatchObject({ phase: 'windup', attack, hit: false });
    expect(state.aim).toEqual({ x: distance, y: 0 });
    expect(state.direction).toEqual({ x: 1, y: 0 });
  });

  it('releases claw and slam only after their warning, then enforces recovery and cooldown', () => {
    for (const [distance, warning, attack] of [
      [70, GAME.tactics.almas.clawWarning, 'claw'],
      [150, GAME.tactics.almas.slamWarning, 'slam'],
    ] as const) {
      const state = ready();
      advanceAlmas(state, 0.01, origin, { x: distance, y: 0 });
      expect(
        advanceAlmas(state, warning - 0.02, origin, { x: distance, y: 0 }).released,
      ).toBeUndefined();
      expect(advanceAlmas(state, 0.021, origin, { x: distance, y: 0 }).released).toBe(attack);
      expect(state.phase).toBe('recover');
      expect(state.cooldown).toBe(GAME.tactics.almas.cooldown);
    }
  });

  it('charges along its snapshotted direction, recovers, and can be interrupted', () => {
    const state = ready();
    advanceAlmas(state, 0.01, origin, { x: 180, y: 240 });
    expect(state.direction?.x).toBeCloseTo(0.6);
    expect(state.direction?.y).toBeCloseTo(0.8);
    expect(
      advanceAlmas(state, GAME.tactics.almas.chargeWarning, origin, { x: -500, y: 0 }).released,
    ).toBe('charge');
    expect(state.phase).toBe('attack');
    advanceAlmas(state, GAME.tactics.almas.chargeDuration, origin, { x: -500, y: 0 });
    expect(state.phase).toBe('recover');
    advanceAlmas(state, 0.01, origin, { x: -500, y: 0 }, true);
    expect(state.phase).toBe('recover');
    expect(state.remaining).toBe(GAME.tactics.almas.recovery);
  });
});
