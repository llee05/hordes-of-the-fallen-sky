import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ORKHON_PAINTED_GROUND,
  orkhonPaintedGroundEnabled,
  orkhonPaintedGroundWorldBounds,
} from '../../src/game/world3d/orkhonPaintedGround';

describe('Orkhon painted-ground prototype', () => {
  it('is enabled only by the explicit development query flag', () => {
    expect(orkhonPaintedGroundEnabled('', true)).toBe(false);
    expect(orkhonPaintedGroundEnabled('?orkhonPaintedGround=0', true)).toBe(false);
    expect(orkhonPaintedGroundEnabled('?orkhonPaintedGround=1', true)).toBe(true);
    expect(orkhonPaintedGroundEnabled('?unrelated=1&orkhonPaintedGround=1', true)).toBe(true);
    expect(orkhonPaintedGroundEnabled('?orkhonPaintedGround=1', false)).toBe(false);
  });

  it('maps the approved camp-relative square into world space', () => {
    expect(ORKHON_PAINTED_GROUND.bounds).toEqual({ minX: -550, minY: -1600, size: 1600 });
    expect(orkhonPaintedGroundWorldBounds(5200)).toEqual([2050, 1000, 1600, 1600]);
    expect(ORKHON_PAINTED_GROUND.pixels / ORKHON_PAINTED_GROUND.bounds.size).toBeCloseTo(
      1 / 0.78125,
      9,
    );
  });

  it('ships the approved opaque power-of-two runtime texture', () => {
    const png = readFileSync(resolve(`public/art/orkhon-valley/${ORKHON_PAINTED_GROUND.file}`));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([
      ORKHON_PAINTED_GROUND.pixels,
      ORKHON_PAINTED_GROUND.pixels,
    ]);
    // PNG colour type 2 is opaque RGB; no alpha is uploaded or blended at the painted edges.
    expect(png.readUInt8(25)).toBe(2);
  });
});
