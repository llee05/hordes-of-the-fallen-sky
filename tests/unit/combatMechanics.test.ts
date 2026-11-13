import { describe, expect, it } from 'vitest';
import {
  activeKhanManeuver,
  advanceKhanManeuver,
  startKhanManeuver,
} from '../../src/game/state/khanManeuvers';
import {
  applyStatusPayload,
  createEnemyStatus,
  enemySize,
  tickEnemyStatus,
} from '../../src/game/state/statusEffects';

describe('reusable combat maneuvers', () => {
  it('normalizes a forced dash and expires only in active seconds', () => {
    const timers: Parameters<typeof startKhanManeuver>[0] = {};
    startKhanManeuver(timers, 0.5, 3, { x: 3, y: 4 });
    expect(activeKhanManeuver(timers)?.direction).toEqual({ x: 0.6, y: 0.8 });
    advanceKhanManeuver(timers, 0);
    expect(activeKhanManeuver(timers)?.remaining).toBe(0.5);
    advanceKhanManeuver(timers, 0.2);
    expect(activeKhanManeuver(timers)?.remaining).toBeCloseTo(0.3);
    advanceKhanManeuver(timers, 0.3);
    expect(activeKhanManeuver(timers)).toBeUndefined();
  });
});

describe('reusable enemy forced movement', () => {
  it('uses enemy scale and elite data for small-enemy knockback rules', () => {
    expect(enemySize({ scale: 2 })).toBe('small');
    expect(enemySize({ scale: 3 })).toBe('large');
    expect(enemySize({ scale: 2, elite: true })).toBe('large');
  });

  it('applies knockback as timed velocity and clears it on expiry', () => {
    const status = createEnemyStatus();
    applyStatusPayload(
      status,
      { knockback: { distance: 70, seconds: 0.35 } },
      { x: 0, y: 20 },
      { x: 0, y: 0 },
    );
    expect(status.forced).toBeCloseTo(0.35);
    expect(status.forcedVy).toBeCloseTo(200);
    tickEnemyStatus(status, 0.36);
    expect(status.forced).toBe(0);
    expect(status.forcedVy).toBe(0);
  });
});
