import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { ALL_ENEMIES, ENEMIES } from '../../src/game/data/enemies';
import {
  addShield,
  applyStatusPayload,
  controlResistance,
  createEnemyStatus,
  createKhanStatus,
  enemySize,
  guardKhan,
  isEnemyDisabled,
  isKhanGuarded,
  isKhanUnstoppable,
  isShredded,
  khanStatusOf,
  khanStatusSpeed,
  mitigateKhanDamage,
  statusDamageMultiplier,
  statusSpeedMultiplier,
  tickEnemyStatus,
  tickKhanStatus,
} from '../../src/game/state/statusEffects';

const khan = { x: 0, y: 0 };

describe('enemy status effects', () => {
  it('starts neutral', () => {
    const status = createEnemyStatus();
    expect(isEnemyDisabled({ pinned: 0, status })).toBe(false);
    expect(statusSpeedMultiplier(status)).toBe(1);
    expect(statusDamageMultiplier(status)).toBe(1);
    expect(isShredded(status)).toBe(false);
  });

  it('stuns for the payload duration scaled by resistance and never shortens a longer stun', () => {
    const status = createEnemyStatus();
    applyStatusPayload(status, { stun: 2 }, { x: 50, y: 0 }, khan, 0.5);
    expect(status.stun).toBe(1);
    expect(isEnemyDisabled({ pinned: 0, status })).toBe(true);
    applyStatusPayload(status, { stun: 0.4 }, { x: 50, y: 0 }, khan);
    expect(status.stun).toBe(1);
    applyStatusPayload(status, { stun: 3 }, { x: 50, y: 0 }, khan);
    expect(status.stun).toBe(3);
  });

  it('treats a pinned enemy as disabled without a stun', () => {
    expect(isEnemyDisabled({ pinned: 0.3, status: createEnemyStatus() })).toBe(true);
  });

  it('slows to a fraction of speed, keeps the stronger slow and respects the floor', () => {
    const status = createEnemyStatus();
    applyStatusPayload(status, { slow: { multiplier: 0.6, seconds: 2 } }, khan, khan);
    expect(statusSpeedMultiplier(status)).toBe(0.6);
    applyStatusPayload(status, { slow: { multiplier: 0.8, seconds: 5 } }, khan, khan);
    expect(statusSpeedMultiplier(status)).toBe(0.6);
    expect(status.slow).toBe(5);
    applyStatusPayload(status, { slow: { multiplier: 0.01, seconds: 1 } }, khan, khan);
    expect(statusSpeedMultiplier(status)).toBe(GAME.status.slowFloor);
  });

  it('raises damage taken while shredded and returns to normal when it expires', () => {
    const status = createEnemyStatus();
    applyStatusPayload(status, { shred: { bonus: 0.3, seconds: 6 } }, khan, khan);
    expect(statusDamageMultiplier(status)).toBeCloseTo(1.3);
    expect(isShredded(status)).toBe(true);
    tickEnemyStatus(status, 5.9);
    expect(statusDamageMultiplier(status)).toBeCloseTo(1.3);
    tickEnemyStatus(status, 0.2);
    expect(statusDamageMultiplier(status)).toBe(1);
    expect(status.shredBonus).toBe(0);
  });

  it('knocks back away from the Khan at distance over seconds', () => {
    const status = createEnemyStatus();
    applyStatusPayload(
      status,
      { knockback: { distance: 60, seconds: 0.3 } },
      { x: 0, y: 40 },
      khan,
    );
    expect(status.forced).toBeCloseTo(0.3);
    expect(status.forcedVx).toBeCloseTo(0);
    expect(status.forcedVy).toBeCloseTo(200);
    // Travelled distance = velocity * duration.
    expect(Math.hypot(status.forcedVx, status.forcedVy) * status.forced).toBeCloseTo(60);
  });

  it('scales knockback distance and time by resistance', () => {
    const status = createEnemyStatus();
    applyStatusPayload(
      status,
      { knockback: { distance: 60, seconds: 0.4 } },
      { x: 10, y: 0 },
      khan,
      0.5,
    );
    expect(status.forced).toBeCloseTo(0.2);
    expect(Math.hypot(status.forcedVx, status.forcedVy) * status.forced).toBeCloseTo(30);
  });

  it('pulls toward the Khan and stops short of him', () => {
    const status = createEnemyStatus();
    const payload = { pull: { distance: 200, seconds: 0.4, stopAt: 50 } };
    applyStatusPayload(status, payload, { x: 150, y: 0 }, khan);
    expect(status.forcedVx).toBeCloseTo(-250);
    expect(Math.abs(status.forcedVx) * status.forced).toBeCloseTo(100);
    const capped = createEnemyStatus();
    applyStatusPayload(capped, payload, { x: 400, y: 0 }, khan);
    expect(Math.abs(capped.forcedVx) * capped.forced).toBeCloseTo(200);
  });

  it('does not pull an enemy already inside the stop distance', () => {
    const status = createEnemyStatus();
    applyStatusPayload(
      status,
      { pull: { distance: 200, seconds: 0.4, stopAt: 50 } },
      { x: 30, y: 0 },
      khan,
    );
    expect(status.forced).toBe(0);
    expect(status.forcedVx).toBe(0);
  });

  it('counts every timer down in active seconds and clears expired forced motion', () => {
    const status = createEnemyStatus();
    applyStatusPayload(
      status,
      {
        stun: 1,
        slow: { multiplier: 0.5, seconds: 2 },
        knockback: { distance: 10, seconds: 0.5 },
      },
      { x: 10, y: 0 },
      khan,
    );
    tickEnemyStatus(status, 0);
    tickEnemyStatus(status, -1);
    tickEnemyStatus(status, Number.NaN);
    expect(status.stun).toBe(1);
    tickEnemyStatus(status, 0.6);
    expect(status.forced).toBe(0);
    expect(status.forcedVx).toBe(0);
    expect(status.stun).toBeCloseTo(0.4);
    tickEnemyStatus(status, 5);
    expect(status).toEqual(createEnemyStatus());
  });
});

describe('enemy size and control resistance', () => {
  it('uses the existing scale and elite data to tell small from large', () => {
    const size = (id: string) => {
      const definition = ALL_ENEMIES.find((enemy) => enemy.id === id)!;
      return enemySize(definition);
    };
    for (const id of ['wisp', 'bat', 'ghost-rider', 'hollow-seer']) expect(size(id)).toBe('small');
    for (const id of ['brute', 'frost-mare', 'eclipse-giant']) expect(size(id)).toBe('large');
  });

  it('classifies every shared and local enemy as large exactly when it is bulwark-sized or elite', () => {
    for (const enemy of ALL_ENEMIES)
      expect(enemySize(enemy)).toBe(
        enemy.elite || enemy.scale >= GAME.status.largeScale ? 'large' : 'small',
      );
    expect(ENEMIES.some((enemy) => enemySize(enemy) === 'small')).toBe(true);
    expect(ENEMIES.some((enemy) => enemySize(enemy) === 'large')).toBe(true);
  });

  it('lets large enemies and elites keep less of a stun', () => {
    const wisp = ALL_ENEMIES.find((e) => e.id === 'wisp')!;
    const brute = ALL_ENEMIES.find((e) => e.id === 'brute')!;
    const giant = ALL_ENEMIES.find((e) => e.id === 'eclipse-giant')!;
    expect(controlResistance(wisp)).toBe(1);
    expect(controlResistance(brute)).toBe(GAME.status.largeControl);
    expect(controlResistance(giant)).toBe(GAME.status.eliteControl);
    // A forced elite spawn counts as elite even if its definition is not.
    expect(controlResistance(wisp, true)).toBe(GAME.status.eliteControl);
    expect(enemySize(wisp, true)).toBe('large');
  });
});

describe('Khan status effects', () => {
  it('starts neutral and is created on demand in a timers object', () => {
    const timers: { khanStatus?: ReturnType<typeof createKhanStatus> } = {};
    const status = khanStatusOf(timers);
    expect(status).toBe(timers.khanStatus);
    expect(khanStatusOf(timers)).toBe(status);
    expect(isKhanGuarded(status)).toBe(false);
    expect(isKhanUnstoppable(status)).toBe(false);
    expect(mitigateKhanDamage(status, 10)).toBe(10);
    expect(khanStatusSpeed(status)).toBe(1);
  });

  it('cuts damage and ride speed while guarded, and is unstoppable only when asked', () => {
    const status = createKhanStatus();
    guardKhan(status, { duration: 4, reduction: 0.65, speedMultiplier: 0.6, unstoppable: true });
    expect(mitigateKhanDamage(status, 20)).toBeCloseTo(7);
    expect(khanStatusSpeed(status)).toBe(0.6);
    expect(isKhanUnstoppable(status)).toBe(true);
    const plain = createKhanStatus();
    guardKhan(plain, { duration: 1, reduction: 0.2 });
    expect(isKhanUnstoppable(plain)).toBe(false);
    expect(khanStatusSpeed(plain)).toBe(1);
  });

  it('expires after its duration in active seconds', () => {
    const status = createKhanStatus();
    guardKhan(status, { duration: 4, reduction: 0.65, speedMultiplier: 0.6, unstoppable: true });
    tickKhanStatus(status, 3.9);
    expect(mitigateKhanDamage(status, 20)).toBeCloseTo(7);
    tickKhanStatus(status, 0.2);
    expect(mitigateKhanDamage(status, 20)).toBe(20);
    expect(isKhanUnstoppable(status)).toBe(false);
    expect(khanStatusSpeed(status)).toBe(1);
    expect(isKhanGuarded(status)).toBe(false);
    tickKhanStatus(status, 0);
    tickKhanStatus(status, Number.NaN);
  });

  it('keeps the stronger guard when refreshed', () => {
    const status = createKhanStatus();
    guardKhan(status, { duration: 4, reduction: 0.65, speedMultiplier: 0.6 });
    guardKhan(status, { duration: 1, reduction: 0.3, speedMultiplier: 0.75 });
    expect(status.reduction).toBe(0.65);
    expect(status.speedMultiplier).toBe(0.6);
    expect(status.guard).toBe(4);
  });

  it('absorbs damage in the shield after the reduction, then lets the rest through', () => {
    const status = createKhanStatus();
    status.fortress = 5;
    status.shield = 10;
    status.shieldMax = 40;
    guardKhan(status, { duration: 5, reduction: 0.5 });
    // 40 damage → 20 after reduction → shield absorbs 10 → 10 remains.
    expect(mitigateKhanDamage(status, 40)).toBeCloseTo(10);
    expect(status.shield).toBe(0);
    expect(mitigateKhanDamage(status, 40)).toBeCloseTo(20);
  });

  it('regenerates the stance shield up to its cap and loses it when the stance ends', () => {
    const status = createKhanStatus();
    status.fortress = 3;
    status.fortressTimer = 0.5;
    status.shield = 5;
    status.shieldMax = 20;
    status.shieldPerSecond = 10;
    tickKhanStatus(status, 1);
    expect(status.shield).toBe(15);
    tickKhanStatus(status, 1);
    expect(status.shield).toBe(20);
    addShield(status, 100);
    expect(status.shield).toBe(20);
    tickKhanStatus(status, 1);
    expect(status.fortress).toBe(0);
    expect(status.shield).toBe(0);
    expect(status.shieldMax).toBe(0);
    addShield(status, 5);
    expect(status.shield).toBe(0);
  });
});
