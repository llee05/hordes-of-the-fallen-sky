import { describe, expect, it } from 'vitest';
import { ORKHON_SPRITES } from '../../src/game/assets/orkhonValleyArt';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import {
  OTGONTENGER,
  OTGONTENGER_FOOTPRINTS,
  OTGONTENGER_SITES,
} from '../../src/game/data/otgontenger';
import {
  OTGONTENGER_GENERATED_REGION,
  WORLD_REGIONS,
  composedRegion,
} from '../../src/game/data/worldRegions';
import type { TerrainPoint } from '../../src/game/terrain/types';
import { ComposedTerrain, outlineField } from '../../src/game/world3d/ComposedTerrain';
import {
  otgontengerDressing,
  otgontengerDressingClear,
  otgontengerLandmarkAt,
} from '../../src/game/world3d/otgontengerDressing';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';

const bench = OTGONTENGER.plateaus[0]!;
const samePoint = (a: TerrainPoint, b: TerrainPoint) => a.x === b.x && a.y === b.y;
const terrain = new ComposedTerrain(composedRegion('otgontenger'), LANDSCAPES.otgontenger.water);
const world = (point: TerrainPoint): TerrainPoint => ({
  x: OTGONTENGER.world.terrainSize / 2 + point.x,
  y: OTGONTENGER.world.terrainSize / 2 + point.y,
});

describe('Mount Otgontenger authored layout', () => {
  it('uses the approved wide battlefield and keeps the camp inside southwest', () => {
    expect(OTGONTENGER.world).toMatchObject({
      width: 6400,
      height: 4000,
      terrainSize: 6400,
      minX: -3200,
      minY: -2000,
      camp: { x: -1900, y: 900 },
      campClearRadius: 560,
    });
    expect(OTGONTENGER.world.camp.x).toBeLessThan(0);
    expect(OTGONTENGER.world.camp.y).toBeGreaterThan(0);
    expect(Math.abs(OTGONTENGER.world.camp.x)).toBeGreaterThan(OTGONTENGER.pathWidth * 2);
    expect(Math.abs(OTGONTENGER.world.camp.y)).toBeGreaterThan(OTGONTENGER.pathWidth * 2);
  });

  it('has exactly two playable terrain tiers and two broad ramp cuts', () => {
    expect(OTGONTENGER.rise).toBe(240);
    expect(OTGONTENGER.plateaus).toHaveLength(1);
    expect(bench.id).toBe('alpine-bench');
    expect(bench.outline.length).toBeGreaterThanOrEqual(12);
    expect(bench.ramps).toHaveLength(2);
    for (const ramp of bench.ramps) {
      expect(outlineField(bench.outline, ramp.foot.x, ramp.foot.y)).toBeLessThan(-40);
      expect(outlineField(bench.outline, ramp.top.x, ramp.top.y)).toBeGreaterThan(40);
      expect(ramp.halfWidth).toBeGreaterThanOrEqual(112);
      expect(ramp.shoulder).toBeGreaterThan(ramp.halfWidth + 80);
      expect(Math.hypot(ramp.top.x - ramp.foot.x, ramp.top.y - ramp.foot.y)).toBeGreaterThan(400);
    }
  });

  it('keeps the camp clearing on the lower meadow and away from water and landmarks', () => {
    const camp = OTGONTENGER.world.camp;
    expect(outlineField(bench.outline, camp.x, camp.y)).toBeLessThan(
      -OTGONTENGER.world.campClearRadius,
    );
    for (const landmark of OTGONTENGER_FOOTPRINTS)
      expect(Math.hypot(landmark.x - camp.x, landmark.y - camp.y), landmark.id).toBeGreaterThan(
        OTGONTENGER.world.campClearRadius + landmark.footprint,
      );
    expect(
      Math.hypot(OTGONTENGER.tarn.centre.x - camp.x, OTGONTENGER.tarn.centre.y - camp.y),
    ).toBeGreaterThan(OTGONTENGER.world.campClearRadius + OTGONTENGER.tarn.radius);
  });

  it('connects every trail endpoint to a named place or another trail', () => {
    const named = Object.values(OTGONTENGER_SITES);
    const endpoints = OTGONTENGER.paths.flatMap((path) => [path[0]!, path.at(-1)!]);
    for (const endpoint of endpoints)
      expect(
        named.some((site) => samePoint(site, endpoint)) ||
          OTGONTENGER.paths.some((path) =>
            path.slice(1, -1).some((point) => samePoint(point, endpoint)),
          ),
        `${endpoint.x},${endpoint.y}`,
      ).toBe(true);

    const routeEnds = OTGONTENGER.paths.map((path) => [path[0], path.at(-1)]);
    expect(routeEnds).toContainEqual([OTGONTENGER_SITES.camp, OTGONTENGER_SITES.snowOverlook]);
    expect(routeEnds).toContainEqual([OTGONTENGER_SITES.snowOverlook, OTGONTENGER_SITES.tarn]);
    expect(routeEnds).toContainEqual([OTGONTENGER_SITES.camp, OTGONTENGER_SITES.tarn]);
    expect(routeEnds).toContainEqual([OTGONTENGER_SITES.camp, OTGONTENGER_SITES.larchHollow]);
    expect(routeEnds).toContainEqual([OTGONTENGER_SITES.tarn, OTGONTENGER_SITES.outflowFord]);
  });

  it('authors a glacial tarn and outflow without summit or wildlife mechanics', () => {
    const { outflow } = OTGONTENGER.tarn;
    expect(outflow.kind).toBe('glacial');
    expect(outflow.sourcePool).toMatchObject(OTGONTENGER.tarn.centre);
    expect(
      Math.hypot(
        outflow.course[0]! - outflow.sourcePool.x,
        outflow.course[1]! - outflow.sourcePool.y,
      ),
    ).toBeLessThan(outflow.sourcePool.radius);
    expect(outflow.course.at(-2)).toBeGreaterThan(outflow.sourcePool.x);
    expect(outflow.course.at(-1)).toBeGreaterThan(outflow.sourcePool.y);
    expect(JSON.stringify(OTGONTENGER)).not.toMatch(
      /avalanche|ibex|ritual_reward|summit_objective/i,
    );
  });

  it('maps solid terrain landmarks only to bundled existing scenery', () => {
    for (const landmark of OTGONTENGER.landmarks)
      expect(ORKHON_SPRITES, landmark.id).toHaveProperty(landmark.sprite);
  });
});

describe('Mount Otgontenger runtime terrain', () => {
  it('registers the approved world, camp, bench, paths, obstacles and tarn', () => {
    expect(terrain.worldSize).toBe(6400);
    expect(terrain.playBounds).toEqual({ x: 0, y: 1200, width: 6400, height: 4000 });
    expect(terrain.campPosition).toEqual(world(OTGONTENGER_SITES.camp));
    expect(WORLD_REGIONS.otgontenger.shelves).toHaveLength(1);
    expect(WORLD_REGIONS.otgontenger.ground?.paths).toEqual(OTGONTENGER.paths);
    expect(WORLD_REGIONS.otgontenger.obstacles).toHaveLength(OTGONTENGER_FOOTPRINTS.length);
    expect(terrain.river).toBeDefined();
    const tarn = world(OTGONTENGER_SITES.tarn);
    expect(terrain.river!.sample(tarn.x, tarn.y).shoreDistance).toBeLessThan(0);
    expect(terrain.river!.sample(tarn.x, tarn.y).halfWidth).toBeGreaterThan(
      OTGONTENGER.tarn.radius * 0.9,
    );
  });

  it('keeps the camp flat, raises one bench tier and grades both ramp cuts', () => {
    const floor = terrain.region.scene.floor;
    const elevation = (point: TerrainPoint) =>
      terrain.height(world(point).x, world(point).y) * 1000 - floor;
    expect(Math.abs(elevation(OTGONTENGER_SITES.camp))).toBeLessThan(0.001);
    expect(elevation(OTGONTENGER_SITES.snowOverlook)).toBeGreaterThan(OTGONTENGER.rise - 20);
    expect(elevation(OTGONTENGER_SITES.snowOverlook)).toBeLessThan(OTGONTENGER.rise + 12);
    for (const ramp of bench.ramps) {
      expect(elevation(ramp.foot)).toBeLessThan(20);
      expect(elevation(ramp.top)).toBeGreaterThan(OTGONTENGER.rise * 0.7);
      expect(
        elevation({
          x: (ramp.foot.x + ramp.top.x) / 2,
          y: (ramp.foot.y + ramp.top.y) / 2,
        }),
      ).toBeGreaterThan(OTGONTENGER.rise * 0.2);
    }
    expect(terrain.protection(terrain.campPosition.x, terrain.campPosition.y)).toBe(1);
  });

  it('routes authored dressing through the shared scene entry point', () => {
    const bounds = { x: 0, y: 1200, width: 6400, height: 4000 };
    expect(sceneDressing(terrain, bounds)).toEqual(otgontengerDressing(terrain.seed, bounds));
  });

  it('retains the former generated composition as a development fallback', () => {
    const fallback = composedRegion('otgontenger', true);
    expect(fallback.scene.ground).toBeUndefined();
    expect(fallback.scene.terrainSize).toBeUndefined();
    expect(fallback.scene.shelves[0]?.id).toBe('camp-shelf');
    expect(fallback.scene.shelves.slice(1).map(({ id }) => id)).toEqual(
      OTGONTENGER_GENERATED_REGION.shelves.map(({ id }) => id),
    );
  });
});

describe('Mount Otgontenger authored dressing', () => {
  const terrainSize = OTGONTENGER.world.terrainSize;
  const centre = terrainSize / 2;
  const all = otgontengerDressing('otgontenger-test', {
    x: 0,
    y: 0,
    width: terrainSize,
    height: terrainSize,
  });

  it('is deterministic and stable across terrain chunks', () => {
    const parts = [0, centre].flatMap((x) =>
      [0, centre].flatMap((y) =>
        otgontengerDressing('otgontenger-test', {
          x,
          y,
          width: centre,
          height: centre,
        }),
      ),
    );
    const sorted = (items: typeof all) => items.map((item) => JSON.stringify(item)).sort();
    expect(sorted(parts)).toEqual(sorted(all));
    expect(all.length).toBeGreaterThan(150);
    expect(all.filter((prop) => prop.kind === 'boulders').length).toBeGreaterThan(75);
    expect(all.filter((prop) => prop.kind === 'larch').length).toBeGreaterThan(20);
    expect(all.filter((prop) => prop.frame === 'snow-dome')).toHaveLength(3);
  });

  it('keeps camp, trails, ramps, water and central combat lanes clear', () => {
    for (const prop of all.filter(
      (item) =>
        item.kind !== 'landmark' &&
        !item.site &&
        item.frame !== 'snow-dome' &&
        item.frame !== 'foothill',
    ))
      expect(
        otgontengerDressingClear({ x: prop.x - centre, y: prop.z - centre }, 80),
        `${prop.frame}@${prop.x - centre},${prop.z - centre}`,
      ).toBe(true);
  });

  it('places every authored landmark once and preserves its semantic entry', () => {
    const landmarks = all.filter((prop) => prop.kind === 'landmark');
    expect(landmarks).toHaveLength(OTGONTENGER.landmarks.length);
    for (const landmark of OTGONTENGER.landmarks) {
      const prop = landmarks.find(
        (item) =>
          item.x === centre + landmark.x &&
          item.z === centre + landmark.y &&
          item.frame === landmark.sprite,
      );
      expect(prop, landmark.id).toBeDefined();
      expect(otgontengerLandmarkAt(prop!)?.id).toBe(landmark.id);
    }
  });
});
