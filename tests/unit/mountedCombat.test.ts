import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { ENEMIES } from '../../src/game/data/enemies';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { advanceMountedCombat } from '../../src/game/state/mountedCombat';
import { createRun } from '../../src/game/state/run';
import {
  advanceCharge,
  createEnemyTactics,
  tacticalGoal,
} from '../../src/game/systems/enemyTactics';
import { world } from './fixtures/expedition';

describe('slowing trails', () => {
  it('fades saved trails on active time only', () => {
    const r = createRun();
    r.combat.trails = [{ x: 2600, y: 2600, remaining: 1 }];
    advanceMountedCombat(r, 0.5);
    expect(r.combat.trails[0]!.remaining).toBe(1);
    r.phase = 'playing';
    advanceMountedCombat(r, 0.5);
    expect(r.combat.trails[0]!.remaining).toBeCloseTo(0.5);
    advanceMountedCombat(r, NaN);
    expect(r.combat.trails).toHaveLength(1);
    advanceMountedCombat(r, 0.6);
    expect(r.combat.trails).toHaveLength(0);
  });
});

describe('retired allied riders', () => {
  it('loads an old save carrying rider, formation and momentum fields and drops them', () => {
    const save = captureExpedition(createRun(), world()) as Record<string, any>;
    Object.assign(save.run.clan, { formation: 'retreat', momentum: 0.8, rescuedRiders: 2 });
    save.run.clan.campEffects.multipliers.riderDamage = 1.38;
    Object.assign(save.run.combat, {
      riderFireAt: [3, 0, 12],
      previous: { x: 2600, y: 2700 },
      heading: { x: 0, y: 1 },
      rideSeconds: 0,
      ready: false,
    });
    save.run.guidance.completed = ['ride', 'formation'];
    save.world.riders = [{ x: 2400, y: 2500, flip: false, motion: save.world.player.motion }];
    const restored = decodeExpedition(save);
    for (const key of ['formation', 'momentum', 'rescuedRiders'])
      expect(restored.run.clan).not.toHaveProperty(key);
    expect(restored.run.clan.campEffects.multipliers).not.toHaveProperty('riderDamage');
    expect(restored.run.combat).toEqual({ gallopSerial: 0, volleys: 0, trails: [] });
    expect(restored.world).not.toHaveProperty('riders');
    expect(restored.run.clan.integrity).toBe(100);
    expect(() => decodeExpedition(captureExpedition(restored.run, restored.world))).not.toThrow();
  });
});
describe('enemy tactical roles', () => {
  it('telegraphs a committed charge, cancels at terrain or pins, and gives a recovery opportunity', () => {
    const c = createEnemyTactics(),
      from = { x: 0, y: 0 },
      target = { x: 400, y: 0 };
    advanceCharge(c, 0.05, from, Object.assign({}, target, { render: () => {} }), false, false);
    expect(c.phase).toBe('windup');
    expect(c.aim).toEqual(target);
    expect(c.direction).toEqual({ x: 1, y: 0 });
    advanceCharge(c, GAME.tactics.chargeWarning, from, { x: 400, y: 400 }, false, false);
    expect(c.phase).toBe('charge');
    expect(c.direction).toEqual({ x: 1, y: 0 });
    advanceCharge(c, 0.05, from, target, true, false);
    expect(c.phase).toBe('recover');
    advanceCharge(c, 3, from, target, false, false);
    expect(c.phase).toBe('approach');
    advanceCharge(c, 0.05, from, target, false, true);
    expect(c.phase).toBe('recover');
    const copy = structuredClone(c);
    advanceCharge(c, NaN, from, target, false, false);
    expect(c).toEqual(copy);
  });
  it('splits packs into flanks, commits close wolves, and gives seers a standoff position', () => {
    const wolf = ENEMIES[0]!,
      seer = ENEMIES.find((e) => e.id === 'hollow-seer')!;
    const a = tacticalGoal(wolf, { x: 500, y: 0 }, { x: 0, y: 0 }, 0, 0),
      b = tacticalGoal(wolf, { x: 500, y: 0 }, { x: 0, y: 0 }, 1, 0);
    expect(a.y * b.y).toBeLessThan(0);
    expect(tacticalGoal(wolf, { x: 200, y: 0 }, { x: 0, y: 0 }, 0, 0)).toEqual({ x: 0, y: 0 });
    const position = tacticalGoal(seer, { x: 200, y: 0 }, { x: 0, y: 0 }, 0, 0);
    expect(position.x).toBeGreaterThan(300);
  });
});
