import { describe, expect, it } from 'vitest';
import {
  aimedDirection,
  insideAttackArc,
  insideAttackLine,
  movementTowardCursor,
} from '../../src/game/state/khanControls';

describe('manual Khan controls', () => {
  it('moves toward a held cursor and settles near it', () => {
    expect(movementTowardCursor({ x: 10, y: 20 }, { x: 40, y: 60 })).toEqual({
      x: 0.6,
      y: 0.8,
    });
    expect(movementTowardCursor({ x: 10, y: 20 }, { x: 20, y: 25 })).toEqual({ x: 0, y: 0 });
    expect(movementTowardCursor({ x: 10, y: 20 }, undefined)).toEqual({ x: 0, y: 0 });
  });

  it('keeps the previous aim when the cursor is exactly on the rider', () => {
    expect(aimedDirection({ x: 4, y: 5 }, { x: 4, y: 5 }, { x: 0, y: -1 })).toEqual({
      x: 0,
      y: -1,
    });
  });

  it('distinguishes line and arc hit shapes', () => {
    const origin = { x: 0, y: 0 };
    const east = { x: 1, y: 0 };
    expect(insideAttackLine(origin, east, { x: 90, y: 8 }, 100, 20)).toBe(true);
    expect(insideAttackLine(origin, east, { x: 90, y: 12 }, 100, 20)).toBe(false);
    expect(insideAttackLine(origin, east, { x: -1, y: 0 }, 100, 20)).toBe(false);
    expect(insideAttackArc(origin, east, { x: 40, y: 35 }, 80, Math.PI / 2)).toBe(true);
    expect(insideAttackArc(origin, east, { x: -40, y: 0 }, 80, Math.PI)).toBe(false);
  });
});
