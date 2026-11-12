import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALTAN_OVOO, ALTAN_OVOO_FOOTPRINTS, ALTAN_OVOO_SITES } from '../../src/game/data/altanOvoo';
import { ORKHON_SPRITES } from '../../src/game/assets/orkhonValleyArt';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import {
  ALTAN_OVOO_GENERATED_REGION,
  WORLD_REGIONS,
  composedRegion,
} from '../../src/game/data/worldRegions';
import { ComposedTerrain, outlineField } from '../../src/game/world3d/ComposedTerrain';
import {
  altanOvooDressing,
  altanOvooDressingClear,
  altanOvooLandmarkAt,
} from '../../src/game/world3d/altanOvooDressing';
import type { TerrainPoint } from '../../src/game/terrain/types';
import {
  ALTAN_OVOO_PAINTED_GROUND,
  ALTAN_OVOO_GRASS_FALLBACK,
  altanOvooPaintedGroundEnabled,
  altanOvooPaintedGroundGpuBytes,
  altanOvooPaintedGroundWorldBounds,
} from '../../src/game/world3d/altanOvooPaintedGround';
import { PAINTED_GROUND_QUADRANTS } from '../../src/game/world3d/paintedGround';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';

const cone = ALTAN_OVOO.plateaus[0]!;
const samePoint = (a: TerrainPoint, b: TerrainPoint) => a.x === b.x && a.y === b.y;
const distanceToSegment = (point: TerrainPoint, a: TerrainPoint, b: TerrainPoint): number => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
};
const terrain = new ComposedTerrain(composedRegion('altan-ovoo'), LANDSCAPES['altan-ovoo'].water);
const world = (point: TerrainPoint): TerrainPoint => ({
  x: ALTAN_OVOO.world.terrainSize / 2 + point.x,
  y: ALTAN_OVOO.world.terrainSize / 2 + point.y,
});

describe('Altan Ovoo authored layout', () => {
  it('uses the approved wide battlefield and keeps the camp inside southwest', () => {
    expect(ALTAN_OVOO.world).toMatchObject({
      width: 6400,
      height: 4000,
      terrainSize: 6400,
      minX: -3200,
      minY: -2000,
      camp: { x: -2050, y: 1050 },
    });
    expect(ALTAN_OVOO.world.camp.x).toBeLessThan(0);
    expect(ALTAN_OVOO.world.camp.y).toBeGreaterThan(0);
    expect(Math.abs(ALTAN_OVOO.world.camp.x)).toBeGreaterThan(ALTAN_OVOO.pathWidth * 2);
    expect(Math.abs(ALTAN_OVOO.world.camp.y)).toBeGreaterThan(ALTAN_OVOO.pathWidth * 2);
  });

  it('has exactly two terrain tiers and two broad walkable ramp cuts', () => {
    expect(ALTAN_OVOO.rise).toBe(240);
    expect(ALTAN_OVOO.plateaus).toHaveLength(1);
    expect(cone.id).toBe('cinder-cone');
    expect(cone.outline.length).toBeGreaterThanOrEqual(12);
    expect(cone.ramps).toHaveLength(2);
    for (const ramp of cone.ramps) {
      expect(outlineField(cone.outline, ramp.foot.x, ramp.foot.y)).toBeLessThan(-40);
      expect(outlineField(cone.outline, ramp.top.x, ramp.top.y)).toBeGreaterThan(40);
      expect(ramp.halfWidth).toBeGreaterThanOrEqual(112);
      expect(ramp.shoulder).toBeGreaterThan(ramp.halfWidth + 80);
      expect(Math.hypot(ramp.top.x - ramp.foot.x, ramp.top.y - ramp.foot.y)).toBeGreaterThan(400);
    }
  });

  it('keeps the live camp spawn clearing on lower steppe and free of landmarks', () => {
    const camp = ALTAN_OVOO.world.camp;
    expect(outlineField(cone.outline, camp.x, camp.y)).toBeLessThan(
      -ALTAN_OVOO.world.campClearRadius,
    );
    for (const landmark of ALTAN_OVOO_FOOTPRINTS)
      expect(Math.hypot(landmark.x - camp.x, landmark.y - camp.y), landmark.id).toBeGreaterThan(
        ALTAN_OVOO.world.campClearRadius + landmark.footprint,
      );
    expect(
      Math.hypot(ALTAN_OVOO.spring.centre.x - camp.x, ALTAN_OVOO.spring.centre.y - camp.y),
    ).toBeGreaterThan(ALTAN_OVOO.world.campClearRadius + ALTAN_OVOO.spring.radius);
  });

  it('connects every trail endpoint to a named place or another trail', () => {
    const named = Object.values(ALTAN_OVOO_SITES);
    const endpoints = ALTAN_OVOO.paths.flatMap((path) => [path[0]!, path.at(-1)!]);
    for (const endpoint of endpoints)
      expect(
        named.some((site) => samePoint(site, endpoint)) ||
          ALTAN_OVOO.paths.some((path) =>
            path.slice(1, -1).some((point) => samePoint(point, endpoint)),
          ),
        `${endpoint.x},${endpoint.y}`,
      ).toBe(true);

    const routeEnds = ALTAN_OVOO.paths.map((path) => [path[0], path.at(-1)]);
    expect(routeEnds).toContainEqual([ALTAN_OVOO_SITES.camp, ALTAN_OVOO_SITES.summit]);
    expect(routeEnds).toContainEqual([ALTAN_OVOO_SITES.summit, ALTAN_OVOO_SITES.spring]);
    expect(routeEnds).toContainEqual([ALTAN_OVOO_SITES.camp, ALTAN_OVOO_SITES.spring]);
    expect(routeEnds).toContainEqual([ALTAN_OVOO_SITES.camp, ALTAN_OVOO_SITES.horseMeadow]);
    expect(routeEnds).toContainEqual([ALTAN_OVOO_SITES.spring, ALTAN_OVOO_SITES.balbal]);
  });

  it('keeps trails inside the playable rectangle and clear of unrelated solid landmarks', () => {
    const minX = ALTAN_OVOO.world.minX,
      minY = ALTAN_OVOO.world.minY,
      maxX = minX + ALTAN_OVOO.world.width,
      maxY = minY + ALTAN_OVOO.world.height;
    for (const path of ALTAN_OVOO.paths)
      for (const point of path) {
        expect(point.x).toBeGreaterThanOrEqual(minX);
        expect(point.x).toBeLessThanOrEqual(maxX);
        expect(point.y).toBeGreaterThanOrEqual(minY);
        expect(point.y).toBeLessThanOrEqual(maxY);
      }

    for (const landmark of ALTAN_OVOO_FOOTPRINTS) {
      if (landmark.role !== 'scenery') continue;
      const nearest = Math.min(
        ...ALTAN_OVOO.paths.flatMap((path) =>
          path.slice(1).map((point, index) => distanceToSegment(landmark, path[index]!, point)),
        ),
      );
      expect(nearest, landmark.id).toBeGreaterThan(landmark.footprint);
    }
  });

  it('authors the spring and stream without lava or a new wildlife system', () => {
    const { stream } = ALTAN_OVOO.spring;
    expect(stream.kind).toBe('stream');
    expect(
      Math.hypot(stream.course[0]! - stream.sourcePool.x, stream.course[1]! - stream.sourcePool.y),
    ).toBeLessThan(stream.sourcePool.radius);
    expect(stream.course.at(-2)).toBeGreaterThan(stream.sourcePool.x);
    expect(stream.course.at(-1)).toBeGreaterThan(stream.sourcePool.y);
    expect(JSON.stringify(ALTAN_OVOO)).not.toMatch(/lava|swan|wolf|horse_sprite/i);
  });

  it('maps sites only to bundled existing scenery', () => {
    for (const landmark of ALTAN_OVOO.landmarks)
      expect(ORKHON_SPRITES, landmark.id).toHaveProperty(landmark.sprite);
    expect(ALTAN_OVOO.landmarks.some((landmark) => landmark.sprite === 'sacred_ovoo')).toBe(true);
    expect(ALTAN_OVOO.landmarks.filter((landmark) => landmark.role === 'balbal-site')).toHaveLength(
      3,
    );
    expect(
      ALTAN_OVOO.landmarks
        .filter((landmark) => landmark.role === 'balbal-site')
        .every((landmark) => landmark.sprite === 'standing_stone'),
    ).toBe(true);
  });
});

describe('Altan Ovoo runtime terrain', () => {
  it('registers the approved world, camp, cone, paths, obstacles and spring', () => {
    expect(terrain.worldSize).toBe(6400);
    expect(terrain.playBounds).toEqual({ x: 0, y: 1200, width: 6400, height: 4000 });
    expect(terrain.campPosition).toEqual(world(ALTAN_OVOO_SITES.camp));
    expect(WORLD_REGIONS['altan-ovoo'].shelves).toHaveLength(1);
    expect(WORLD_REGIONS['altan-ovoo'].ground?.paths).toEqual(ALTAN_OVOO.paths);
    expect(WORLD_REGIONS['altan-ovoo'].obstacles).toHaveLength(ALTAN_OVOO_FOOTPRINTS.length);
    expect(terrain.river).toBeDefined();
    const spring = world(ALTAN_OVOO_SITES.spring);
    expect(terrain.river!.sample(spring.x, spring.y).shoreDistance).toBeLessThan(0);
    expect(terrain.river!.sample(spring.x, spring.y).halfWidth).toBeGreaterThan(
      ALTAN_OVOO.spring.radius * 0.9,
    );
  });

  it('keeps the camp flat, raises only one cone tier and grades both ramp cuts', () => {
    const floor = terrain.region.scene.floor;
    const elevation = (point: TerrainPoint) =>
      terrain.height(world(point).x, world(point).y) * 1000 - floor;
    expect(Math.abs(elevation(ALTAN_OVOO_SITES.camp))).toBeLessThan(0.001);
    expect(elevation(ALTAN_OVOO_SITES.summit)).toBeGreaterThan(ALTAN_OVOO.rise - 20);
    expect(elevation(ALTAN_OVOO_SITES.summit)).toBeLessThan(ALTAN_OVOO.rise + 12);
    for (const ramp of cone.ramps) {
      expect(elevation(ramp.foot)).toBeLessThan(20);
      expect(elevation(ramp.top)).toBeGreaterThan(ALTAN_OVOO.rise * 0.7);
      expect(
        elevation({
          x: (ramp.foot.x + ramp.top.x) / 2,
          y: (ramp.foot.y + ramp.top.y) / 2,
        }),
      ).toBeGreaterThan(ALTAN_OVOO.rise * 0.2);
    }
    expect(terrain.protection(terrain.campPosition.x, terrain.campPosition.y)).toBe(1);
    expect(
      terrain.protection(
        terrain.campPosition.x,
        terrain.campPosition.y + ALTAN_OVOO.world.campClearRadius,
      ),
    ).toBe(0);
  });

  it('routes the authored dressing through the shared scene entry point', () => {
    const bounds = { x: 0, y: 1200, width: 6400, height: 4000 };
    expect(sceneDressing(terrain, bounds)).toEqual(altanOvooDressing(terrain.seed, bounds));
  });

  it('retains the former generated composition as a development fallback', () => {
    const fallback = composedRegion('altan-ovoo', true);
    expect(fallback.scene.ground).toBeUndefined();
    expect(fallback.scene.terrainSize).toBeUndefined();
    expect(fallback.scene.shelves[0]?.id).toBe('camp-shelf');
    expect(fallback.scene.shelves.slice(1).map(({ id }) => id)).toEqual(
      ALTAN_OVOO_GENERATED_REGION.shelves.map(({ id }) => id),
    );
  });
});

describe('Altan Ovoo painted ground', () => {
  it('ships enabled with the same development-only fallback contract as Orkhon', () => {
    expect(altanOvooPaintedGroundEnabled('', true)).toBe(true);
    expect(altanOvooPaintedGroundEnabled('?altanOvooPaintedGround=0', true)).toBe(false);
    expect(altanOvooPaintedGroundEnabled('?altanOvooPaintedGround=1', true)).toBe(true);
    expect(altanOvooPaintedGroundEnabled('?altanOvooPaintedGround=0', false)).toBe(true);
  });

  it('maps four opaque paintings and the grayscale detail layer over the playable rectangle', () => {
    expect(altanOvooPaintedGroundWorldBounds(6400)).toEqual([0, 1200, 6400, 4000]);
    expect(ALTAN_OVOO_PAINTED_GROUND.outerFeather).toBe(700);
    for (const quadrant of PAINTED_GROUND_QUADRANTS) {
      const painting = ALTAN_OVOO_PAINTED_GROUND.quadrants[quadrant];
      const png = readFileSync(resolve(`public/art/altan-ovoo/${painting.file}`));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect([png.readUInt32BE(16), png.readUInt32BE(20), png.readUInt8(25)]).toEqual([
        1600, 1000, 2,
      ]);
    }
    const detail = readFileSync(
      resolve(`public/art/altan-ovoo/${ALTAN_OVOO_PAINTED_GROUND.detail.file}`),
    );
    expect([detail.readUInt32BE(16), detail.readUInt32BE(20), detail.readUInt8(25)]).toEqual([
      1024, 1024, 0,
    ]);
    const fallback = readFileSync(
      resolve(`public/art/altan-ovoo/${ALTAN_OVOO_GRASS_FALLBACK.file}`),
    );
    expect([fallback.readUInt32BE(16), fallback.readUInt32BE(20)]).toEqual([256, 256]);
    expect(altanOvooPaintedGroundGpuBytes()).toBe(39_724_100);
  });
});

describe('Altan Ovoo authored dressing', () => {
  const terrainSize = ALTAN_OVOO.world.terrainSize;
  const centre = terrainSize / 2;
  const all = altanOvooDressing('altan-ovoo-test', {
    x: 0,
    y: 0,
    width: terrainSize,
    height: terrainSize,
  });

  it('is dense, deterministic and stable across terrain chunks', () => {
    const parts = [0, centre].flatMap((x) =>
      [0, centre].flatMap((y) =>
        altanOvooDressing('altan-ovoo-test', {
          x,
          y,
          width: centre,
          height: centre,
        }),
      ),
    );
    const sorted = (items: typeof all) => items.map((item) => JSON.stringify(item)).sort();
    expect(sorted(parts)).toEqual(sorted(all));
    expect(all.length).toBeGreaterThan(900);
    expect(
      all.filter((prop) => prop.kind === 'boulders' || prop.kind === 'crag').length,
    ).toBeGreaterThan(500);
    expect(
      all.filter((prop) => prop.kind === 'larch' || prop.kind === 'scrub').length,
    ).toBeGreaterThan(300);
    expect(all.filter((prop) => prop.kind === 'reeds')).toHaveLength(13);
  });

  it('uses existing manuscript scenery on both elevation tiers', () => {
    const scenery = all.filter((prop) => prop.kind !== 'landmark');
    const tier = (prop: (typeof all)[number]) =>
      outlineField(cone.outline, prop.x - centre, prop.z - centre);
    expect(scenery.filter((prop) => tier(prop) > 80).length).toBeGreaterThan(80);
    expect(scenery.filter((prop) => tier(prop) < -80).length).toBeGreaterThan(50);
    for (const prop of all) {
      expect(ORKHON_SPRITES).toHaveProperty(prop.frame);
      expect(prop.tint).toBe(0xffffff);
    }
    expect(JSON.stringify(all)).not.toMatch(/wolf|horse|swan/i);
  });

  it('keeps camp, trails, ramps, water edges and combat lanes clear', () => {
    for (const prop of all.filter((item) => item.kind !== 'landmark' && !item.site))
      expect(
        altanOvooDressingClear({ x: prop.x - centre, y: prop.z - centre }, 80),
        `${prop.frame}@${prop.x - centre},${prop.z - centre}`,
      ).toBe(true);
    const pool = ALTAN_OVOO.spring.stream.sourcePool;
    for (const reed of all.filter((item) => item.kind === 'reeds')) {
      const distance = Math.hypot(reed.x - centre - pool.x, reed.z - centre - pool.y);
      expect(distance).toBeGreaterThan(35);
      expect(distance).toBeLessThan(155);
    }
  });

  it('places every authored landmark once and preserves its semantic entry', () => {
    const landmarks = all.filter((prop) => prop.kind === 'landmark');
    expect(landmarks).toHaveLength(ALTAN_OVOO.landmarks.length);
    for (const landmark of ALTAN_OVOO.landmarks) {
      const prop = landmarks.find(
        (item) =>
          item.x === centre + landmark.x &&
          item.z === centre + landmark.y &&
          item.frame === landmark.sprite,
      );
      expect(prop, landmark.id).toBeDefined();
      expect(altanOvooLandmarkAt(prop!)?.id).toBe(landmark.id);
    }
  });
});
