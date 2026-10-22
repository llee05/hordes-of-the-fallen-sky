import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import {
  cameraZoomLimits,
  clampCameraZoom,
  enemySpawnPosition,
} from '../../src/game/systems/CameraView';

describe('battlefield view', () => {
  it('bounds camera zoom, avoids floating-point drift, and fits very large viewports', () => {
    expect(clampCameraZoom(0.1, 1440, 1000)).toBe(0.6);
    expect(clampCameraZoom(9, 1440, 1000)).toBe(1.6);
    expect(clampCameraZoom(1.2000000000000002, 1440, 1000)).toBe(1.2);
    expect(clampCameraZoom(NaN, 1440, 1000)).toBe(1);
    const limits = cameraZoomLimits(7000, 1000);
    expect(limits.min * GAME.worldSize).toBeGreaterThanOrEqual(7000);
    expect(clampCameraZoom(0.6, 7000, 1000)).toBe(limits.min);
  });

  it('keeps spawns beyond zoomed views from central, offset, and remote camp anchors', () => {
    for (const zoom of [0.6, 1, 1.6]) {
      const view = { x: 1500, y: 1500, width: 1440 / zoom, height: 1000 / zoom };
      for (const anchor of [
        { x: 2600, y: 2600 },
        { x: 1600, y: 1700 },
        { x: 500, y: 500 },
      ]) {
        for (let i = 0; i < 16; i++) {
          const point = enemySpawnPosition(view, anchor, (i * Math.PI) / 8);
          expect(
            point.x < view.x ||
              point.x > view.x + view.width ||
              point.y < view.y ||
              point.y > view.y + view.height,
          ).toBe(true);
          expect(point.x).toBeGreaterThanOrEqual(24);
          expect(point.y).toBeGreaterThanOrEqual(24);
          expect(point.x).toBeLessThanOrEqual(GAME.worldSize - 24);
          expect(point.y).toBeLessThanOrEqual(GAME.worldSize - 24);
        }
      }
    }
  });

  it('tries other directions at map corners and still spawns when the whole world is visible', () => {
    const view = { x: 0, y: 0, width: 2400, height: 1700 };
    for (let i = 0; i < 16; i++) {
      const point = enemySpawnPosition(view, { x: 100, y: 100 }, (i * Math.PI) / 8);
      expect(point.x > view.width || point.y > view.height).toBe(true);
    }
    const entireWorld = enemySpawnPosition(
      { x: 0, y: 0, width: 5200, height: 5200 },
      { x: 2600, y: 2600 },
      0,
    );
    expect(Number.isFinite(entireWorld.x + entireWorld.y)).toBe(true);
    expect(Math.hypot(entireWorld.x - 2600, entireWorld.y - 2600)).toBeGreaterThan(2500);
  });
});
