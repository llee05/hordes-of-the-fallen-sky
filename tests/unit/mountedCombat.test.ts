import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { ENEMIES } from '../../src/game/data/enemies';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import {
  advanceMountedCombat,
  retreatShot,
  riderCooldowns,
} from '../../src/game/state/mountedCombat';
import { createRun } from '../../src/game/state/run';
import {
  advanceCharge,
  createEnemyTactics,
  tacticalGoal,
} from '../../src/game/systems/enemyTactics';
import { world } from './fixtures/expedition';

describe('rider cooldowns', () => {
  it.each([2, 4, 16])(
    'keeps %i rider cooldowns saveable when the last rider fires first',
    (count) => {
      const run = createRun();
      const cooldowns = riderCooldowns(run.combat, count);
      cooldowns[count - 1] = 10;
      const expected = Array(count - 1)
        .fill(0)
        .concat(10);
      expect(run.combat.riderFireAt).toEqual(expected);
      const restored = decodeExpedition(captureExpedition(run, world())).run;
      expect(restored.combat.riderFireAt).toEqual(expected);
      const resumed = riderCooldowns(restored.combat, count);
      expect(resumed[count - 1]).toBe(10);
      resumed[0] = 12;
      expect(riderCooldowns(restored.combat, count)[0]).toBe(12);
      expect(resumed[count - 1]).toBe(10);
    },
  );
  it('initializes new riders without resetting existing cooldowns', () => {
    const run = createRun();
    riderCooldowns(run.combat, 1)[0] = 12;
    expect(riderCooldowns(run.combat, 3)).toEqual([12, 0, 0]);
  });
});

describe('mounted positioning', () => {
  it('builds formation momentum from real riding without charging an automatic volley', () => {
    const r = createRun();
    r.phase = 'playing';
    for (let i = 0; i < 100; i++) advanceMountedCombat(r, 0.05, { x: 2600, y: 2600 }, false);
    expect(r.clan.momentum).toBe(0);
    expect(r.combat.ready).toBe(false);
    for (let i = 0; i < 80; i++)
      advanceMountedCombat(r, 0.05, { x: 2600 + i * 9.5, y: 2600 }, false);
    expect(r.combat.ready).toBe(false);
    expect(r.combat.rideSeconds).toBe(0);
    expect(r.clan.momentum).toBe(1);
    advanceMountedCombat(r, 0.05, { x: 500, y: 500 }, false);
    expect(r.combat.rideSeconds).toBe(0);
    const actor = { x: 3000, y: 2600, rendererCallback: () => {} };
    advanceMountedCombat(r, 0.05, actor, true);
    expect(() => structuredClone(r)).not.toThrow();
    const before = structuredClone(r);
    r.phase = 'paused';
    const paused = structuredClone(r);
    advanceMountedCombat(r, 10, { x: 3000, y: 3000 }, true);
    expect(r).toEqual(paused);
    expect(before.combat.trails).toHaveLength(0);
  });
  it('bounds upgraded slowing wakes, expires them on active time, and rewards an outward retreat shot', () => {
    const r = createRun();
    r.phase = 'playing';
    r.clan.formation = 'retreat';
    r.clan.momentum = 1;
    for (let i = 0; i < 100; i++)
      advanceMountedCombat(r, 0.05, { x: 1000 + i * 25, y: 2600 }, true);
    expect(r.combat.trails).toHaveLength(0);
    expect(r.combat.trails.length).toBeLessThanOrEqual(GAME.mounted.maxTrails);
    expect(
      retreatShot(
        r,
        { x: 3000, y: 2600 },
        { x: 2600, y: 2600 },
        { x: 2900, y: 2600 },
        { x: 1, y: 0 },
      ),
    ).toBe(true);
    expect(
      retreatShot(
        r,
        { x: 3000, y: 2600 },
        { x: 2600, y: 2600 },
        { x: 3100, y: 2600 },
        { x: 1, y: 0 },
      ),
    ).toBe(false);
    advanceMountedCombat(r, 3, { x: 3475, y: 2600 }, false);
    expect(r.combat.trails).toHaveLength(0);
    r.health = 0;
    advanceMountedCombat(r, 0.1, { x: 3500, y: 2600 }, false);
    expect(r.combat.ready).toBe(false);
    expect(r.clan.momentum).toBe(0);
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
