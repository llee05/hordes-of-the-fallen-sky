import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GAME } from '../../src/game/config';
import { encounterSpawnDelay, spawnInterval } from '../../src/game/data/enemies';
import {
  projectedEnemySpawnPosition,
  withinProjectedView,
  type ProjectedGroundView,
} from '../../src/game/systems/EnemySpawning';

const focus = { x: 2515, y: 2553, elevation: 215 };
const camp = { x: 2600, y: 2600 };
const player = { x: 2600, y: 2700 };
const flat = { heightAt: () => 215, walkable: () => true };
const camera = (
  width = 1280,
  height = 800,
  zoom = 1,
  angle = 48,
  yaw = 30,
): ProjectedGroundView => ({
  focus,
  width: width / (zoom * 0.8),
  height: height / (zoom * 0.8),
  angle,
  yaw,
});

describe('projected enemy arrivals', () => {
  it('prefers a native habitat without admitting visible or disconnected ground, and falls back safely when none exists', () => {
    const preferred = projectedEnemySpawnPosition(camera(), camp, player, 0, {
      ...flat,
      preference: (_x, y) => (y < 2300 ? 1 : 0),
    })!;
    expect(preferred.y).toBeLessThan(2300);
    expect(withinProjectedView(camera(), preferred, 215)).toBe(false);
    const fallback = projectedEnemySpawnPosition(camera(), camp, player, 0, {
      ...flat,
      preference: () => 0,
    })!;
    expect(fallback).toBeDefined();
    expect(withinProjectedView(camera(), fallback, 215)).toBe(false);
    expect(
      projectedEnemySpawnPosition(camera(), camp, player, 0, {
        ...flat,
        walkable: () => false,
        preference: () => 1,
      }),
    ).toBeUndefined();
  });
  it('places arrivals at the real rotated camera edge at desktop sizes and zoom levels', () => {
    for (const [width, height] of [
      [960, 600],
      [1280, 800],
      [1920, 1080],
    ])
      for (const zoom of [0.6, 1, 1.6])
        for (let i = 0; i < 24; i++) {
          const view = camera(width, height, zoom),
            p = projectedEnemySpawnPosition(view, camp, player, (i * Math.PI) / 12, flat)!;
          expect(p).toBeDefined();
          expect(withinProjectedView(view, p, 215, GAME.camera.spawnMargin)).toBe(false);
          expect(withinProjectedView(view, p, 215, GAME.spawning.viewRetentionMargin)).toBe(true);
          expect(Math.hypot(p.x - player.x, p.y - player.y)).toBeGreaterThanOrEqual(
            GAME.spawning.minimumPlayerDistance,
          );
          expect(p.x).toBeGreaterThanOrEqual(24);
          expect(p.y).toBeGreaterThanOrEqual(24);
          expect(p.x).toBeLessThanOrEqual(5176);
          expect(p.y).toBeLessThanOrEqual(5176);
        }
  });
  it('matches the actual orthographic camera with changing ground elevation and camera tilt', () => {
    for (const angle of [35, 48, 70])
      for (const yaw of [0, 30, 55]) {
        const view = camera(1920, 1080, 1, angle, yaw);
        const ground = {
          heightAt: (x: number, y: number) =>
            65 + 180 * Math.exp(-Math.hypot(x - 2600, y - 2600) / 900),
          walkable: () => true,
        };
        const turn = (yaw * Math.PI) / 180,
          tilt = (angle * Math.PI) / 180;
        const actual = new THREE.OrthographicCamera(
          -view.width / 2,
          view.width / 2,
          view.height / 2,
          -view.height / 2,
          1,
          14000,
        );
        actual.position.set(
          focus.x + Math.sin(turn) * Math.cos(tilt) * 6000,
          focus.elevation + Math.sin(tilt) * 6000,
          focus.y + Math.cos(turn) * Math.cos(tilt) * 6000,
        );
        actual.lookAt(focus.x, focus.elevation, focus.y);
        actual.updateMatrixWorld();
        for (let i = 0; i < 12; i++) {
          const p = projectedEnemySpawnPosition(view, camp, player, (i * Math.PI) / 6, ground)!;
          expect(p).toBeDefined();
          const screen = new THREE.Vector3(p.x, ground.heightAt(p.x, p.y), p.y).project(actual);
          expect(Math.abs(screen.x) > 1 || Math.abs(screen.y) > 1).toBe(true);
        }
      }
  });
  it('finds another connected approach instead of snapping a blocked arrival onto visible ground', () => {
    const ground = { heightAt: () => 215, walkable: (_x: number, y: number) => y > 3000 };
    const p = projectedEnemySpawnPosition(camera(), camp, player, -Math.PI / 2, ground)!;
    expect(p).toBeDefined();
    expect(p.y).toBeGreaterThan(3000);
    expect(withinProjectedView(camera(), p, 215)).toBe(false);
    let checks = 0;
    expect(
      projectedEnemySpawnPosition(camera(), camp, player, 0, {
        heightAt: () => 215,
        walkable: () => {
          checks++;
          return false;
        },
      }),
    ).toBeUndefined();
    expect(checks).toBeGreaterThan(0);
    expect(checks).toBeLessThanOrEqual(120);
  });
  it('keeps offscreen camp approaches local and uses a distant edge if the whole world is visible', () => {
    const view = { ...camera(), focus: { x: 3800, y: 3800, elevation: 215 } };
    const p = projectedEnemySpawnPosition(
      view,
      { x: 500, y: 500 },
      { x: 3800, y: 3800 },
      Math.PI,
      flat,
    )!;
    expect(p).toBeDefined();
    expect(Math.hypot(p.x - 500, p.y - 500)).toBeLessThan(1600);
    const huge = camera(30000, 30000);
    const edge = projectedEnemySpawnPosition(huge, camp, player, 0, flat)!;
    expect(edge).toBeDefined();
    expect(Math.hypot(edge.x - player.x, edge.y - player.y)).toBeGreaterThan(2500);
    const border = {
      heightAt: () => 215,
      walkable: (x: number, y: number) => x > 80 && y > 80 && x < 5100 && y < 5100,
    };
    const safeEdge = projectedEnemySpawnPosition(huge, camp, player, 0, border)!;
    expect(safeEdge).toBeDefined();
    expect(border.walkable(safeEdge.x, safeEdge.y)).toBe(true);
  });
  it('preserves introductory pacing and migration pressure, retrying rejected positions quickly without catch-up bursts', () => {
    expect(encounterSpawnDelay(0, 0)).toBe(2);
    expect(encounterSpawnDelay(17.99, 0)).toBe(2);
    expect(encounterSpawnDelay(18, 0)).toBe(spawnInterval(18));
    expect(encounterSpawnDelay(50, 1, 1.5)).toBe(spawnInterval(115) / 1.5);
    expect(encounterSpawnDelay(0, 0, 1, false)).toBe(0.2);
    expect(encounterSpawnDelay(180, 3, 1.5, false)).toBe(0.2);
  });
});
