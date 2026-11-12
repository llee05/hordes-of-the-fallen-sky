import { describe, expect, it } from 'vitest';
import {
  aimedDirection,
  combatNumberAction,
  digitalMovement,
  insideAttackArc,
  insideAttackLine,
} from '../../src/game/state/khanControls';

describe('manual Khan controls', () => {
  it('normalizes WASD and arrow-key movement without diagonal speed gain', () => {
    const northeast = digitalMovement({ up: true, down: false, left: false, right: true });
    expect(northeast.x).toBeCloseTo(Math.SQRT1_2);
    expect(northeast.y).toBeCloseTo(-Math.SQRT1_2);
    const southwest = digitalMovement({ up: false, down: true, left: true, right: false });
    expect(southwest.x).toBeCloseTo(-Math.SQRT1_2);
    expect(southwest.y).toBeCloseTo(Math.SQRT1_2);
    expect(digitalMovement({ up: true, down: true, left: false, right: false })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('keeps the previous aim when the cursor is exactly on the rider', () => {
    expect(aimedDirection({ x: 4, y: 5 }, { x: 4, y: 5 }, { x: 0, y: -1 })).toEqual({
      x: 0,
      y: -1,
    });
  });

  it('uses number keys for exactly one ability or succession action', () => {
    expect([1, 2, 3, 4].map((key) => combatNumberAction(key as 1 | 2 | 3 | 4, true))).toEqual([
      { kind: 'ability', slot: 'q' },
      { kind: 'ability', slot: 'w' },
      { kind: 'ability', slot: 'e' },
      { kind: 'ability', slot: 'r' },
    ]);
    expect([1, 2, 3, 4].map((key) => combatNumberAction(key as 1 | 2 | 3 | 4, false))).toEqual([
      { kind: 'successor', trait: 'outrider' },
      { kind: 'successor', trait: 'hearthguard' },
      undefined,
      undefined,
    ]);
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
