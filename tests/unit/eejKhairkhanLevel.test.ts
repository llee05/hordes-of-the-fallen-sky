import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EEJ_KHAIRKHAN,
  EEJ_KHAIRKHAN_FOOTPRINTS,
  EEJ_KHAIRKHAN_SITES,
} from '../../src/game/data/eejKhairkhan';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import {
  EEJ_KHAIRKHAN_GENERATED_REGION,
  WORLD_REGIONS,
  composedRegion,
} from '../../src/game/data/worldRegions';
import type { TerrainPoint } from '../../src/game/terrain/types';
import { ComposedTerrain, outlineField } from '../../src/game/world3d/ComposedTerrain';
import {
  eejKhairkhanDressing,
  eejKhairkhanDressingClear,
} from '../../src/game/world3d/eejKhairkhanDressing';
import {
  EEJ_KHAIRKHAN_GRANITE_FALLBACK,
  EEJ_KHAIRKHAN_PAINTED_GROUND,
  eejKhairkhanPaintedGroundEnabled,
  eejKhairkhanPaintedGroundGpuBytes,
  eejKhairkhanPaintedGroundWorldBounds,
} from '../../src/game/world3d/eejKhairkhanPaintedGround';
import { PAINTED_GROUND_QUADRANTS } from '../../src/game/world3d/paintedGround';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';

const terrace = EEJ_KHAIRKHAN.plateaus[0]!;
const samePoint = (a: TerrainPoint, b: TerrainPoint) => a.x === b.x && a.y === b.y;
const terrain = new ComposedTerrain(
  composedRegion('eej-khairkhan'),
  LANDSCAPES['eej-khairkhan'].water,
);
const world = (point: TerrainPoint): TerrainPoint => ({
  x: EEJ_KHAIRKHAN.world.terrainSize / 2 + point.x,
  y: EEJ_KHAIRKHAN.world.terrainSize / 2 + point.y,
});

describe('Eej Khairkhan authored layout', () => {
  it('uses the approved wide battlefield and keeps the camp inside southwest', () => {
    expect(EEJ_KHAIRKHAN.world).toMatchObject({
      width: 6400,
      height: 4000,
      terrainSize: 6400,
      minX: -3200,
      minY: -2000,
      camp: { x: -2150, y: 1050 },
      campClearRadius: 520,
    });
    expect(EEJ_KHAIRKHAN.world.camp.x).toBeLessThan(0);
    expect(EEJ_KHAIRKHAN.world.camp.y).toBeGreaterThan(0);
    expect(Math.abs(EEJ_KHAIRKHAN.world.camp.x)).toBeGreaterThan(EEJ_KHAIRKHAN.pathWidth * 2);
    expect(Math.abs(EEJ_KHAIRKHAN.world.camp.y)).toBeGreaterThan(EEJ_KHAIRKHAN.pathWidth * 2);
  });

  it('has exactly two playable tiers and two broad ramp cuts', () => {
    expect(EEJ_KHAIRKHAN.rise).toBe(240);
    expect(EEJ_KHAIRKHAN.plateaus).toHaveLength(1);
    expect(terrace.id).toBe('granite-terrace');
    expect(terrace.ramps).toHaveLength(2);
    for (const ramp of terrace.ramps) {
      expect(outlineField(terrace.outline, ramp.foot.x, ramp.foot.y)).toBeLessThan(-40);
      expect(outlineField(terrace.outline, ramp.top.x, ramp.top.y)).toBeGreaterThan(40);
      expect(ramp.halfWidth).toBeGreaterThanOrEqual(112);
      expect(ramp.shoulder).toBeGreaterThan(ramp.halfWidth + 80);
      expect(Math.hypot(ramp.top.x - ramp.foot.x, ramp.top.y - ramp.foot.y)).toBeGreaterThan(380);
    }
    expect(
      outlineField(terrace.outline, EEJ_KHAIRKHAN.world.camp.x, EEJ_KHAIRKHAN.world.camp.y),
    ).toBeLessThan(-EEJ_KHAIRKHAN.world.campClearRadius);
  });

  it('connects every trail endpoint to a named terrain place or another trail', () => {
    const named = Object.values(EEJ_KHAIRKHAN_SITES);
    const endpoints = EEJ_KHAIRKHAN.paths.flatMap((path) => [path[0]!, path.at(-1)!]);
    for (const endpoint of endpoints)
      expect(
        named.some((site) => samePoint(site, endpoint)) ||
          EEJ_KHAIRKHAN.paths.some((path) =>
            path.slice(1, -1).some((point) => samePoint(point, endpoint)),
          ),
        `${endpoint.x},${endpoint.y}`,
      ).toBe(true);
    expect(EEJ_KHAIRKHAN.paths[0]![0]).toEqual(EEJ_KHAIRKHAN_SITES.camp);
    expect(EEJ_KHAIRKHAN.paths[0]!.at(-1)).toEqual(EEJ_KHAIRKHAN_SITES.spring);
    expect(EEJ_KHAIRKHAN.paths[3]!.at(-1)).toEqual(EEJ_KHAIRKHAN_SITES.caravanApproach);
  });

  it('keeps the camp clearing separate from water and solid granite formations', () => {
    const camp = EEJ_KHAIRKHAN.world.camp;
    for (const formation of EEJ_KHAIRKHAN_FOOTPRINTS)
      expect(Math.hypot(formation.x - camp.x, formation.y - camp.y), formation.id).toBeGreaterThan(
        EEJ_KHAIRKHAN.world.campClearRadius + formation.footprint,
      );
    expect(
      Math.hypot(EEJ_KHAIRKHAN.spring.centre.x - camp.x, EEJ_KHAIRKHAN.spring.centre.y - camp.y),
    ).toBeGreaterThan(EEJ_KHAIRKHAN.world.campClearRadius + EEJ_KHAIRKHAN.spring.radius);
  });

  it('uses a compact source pool and no continuous river or new gameplay feature', () => {
    const water = EEJ_KHAIRKHAN.spring.water;
    expect(water.kind).toBe('stream');
    expect(
      Math.hypot(water.course[0]! - water.sourcePool.x, water.course[1]! - water.sourcePool.y),
    ).toBeLessThan(water.sourcePool.radius);
    expect(
      Math.hypot(water.course.at(-2)! - water.course[0]!, water.course.at(-1)! - water.course[1]!),
    ).toBeLessThan(250);
    expect(JSON.stringify(EEJ_KHAIRKHAN)).not.toMatch(/reward|heal|objective|petroglyph|ritual/i);
  });
});

describe('Eej Khairkhan runtime terrain', () => {
  it('registers the authored bounds, camp, terrace, paths, obstacles and spring', () => {
    expect(terrain.worldSize).toBe(6400);
    expect(terrain.playBounds).toEqual({ x: 0, y: 1200, width: 6400, height: 4000 });
    expect(terrain.campPosition).toEqual(world(EEJ_KHAIRKHAN_SITES.camp));
    expect(WORLD_REGIONS['eej-khairkhan'].shelves).toHaveLength(1);
    expect(WORLD_REGIONS['eej-khairkhan'].ground?.paths).toEqual(EEJ_KHAIRKHAN.paths);
    expect(WORLD_REGIONS['eej-khairkhan'].obstacles).toHaveLength(EEJ_KHAIRKHAN_FOOTPRINTS.length);
    expect(terrain.river).toBeDefined();
    const spring = world(EEJ_KHAIRKHAN_SITES.spring);
    expect(terrain.river!.sample(spring.x, spring.y).shoreDistance).toBeLessThan(0);
  });

  it('keeps camp flat, raises one terrace tier and grades both ramps', () => {
    const floor = terrain.region.scene.floor;
    const elevation = (point: TerrainPoint) =>
      terrain.height(world(point).x, world(point).y) * 1000 - floor;
    expect(Math.abs(elevation(EEJ_KHAIRKHAN_SITES.camp))).toBeLessThan(0.001);
    expect(elevation(EEJ_KHAIRKHAN_SITES.basins)).toBeGreaterThan(EEJ_KHAIRKHAN.rise - 20);
    expect(elevation(EEJ_KHAIRKHAN_SITES.overlook)).toBeGreaterThan(EEJ_KHAIRKHAN.rise - 20);
    for (const ramp of terrace.ramps) {
      expect(elevation(ramp.foot)).toBeLessThan(20);
      expect(elevation(ramp.top)).toBeGreaterThan(EEJ_KHAIRKHAN.rise * 0.7);
    }
    expect(terrain.protection(terrain.campPosition.x, terrain.campPosition.y)).toBe(1);
  });

  it('routes its authored desert dressing through the shared scene entry point', () => {
    const bounds = { x: 0, y: 1200, width: 6400, height: 4000 };
    expect(sceneDressing(terrain, bounds)).toEqual(eejKhairkhanDressing(terrain.seed, bounds));
  });

  it('retains the former generated composition as a development fallback', () => {
    const fallback = composedRegion('eej-khairkhan', true);
    expect(fallback.scene.ground).toBeUndefined();
    expect(fallback.scene.terrainSize).toBeUndefined();
    expect(fallback.scene.shelves[0]?.id).toBe('camp-shelf');
    expect(fallback.scene.shelves.slice(1).map(({ id }) => id)).toEqual(
      EEJ_KHAIRKHAN_GENERATED_REGION.shelves.map(({ id }) => id),
    );
  });
});

describe('Eej Khairkhan painted ground', () => {
  it('ships enabled with a development-only tiled fallback switch', () => {
    expect(eejKhairkhanPaintedGroundEnabled('', true)).toBe(true);
    expect(eejKhairkhanPaintedGroundEnabled('?eejKhairkhanPaintedGround=0', true)).toBe(false);
    expect(eejKhairkhanPaintedGroundEnabled('?eejKhairkhanPaintedGround=0', false)).toBe(true);
  });

  it('maps four opaque paintings and the grayscale detail layer over the playable rectangle', () => {
    expect(eejKhairkhanPaintedGroundWorldBounds(6400)).toEqual([0, 1200, 6400, 4000]);
    for (const quadrant of PAINTED_GROUND_QUADRANTS) {
      const painting = EEJ_KHAIRKHAN_PAINTED_GROUND.quadrants[quadrant];
      const png = readFileSync(resolve(`public/art/eej-khairkhan/${painting.file}`));
      expect([
        png.subarray(1, 4).toString(),
        png.readUInt32BE(16),
        png.readUInt32BE(20),
        png.readUInt8(25),
      ]).toEqual(['PNG', 1586, 992, 2]);
    }
    const detail = readFileSync(
      resolve(`public/art/eej-khairkhan/${EEJ_KHAIRKHAN_PAINTED_GROUND.detail.file}`),
    );
    expect([detail.readUInt32BE(16), detail.readUInt32BE(20), detail.readUInt8(25)]).toEqual([
      1024, 1024, 0,
    ]);
    const fallback = readFileSync(
      resolve(`public/art/eej-khairkhan/${EEJ_KHAIRKHAN_GRANITE_FALLBACK.file}`),
    );
    expect([fallback.readUInt32BE(16), fallback.readUInt32BE(20)]).toEqual([256, 256]);
    expect(eejKhairkhanPaintedGroundGpuBytes()).toBe(39_152_772);
  });
});

describe('Eej Khairkhan authored dressing', () => {
  const terrainSize = EEJ_KHAIRKHAN.world.terrainSize;
  const centre = terrainSize / 2;
  const all = eejKhairkhanDressing('eej-khairkhan-test', {
    x: 0,
    y: 0,
    width: terrainSize,
    height: terrainSize,
  });

  it('is deterministic and stable across terrain chunks', () => {
    const parts = [0, centre].flatMap((x) =>
      [0, centre].flatMap((y) =>
        eejKhairkhanDressing('eej-khairkhan-test', {
          x,
          y,
          width: centre,
          height: centre,
        }),
      ),
    );
    const sorted = (items: typeof all) => items.map((item) => JSON.stringify(item)).sort();
    expect(sorted(parts)).toEqual(sorted(all));
    expect(all.length).toBeGreaterThan(55);
    expect(
      all.filter((prop) => prop.kind === 'crag' || prop.kind === 'boulders').length,
    ).toBeGreaterThan(EEJ_KHAIRKHAN.formations.length);
    expect(all.filter((prop) => prop.site === 'spring-bank')).toHaveLength(9);
  });

  it('keeps optional dressing out of camp, routes, ramps, water and solid formations', () => {
    for (const prop of all.filter(
      (item) =>
        !item.site &&
        !EEJ_KHAIRKHAN.formations.some(
          (formation) => formation.x + centre === item.x && formation.y + centre === item.z,
        ),
    ))
      expect(
        eejKhairkhanDressingClear({ x: prop.x - centre, y: prop.z - centre }, 70),
        `${prop.frame}@${prop.x - centre},${prop.z - centre}`,
      ).toBe(true);
  });
});
