import { describe, expect, it } from 'vitest';
import { groundView, projectGround } from '../../src/game/world3d/worldProjection';

describe('orthographic world coordinates', () => {
  it('raises height on screen without changing horizontal world distances', () => {
    const ground = projectGround(200, 400, 0);
    const raised = projectGround(200, 400, 300);
    expect(raised.x).toBe(ground.x);
    expect(ground.y - raised.y).toBeCloseTo(300 * Math.cos((65 * Math.PI) / 180));
    expect(projectGround(300, 400, 300).x - raised.x).toBe(100);
  });
  it('includes elevated terrain behind the ground frustum at every supported angle', () => {
    for (const angle of [55, 65, 80]) {
      const view = groundView(2600, 2600, 1280, 800, 0.6, 1150, angle);
      expect(view.width).toBeCloseTo(1280 / 0.6);
      expect(view.height).toBeGreaterThan(800 / 0.6);
      expect(view.y).toBeLessThan(2600 - 800 / 0.6 / 2);
    }
  });
});
