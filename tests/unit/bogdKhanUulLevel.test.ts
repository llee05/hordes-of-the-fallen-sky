import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ORKHON_SPRITES } from '../../src/game/assets/orkhonValleyArt';
import {
  BOGD_KHAN_UUL,
  BOGD_KHAN_UUL_FOOTPRINTS,
  BOGD_KHAN_UUL_SITES,
} from '../../src/game/data/bogdKhanUul';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import {
  BOGD_KHAN_UUL_GENERATED_REGION,
  WORLD_REGIONS,
  composedRegion,
} from '../../src/game/data/worldRegions';
import type { TerrainPoint } from '../../src/game/terrain/types';
import {
  bogdKhanUulDressing,
  bogdKhanUulDressingClear,
  bogdKhanUulLandmarkAt,
} from '../../src/game/world3d/bogdKhanUulDressing';
import {
  BOGD_KHAN_UUL_PAINTED_GROUND,
  bogdKhanUulPaintedGroundEnabled,
  bogdKhanUulPaintedGroundGpuBytes,
  bogdKhanUulPaintedGroundWorldBounds,
} from '../../src/game/world3d/bogdKhanUulPaintedGround';
import { ComposedTerrain, outlineField } from '../../src/game/world3d/ComposedTerrain';
import { PAINTED_GROUND_QUADRANTS } from '../../src/game/world3d/paintedGround';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';

const shoulder = BOGD_KHAN_UUL.plateaus[0]!;
const samePoint = (a: TerrainPoint, b: TerrainPoint) => a.x === b.x && a.y === b.y;
const terrain = new ComposedTerrain(
  composedRegion('bogd-khan-uul'),
  LANDSCAPES['bogd-khan-uul'].water,
);
const world = (point: TerrainPoint): TerrainPoint => ({
  x: BOGD_KHAN_UUL.world.terrainSize / 2 + point.x,
  y: BOGD_KHAN_UUL.world.terrainSize / 2 + point.y,
});

describe('Bogd Khan Uul authored layout', () => {
  it('uses the approved 16:10 battlefield and keeps camp off both quadrant seams', () => {
    expect(BOGD_KHAN_UUL.world).toMatchObject({
      width: 6400,
      height: 4000,
      terrainSize: 8000,
      minX: -3200,
      minY: -2000,
      camp: { x: -2050, y: -500 },
      campClearRadius: 520,
    });
    expect(Math.abs(BOGD_KHAN_UUL.world.camp.x)).toBeGreaterThan(1000);
    expect(Math.abs(BOGD_KHAN_UUL.world.camp.y)).toBeGreaterThan(BOGD_KHAN_UUL.pathWidth * 2);
  });

  it('has two elevation tiers joined by two broad ramps', () => {
    expect(BOGD_KHAN_UUL.rise).toBe(320);
    expect(BOGD_KHAN_UUL.plateaus).toHaveLength(1);
    expect(shoulder.ramps).toHaveLength(2);
    for (const ramp of shoulder.ramps) {
      expect(outlineField(shoulder.outline, ramp.foot.x, ramp.foot.y)).toBeLessThan(-40);
      expect(outlineField(shoulder.outline, ramp.top.x, ramp.top.y)).toBeGreaterThan(40);
      expect(ramp.halfWidth).toBeGreaterThanOrEqual(118);
      expect(ramp.shoulder).toBeGreaterThan(ramp.halfWidth + 80);
    }
  });

  it('connects every track endpoint to a named site or another route', () => {
    const named = Object.values(BOGD_KHAN_UUL_SITES);
    for (const path of BOGD_KHAN_UUL.paths)
      for (const endpoint of [path[0]!, path.at(-1)!])
        expect(
          named.some((site) => samePoint(site, endpoint)) ||
            BOGD_KHAN_UUL.paths.some(
              (route) => route !== path && route.some((point) => samePoint(point, endpoint)),
            ),
          `${endpoint.x},${endpoint.y}`,
        ).toBe(true);
    expect(BOGD_KHAN_UUL.paths.flat()).toContainEqual(BOGD_KHAN_UUL_SITES.tuulLanding);
    expect(BOGD_KHAN_UUL.paths.flat()).toContainEqual(BOGD_KHAN_UUL_SITES.tuulBend);
    expect(BOGD_KHAN_UUL.paths.flat()).toContainEqual(BOGD_KHAN_UUL_SITES.pineHollow);
  });

  it('frames the north with an authored west-east Tuul course and existing scenery only', () => {
    expect(BOGD_KHAN_UUL.river.kind).toBe('stream');
    expect(BOGD_KHAN_UUL.river.width).toBeGreaterThanOrEqual(220);
    expect(BOGD_KHAN_UUL.river.course[0]).toBeLessThan(BOGD_KHAN_UUL.world.minX);
    expect(BOGD_KHAN_UUL.river.course.at(-2)).toBeGreaterThan(
      BOGD_KHAN_UUL.world.minX + BOGD_KHAN_UUL.world.width,
    );
    for (const landmark of BOGD_KHAN_UUL.landmarks)
      expect(ORKHON_SPRITES, landmark.id).toHaveProperty(landmark.sprite);
    expect(JSON.stringify(BOGD_KHAN_UUL)).not.toMatch(/objective|reward|enemy|building/i);
  });
});

describe('Bogd Khan Uul runtime terrain', () => {
  it('registers play bounds, camp, paths, shoulder, obstacles and Tuul water', () => {
    expect(terrain.worldSize).toBe(8000);
    expect(terrain.playBounds).toEqual({ x: 800, y: 2000, width: 6400, height: 4000 });
    expect(terrain.playBounds.x).toBeGreaterThanOrEqual(800);
    expect(
      terrain.worldSize - terrain.playBounds.x - terrain.playBounds.width,
    ).toBeGreaterThanOrEqual(800);
    expect(terrain.playBounds.y).toBeGreaterThanOrEqual(1600);
    expect(
      terrain.worldSize - terrain.playBounds.y - terrain.playBounds.height,
    ).toBeGreaterThanOrEqual(1600);
    expect(terrain.campPosition).toEqual(world(BOGD_KHAN_UUL_SITES.camp));
    expect(WORLD_REGIONS['bogd-khan-uul'].ground?.paths).toEqual(BOGD_KHAN_UUL.paths);
    expect(WORLD_REGIONS['bogd-khan-uul'].obstacles).toHaveLength(BOGD_KHAN_UUL_FOOTPRINTS.length);
    expect(terrain.river).toBeDefined();
    expect(
      terrain.river!.sample(world({ x: 0, y: -1540 }).x, world({ x: 0, y: -1540 }).y).shoreDistance,
    ).toBeLessThan(40);
  });

  it('keeps camp flat, raises the southern shoulder and grades both ramps', () => {
    const floor = terrain.region.scene.floor;
    const elevation = (point: TerrainPoint) =>
      terrain.height(world(point).x, world(point).y) * 1000 - floor;
    expect(Math.abs(elevation(BOGD_KHAN_UUL_SITES.camp))).toBeLessThan(0.001);
    expect(elevation(BOGD_KHAN_UUL_SITES.tsetseeShoulder)).toBeGreaterThan(BOGD_KHAN_UUL.rise - 25);
    for (const ramp of shoulder.ramps) {
      expect(elevation(ramp.foot)).toBeLessThan(25);
      expect(elevation(ramp.top)).toBeGreaterThan(BOGD_KHAN_UUL.rise * 0.68);
    }
  });

  it('routes authored dressing through the shared scene entry point', () => {
    const bounds = terrain.playBounds;
    expect(sceneDressing(terrain, bounds)).toEqual(bogdKhanUulDressing(terrain.seed, bounds));
  });

  it('retains the former generic landscape as a development fallback', () => {
    const fallback = composedRegion('bogd-khan-uul', true);
    expect(fallback.scene.ground).toBeUndefined();
    expect(fallback.scene.terrainSize).toBeUndefined();
    expect(fallback.scene.shelves[0]?.id).toBe('camp-shelf');
    expect(fallback.scene.shelves.slice(1).map(({ id }) => id)).toEqual(
      BOGD_KHAN_UUL_GENERATED_REGION.shelves.map(({ id }) => id),
    );
  });
});

describe('Bogd Khan Uul painted ground', () => {
  it('ships four opaque paintings and the subtle grayscale detail layer', () => {
    expect(bogdKhanUulPaintedGroundEnabled('', true)).toBe(true);
    expect(bogdKhanUulPaintedGroundEnabled('?bogdKhanUulPaintedGround=0', true)).toBe(false);
    expect(bogdKhanUulPaintedGroundEnabled('?bogdKhanUulPaintedGround=0', false)).toBe(true);
    expect(bogdKhanUulPaintedGroundWorldBounds(8000)).toEqual([800, 2000, 6400, 4000]);
    for (const quadrant of PAINTED_GROUND_QUADRANTS) {
      const painting = BOGD_KHAN_UUL_PAINTED_GROUND.quadrants[quadrant];
      const png = readFileSync(resolve(`public/art/bogd-khan-uul/${painting.file}`));
      expect([png.readUInt32BE(16), png.readUInt32BE(20), png.readUInt8(25)]).toEqual([
        1600, 1000, 2,
      ]);
    }
    const detail = readFileSync(
      resolve(`public/art/bogd-khan-uul/${BOGD_KHAN_UUL_PAINTED_GROUND.detail.file}`),
    );
    expect([detail.readUInt32BE(16), detail.readUInt32BE(20), detail.readUInt8(25)]).toEqual([
      1024, 1024, 0,
    ]);
    expect(bogdKhanUulPaintedGroundGpuBytes()).toBe(39_724_100);
  });
});

describe('Bogd Khan Uul authored dressing', () => {
  const size = BOGD_KHAN_UUL.world.terrainSize;
  const centre = size / 2;
  const all = bogdKhanUulDressing('bogd-test', { x: 0, y: 0, width: size, height: size });

  it('is deterministic, chunk-stable and dense around broad open combat lanes', () => {
    const parts = [0, centre].flatMap((x) =>
      [0, centre].flatMap((y) =>
        bogdKhanUulDressing('bogd-test', { x, y, width: centre, height: centre }),
      ),
    );
    const sorted = (items: typeof all) => items.map((item) => JSON.stringify(item)).sort();
    expect(sorted(parts)).toEqual(sorted(all));
    expect(all.length).toBeGreaterThan(150);
    expect(
      all.filter((prop) => prop.kind === 'pine' || prop.kind === 'larch').length,
    ).toBeGreaterThan(95);
  });

  it('uses existing untinted manuscript scenery and preserves protected clearances', () => {
    for (const prop of all) {
      expect(ORKHON_SPRITES).toHaveProperty(prop.frame);
      expect(prop.tint).toBe(0xffffff);
    }
    for (const prop of all.filter((item) => item.kind !== 'landmark'))
      expect(
        bogdKhanUulDressingClear({ x: prop.x - centre, y: prop.z - centre }, 72),
        `${prop.frame}@${prop.x - centre},${prop.z - centre}`,
      ).toBe(true);
  });

  it('places every terrain landmark once and retains its semantic entry', () => {
    const landmarks = all.filter((prop) => prop.kind === 'landmark');
    expect(landmarks).toHaveLength(BOGD_KHAN_UUL.landmarks.length);
    for (const landmark of BOGD_KHAN_UUL.landmarks) {
      const prop = landmarks.find(
        (item) => item.x === centre + landmark.x && item.z === centre + landmark.y,
      );
      expect(prop, landmark.id).toBeDefined();
      expect(bogdKhanUulLandmarkAt(prop!)?.id).toBe(landmark.id);
    }
  });
});
