import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BELUKHA, BELUKHA_SITES } from '../../src/game/data/belukha';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import {
  BELUKHA_GENERATED_REGION,
  WORLD_REGIONS,
  composedRegion,
} from '../../src/game/data/worldRegions';
import type { TerrainPoint } from '../../src/game/terrain/types';
import { ComposedTerrain, outlineField } from '../../src/game/world3d/ComposedTerrain';
import { belukhaDressing, belukhaDressingClear } from '../../src/game/world3d/belukhaDressing';
import {
  BELUKHA_PAINTED_GROUND,
  belukhaPaintedGroundEnabled,
  belukhaPaintedGroundGpuBytes,
  belukhaPaintedGroundWorldBounds,
} from '../../src/game/world3d/belukhaPaintedGround';
import { PAINTED_GROUND_QUADRANTS } from '../../src/game/world3d/paintedGround';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';
import { groundView, WORLD_3D } from '../../src/game/world3d/worldProjection';

const terrain = new ComposedTerrain(composedRegion('belukha'), LANDSCAPES.belukha.water);
const world = (point: TerrainPoint): TerrainPoint => ({
  x: BELUKHA.world.terrainSize / 2 + point.x,
  y: BELUKHA.world.terrainSize / 2 + point.y,
});
const samePoint = (a: TerrainPoint, b: TerrainPoint) => a.x === b.x && a.y === b.y;

describe('Mount Belukha authored layout', () => {
  it('uses the approved 16:10 battlefield and southwest spawn clearing', () => {
    expect(BELUKHA.world).toMatchObject({
      width: 6400,
      height: 4000,
      terrainSize: 9216,
      minX: -3200,
      minY: -2000,
      camp: { x: -2100, y: 1050 },
      campClearRadius: 540,
    });
    expect(BELUKHA.world.camp.x).not.toBe(0);
    expect(BELUKHA.world.camp.y).not.toBe(0);
    expect(
      Math.hypot(
        BELUKHA.world.camp.x - BELUKHA.water.sourcePool.x,
        BELUKHA.world.camp.y - BELUKHA.water.sourcePool.y,
      ),
    ).toBeGreaterThan(BELUKHA.world.campClearRadius + BELUKHA.water.sourcePool.radius);
  });

  it('frames the north with an unreachable headwall and grades three broad terrace ramps', () => {
    expect(BELUKHA.rise).toBe(240);
    expect(BELUKHA.plateaus).toHaveLength(3);
    expect(BELUKHA.plateaus[0]).toMatchObject({ id: 'twin-summit-headwall', ramps: [] });
    const ramps = BELUKHA.plateaus.flatMap((plateau) =>
      plateau.ramps.map((ramp) => ({ plateau, ramp })),
    );
    expect(ramps).toHaveLength(3);
    for (const { plateau, ramp } of ramps) {
      expect(outlineField(plateau.outline, ramp.foot.x, ramp.foot.y)).toBeLessThan(0);
      expect(outlineField(plateau.outline, ramp.top.x, ramp.top.y)).toBeGreaterThan(0);
      expect(ramp.halfWidth).toBeGreaterThanOrEqual(120);
      expect(ramp.shoulder).toBeGreaterThan(ramp.halfWidth + 80);
    }
  });

  it('connects every track endpoint to a named place or another track', () => {
    const named = Object.values(BELUKHA_SITES);
    for (const path of BELUKHA.paths)
      for (const endpoint of [path[0]!, path.at(-1)!])
        expect(
          named.some((site) => samePoint(site, endpoint)) ||
            BELUKHA.paths.some((other) =>
              other.slice(1, -1).some((point) => samePoint(point, endpoint)),
            ),
          `${endpoint.x},${endpoint.y}`,
        ).toBe(true);
  });

  it('authors Akkem-inspired water and a single traversable outflow bridge', () => {
    expect(BELUKHA.water).toMatchObject({ kind: 'glacial', width: 108 });
    expect(BELUKHA.water.sourcePool.radius).toBeGreaterThanOrEqual(380);
    expect(BELUKHA.water.gorge.bridges).toHaveLength(1);
    expect(
      Math.hypot(
        BELUKHA.water.course[0]! - BELUKHA.water.sourcePool.x,
        BELUKHA.water.course[1]! - BELUKHA.water.sourcePool.y,
      ),
    ).toBeLessThan(BELUKHA.water.sourcePool.radius);
  });
});

describe('Mount Belukha runtime terrain', () => {
  it('registers authored bounds, camp, tiers, paths and water', () => {
    expect(terrain.worldSize).toBe(9216);
    expect(terrain.playBounds).toEqual({ x: 1408, y: 2608, width: 6400, height: 4000 });
    expect(terrain.campPosition).toEqual(world(BELUKHA_SITES.camp));
    expect(WORLD_REGIONS.belukha.shelves).toHaveLength(3);
    expect(WORLD_REGIONS.belukha.ground?.paths).toEqual(BELUKHA.paths);
    expect(terrain.river).toBeDefined();
    const lake = world(BELUKHA.water.sourcePool);
    expect(terrain.river!.sample(lake.x, lake.y).shoreDistance).toBeLessThan(0);
  });

  it('keeps the camp flat and raises the authored terraces', () => {
    const floor = terrain.region.scene.floor;
    const height = (point: TerrainPoint) => terrain.height(world(point).x, world(point).y) * 1000;
    expect(height(BELUKHA.world.camp)).toBeCloseTo(floor, 0);
    expect(height(BELUKHA_SITES.westernMoraine)).toBeGreaterThan(floor + BELUKHA.rise - 5);
    expect(height(BELUKHA_SITES.larchOverlook)).toBeGreaterThan(floor + BELUKHA.rise - 5);
  });

  it('retains the old generated landscape only as an explicit development fallback', () => {
    const generated = composedRegion('belukha', true).scene;
    expect(generated.id).toBe(BELUKHA_GENERATED_REGION.id);
    expect(generated.shelves.slice(1)).toEqual(BELUKHA_GENERATED_REGION.shelves);
    expect(generated.shelves[0]?.camp).toBe(true);
    expect(composedRegion('belukha').scene.ground).toBeDefined();
    expect(BELUKHA_GENERATED_REGION.ground).toBeUndefined();
  });

  it('keeps the yawed low-zoom view over terrain at every play-bound corner', () => {
    const bounds = terrain.playBounds;
    const viewport = { width: 1920, height: 1080 };
    const sourceZoom = 0.6;
    const renderZoom = sourceZoom * WORLD_3D.worldScale;
    const halfWidth = viewport.width / sourceZoom / 2;
    const halfHeight = viewport.height / sourceZoom / 2;
    const yaw = (WORLD_3D.yaw * Math.PI) / 180;
    for (const source of [
      { x: bounds.x + halfWidth, y: bounds.y + halfHeight },
      { x: bounds.x + bounds.width - halfWidth, y: bounds.y + halfHeight },
      { x: bounds.x + halfWidth, y: bounds.y + bounds.height - halfHeight },
      { x: bounds.x + bounds.width - halfWidth, y: bounds.y + bounds.height - halfHeight },
    ]) {
      const view = groundView(
        source.x - Math.sin(yaw) * WORLD_3D.lookAhead,
        source.y - Math.cos(yaw) * WORLD_3D.lookAhead,
        viewport.width,
        viewport.height,
        renderZoom,
        terrain.reliefHeight,
        WORLD_3D.angle,
        WORLD_3D.yaw,
      );
      expect(view.x).toBeGreaterThanOrEqual(0);
      expect(view.y).toBeGreaterThanOrEqual(0);
      expect(view.x + view.width).toBeLessThanOrEqual(terrain.worldSize);
      expect(view.y + view.height).toBeLessThanOrEqual(terrain.worldSize);
    }
  });
});

describe('Mount Belukha painted ground and dressing', () => {
  it('projects four 1600 x 1000 paintings over the 6400 x 4000 play rectangle', () => {
    expect(belukhaPaintedGroundWorldBounds(9216)).toEqual([1408, 2608, 6400, 4000]);
    expect(belukhaPaintedGroundGpuBytes()).toBe(39_724_100);
    expect(belukhaPaintedGroundEnabled('', false)).toBe(true);
    expect(belukhaPaintedGroundEnabled('?belukhaPaintedGround=0', true)).toBe(false);
    for (const quadrant of PAINTED_GROUND_QUADRANTS) {
      const path = resolve(
        'public/art',
        BELUKHA_PAINTED_GROUND.directory,
        BELUKHA_PAINTED_GROUND.quadrants[quadrant].file,
      );
      const png = readFileSync(path);
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(1600);
      expect(png.readUInt32BE(20)).toBe(1000);
    }
  });

  it('builds deterministic scenery while keeping camp, routes and water clear', () => {
    const bounds = { x: 0, y: 0, width: 6400, height: 6400 };
    const first = belukhaDressing('belukha-test', bounds);
    const second = belukhaDressing('belukha-test', bounds);
    expect(first).toEqual(second);
    expect(first.some((prop) => prop.frame === 'twin-summit')).toBe(true);
    expect(
      first.filter((prop) => prop.kind === 'pine' || prop.kind === 'larch').length,
    ).toBeGreaterThan(50);
    expect(sceneDressing(terrain, bounds)).toEqual(belukhaDressing(terrain.seed, bounds));
    expect(belukhaDressingClear(BELUKHA.world.camp)).toBe(false);
    expect(belukhaDressingClear(BELUKHA_SITES.lakeShore)).toBe(false);
    for (const prop of first.filter((item) => item.kind !== 'landmark'))
      expect(
        belukhaDressingClear(
          { x: prop.x - BELUKHA.world.terrainSize / 2, y: prop.z - BELUKHA.world.terrainSize / 2 },
          prop.kind === 'pine' || prop.kind === 'larch' ? 94 : 72,
        ),
      ).toBe(true);
  });
});
