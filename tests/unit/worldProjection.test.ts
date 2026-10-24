import { describe, expect, it } from 'vitest';
import {
  groundView,
  projectGround,
  screenMovement,
  WORLD_3D,
} from '../../src/game/world3d/worldProjection';
import * as THREE from 'three';
import { visibleWorldChunks, worldChunkBounds } from '../../src/game/world3d/worldChunks';

describe('orthographic world coordinates', () => {
  it('keeps the partial final chunk continuous with the inaccessible backdrop', () => {
    const last = worldChunkBounds(10, 10, 5200, 512);
    const next = worldChunkBounds(11, 10, 5200, 512);
    expect(last.x + last.width).toBe(next.x);
    expect(last.width).toBe(80);
    const chunks = visibleWorldChunks({ x: 4900, y: 4900, width: 1000, height: 800 }, 5200, 512);
    expect(chunks.some((c) => c.column === 11)).toBe(true);
    expect(chunks.some((c) => c.column === 0)).toBe(false);
  });
  it('raises height on screen without changing horizontal world distances', () => {
    const ground = projectGround(200, 400, 0);
    const raised = projectGround(200, 400, 300);
    expect(raised.x).toBe(ground.x);
    expect(ground.y - raised.y).toBeCloseTo(300 * Math.cos((WORLD_3D.angle * Math.PI) / 180));
    expect(projectGround(300, 400, 300).x - raised.x).toBeCloseTo(
      100 * Math.cos((WORLD_3D.yaw * Math.PI) / 180),
    );
  });
  it('includes elevated terrain behind the ground frustum at every supported angle', () => {
    for (const angle of [55, 65, 80]) {
      const view = groundView(2600, 2600, 1280, 800, 0.6, 1150, angle, 0);
      expect(view.width).toBeCloseTo(1280 / 0.6);
      expect(view.height).toBeGreaterThan(800 / 0.6);
      expect(view.y).toBeLessThan(2600 - 800 / 0.6 / 2);
    }
  });
  it('matches the real diagonal camera and keeps riding aligned with the screen', () => {
    const angle = (WORLD_3D.angle * Math.PI) / 180;
    const yaw = (WORLD_3D.yaw * Math.PI) / 180;
    const camera = new THREE.OrthographicCamera(-640, 640, 400, -400, 1, 14000);
    camera.position.set(
      Math.sin(yaw) * Math.cos(angle) * 6000,
      Math.sin(angle) * 6000,
      Math.cos(yaw) * Math.cos(angle) * 6000,
    );
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const point = new THREE.Vector3(230, 180, 310).project(camera);
    const expected = projectGround(230, 310, 180);
    expect(point.x * 640).toBeCloseTo(expected.x, 6);
    expect(-point.y * 400).toBeCloseTo(expected.y, 6);
    for (const [x, y] of [
      [1, 0],
      [0, -1],
      [-1, 0],
      [0, 1],
    ]) {
      const movement = screenMovement(x!, y!);
      expect(Math.hypot(movement.x, movement.y)).toBeCloseTo(1);
      const projected = projectGround(movement.x, movement.y, 0);
      if (x === 0) expect(projected.x).toBeCloseTo(0, 6);
      else expect(Math.sign(projected.x)).toBe(x);
      if (y === 0) expect(projected.y).toBeCloseTo(0, 6);
      else expect(Math.sign(projected.y)).toBe(y);
    }
  });
});
