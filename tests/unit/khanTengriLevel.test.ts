import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ORKHON_SPRITES } from '../../src/game/assets/orkhonValleyArt';
import {
  KHAN_TENGRI,
  KHAN_TENGRI_FOOTPRINTS,
  KHAN_TENGRI_SITES,
} from '../../src/game/data/khanTengri';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import {
  KHAN_TENGRI_GENERATED_REGION,
  WORLD_REGIONS,
  composedRegion,
} from '../../src/game/data/worldRegions';
import type { TerrainPoint } from '../../src/game/terrain/types';
import { ComposedTerrain, outlineField } from '../../src/game/world3d/ComposedTerrain';
import {
  khanTengriDressing,
  khanTengriDressingClear,
  khanTengriLandmarkAt,
} from '../../src/game/world3d/khanTengriDressing';
import {
  KHAN_TENGRI_PAINTED_GROUND,
  khanTengriPaintedGroundEnabled,
  khanTengriPaintedGroundGpuBytes,
  khanTengriPaintedGroundWorldBounds,
} from '../../src/game/world3d/khanTengriPaintedGround';
import { PAINTED_GROUND_QUADRANTS } from '../../src/game/world3d/paintedGround';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';

const terrace = KHAN_TENGRI.plateaus[0]!;
const samePoint = (a: TerrainPoint, b: TerrainPoint) => a.x === b.x && a.y === b.y;
const terrain = new ComposedTerrain(composedRegion('khan-tengri'), LANDSCAPES['khan-tengri'].water);
const world = (point: TerrainPoint): TerrainPoint => ({
  x: KHAN_TENGRI.world.terrainSize / 2 + point.x,
  y: KHAN_TENGRI.world.terrainSize / 2 + point.y,
});

describe('Khan Tengri authored layout', () => {
  it('uses the approved wide battlefield and keeps the camp safely inside southwest', () => {
    expect(KHAN_TENGRI.world).toMatchObject({
      width: 6400,
      height: 4000,
      terrainSize: 6400,
      minX: -3200,
      minY: -2000,
      camp: { x: -2050, y: 1050 },
      campClearRadius: 540,
    });
    expect(Math.abs(KHAN_TENGRI.world.camp.x)).toBeGreaterThan(KHAN_TENGRI.world.campClearRadius);
    expect(Math.abs(KHAN_TENGRI.world.camp.y)).toBeGreaterThan(KHAN_TENGRI.world.campClearRadius);
  });

  it('has exactly two terrain tiers and two broad graded ramps', () => {
    expect(KHAN_TENGRI.rise).toBe(240);
    expect(KHAN_TENGRI.plateaus).toHaveLength(1);
    expect(terrace.id).toBe('lateral-moraine-terrace');
    expect(terrace.outline.length).toBeGreaterThanOrEqual(12);
    expect(terrace.ramps).toHaveLength(2);
    for (const ramp of terrace.ramps) {
      expect(outlineField(terrace.outline, ramp.foot.x, ramp.foot.y)).toBeLessThan(-40);
      expect(outlineField(terrace.outline, ramp.top.x, ramp.top.y)).toBeGreaterThan(40);
      expect(ramp.halfWidth).toBeGreaterThanOrEqual(112);
      expect(ramp.shoulder).toBeGreaterThan(ramp.halfWidth + 80);
      expect(Math.hypot(ramp.top.x - ramp.foot.x, ramp.top.y - ramp.foot.y)).toBeGreaterThan(400);
    }
  });

  it('keeps the camp on lower ground and outside every solid landmark', () => {
    const camp = KHAN_TENGRI.world.camp;
    expect(outlineField(terrace.outline, camp.x, camp.y)).toBeLessThan(
      -KHAN_TENGRI.world.campClearRadius,
    );
    for (const landmark of KHAN_TENGRI_FOOTPRINTS)
      expect(Math.hypot(landmark.x - camp.x, landmark.y - camp.y), landmark.id).toBeGreaterThan(
        KHAN_TENGRI.world.campClearRadius + landmark.footprint,
      );
  });

  it('connects every track endpoint to a named terrain place or another track', () => {
    const named = Object.values(KHAN_TENGRI_SITES);
    const endpoints = KHAN_TENGRI.paths.flatMap((path) => [path[0]!, path.at(-1)!]);
    for (const endpoint of endpoints)
      expect(
        named.some((site) => samePoint(site, endpoint)) ||
          KHAN_TENGRI.paths.some((path) =>
            path.slice(1, -1).some((point) => samePoint(point, endpoint)),
          ),
        `${endpoint.x},${endpoint.y}`,
      ).toBe(true);
  });

  it('uses only bundled scenery and keeps the single pyramid as an edge frame', () => {
    const peaks = KHAN_TENGRI.landmarks.filter((landmark) => landmark.role === 'peak-frame');
    expect(peaks).toHaveLength(1);
    expect(peaks[0]).toMatchObject({ frame: 'pyramid', y: -2050 });
    for (const landmark of KHAN_TENGRI.landmarks)
      if (landmark.texture === 'steppe-scenery')
        expect(['pyramid', 'glacier', 'crag']).toContain(landmark.frame);
      else expect(ORKHON_SPRITES, landmark.id).toHaveProperty(landmark.frame);
  });
});

describe('Khan Tengri runtime terrain', () => {
  it('registers the approved bounds, camp, terrace, paths, obstacles and meltwater', () => {
    expect(terrain.worldSize).toBe(6400);
    expect(terrain.playBounds).toEqual({ x: 0, y: 1200, width: 6400, height: 4000 });
    expect(terrain.campPosition).toEqual(world(KHAN_TENGRI_SITES.camp));
    expect(WORLD_REGIONS['khan-tengri'].shelves).toHaveLength(1);
    expect(WORLD_REGIONS['khan-tengri'].ground?.paths).toEqual(KHAN_TENGRI.paths);
    expect(WORLD_REGIONS['khan-tengri'].obstacles).toHaveLength(KHAN_TENGRI_FOOTPRINTS.length);
    expect(terrain.river?.definition.kind).toBe('glacial');
    expect(terrain.river?.definition.gorge).toEqual({ rapids: 0, bridges: [] });
  });

  it('keeps the camp flat, raises one terrace and grades both ramp cuts', () => {
    const floor = terrain.region.scene.floor;
    const elevation = (point: TerrainPoint) =>
      terrain.height(world(point).x, world(point).y) * 1000 - floor;
    expect(Math.abs(elevation(KHAN_TENGRI_SITES.camp))).toBeLessThan(0.001);
    expect(elevation(KHAN_TENGRI_SITES.marbleView)).toBeGreaterThan(KHAN_TENGRI.rise - 20);
    for (const ramp of terrace.ramps) {
      expect(elevation(ramp.foot)).toBeLessThan(20);
      expect(elevation(ramp.top)).toBeGreaterThan(KHAN_TENGRI.rise * 0.7);
      expect(
        elevation({
          x: (ramp.foot.x + ramp.top.x) / 2,
          y: (ramp.foot.y + ramp.top.y) / 2,
        }),
      ).toBeGreaterThan(KHAN_TENGRI.rise * 0.2);
    }
  });

  it('retains the former generated composition as a development fallback', () => {
    const fallback = composedRegion('khan-tengri', true);
    expect(fallback.scene.ground).toBeUndefined();
    expect(fallback.scene.terrainSize).toBeUndefined();
    expect(fallback.scene.shelves[0]?.id).toBe('camp-shelf');
    expect(fallback.scene.shelves.slice(1).map(({ id }) => id)).toEqual(
      KHAN_TENGRI_GENERATED_REGION.shelves.map(({ id }) => id),
    );
  });
});

describe('Khan Tengri painted ground', () => {
  it('ships enabled with the same development-only fallback contract as the established levels', () => {
    expect(khanTengriPaintedGroundEnabled('', true)).toBe(true);
    expect(khanTengriPaintedGroundEnabled('?khanTengriPaintedGround=0', true)).toBe(false);
    expect(khanTengriPaintedGroundEnabled('?khanTengriPaintedGround=1', true)).toBe(true);
    expect(khanTengriPaintedGroundEnabled('?khanTengriPaintedGround=0', false)).toBe(true);
  });

  it('maps four opaque paintings and the grayscale detail layer over the playable rectangle', () => {
    expect(khanTengriPaintedGroundWorldBounds(6400)).toEqual([0, 1200, 6400, 4000]);
    expect(KHAN_TENGRI_PAINTED_GROUND.outerFeather).toBe(700);
    for (const quadrant of PAINTED_GROUND_QUADRANTS) {
      const painting = KHAN_TENGRI_PAINTED_GROUND.quadrants[quadrant];
      const png = readFileSync(resolve(`public/art/khan-tengri/${painting.file}`));
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect([png.readUInt32BE(16), png.readUInt32BE(20), png.readUInt8(25)]).toEqual([
        1600, 1000, 2,
      ]);
    }
    const detail = readFileSync(
      resolve(`public/art/khan-tengri/${KHAN_TENGRI_PAINTED_GROUND.detail.file}`),
    );
    expect([detail.readUInt32BE(16), detail.readUInt32BE(20), detail.readUInt8(25)]).toEqual([
      1024, 1024, 0,
    ]);
    expect(khanTengriPaintedGroundGpuBytes()).toBe(39_724_100);
  });
});

describe('Khan Tengri authored dressing', () => {
  const terrainSize = KHAN_TENGRI.world.terrainSize;
  const centre = terrainSize / 2;
  const all = khanTengriDressing('khan-tengri-test', {
    x: 0,
    y: 0,
    width: terrainSize,
    height: terrainSize,
  });

  it('is deterministic, sparse and stable across terrain chunks', () => {
    const parts = [0, centre].flatMap((x) =>
      [0, centre].flatMap((y) =>
        khanTengriDressing('khan-tengri-test', {
          x,
          y,
          width: centre,
          height: centre,
        }),
      ),
    );
    const sorted = (items: typeof all) => items.map((item) => JSON.stringify(item)).sort();
    expect(sorted(parts)).toEqual(sorted(all));
    expect(all.length).toBeGreaterThan(120);
    expect(all.length).toBeLessThan(500);
    expect(JSON.stringify(all)).not.toMatch(/pine|tree|flowers|reeds/i);
  });

  it('keeps camp, tracks, ramps, meltwater and landmark footprints clear', () => {
    for (const prop of all.filter((item) => item.kind !== 'landmark'))
      expect(
        khanTengriDressingClear({ x: prop.x - centre, y: prop.z - centre }, 76),
        `${prop.frame}@${prop.x - centre},${prop.z - centre}`,
      ).toBe(true);
  });

  it('routes dressing through the shared entry and places every landmark once', () => {
    const bounds = { x: 0, y: 0, width: terrainSize, height: terrainSize };
    expect(sceneDressing(terrain, bounds)).toEqual(khanTengriDressing(terrain.seed, bounds));
    const landmarks = all.filter((prop) => prop.kind === 'landmark');
    expect(landmarks).toHaveLength(KHAN_TENGRI.landmarks.length);
    for (const prop of landmarks) expect(khanTengriLandmarkAt(prop)).toBeDefined();
  });
});
