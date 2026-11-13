import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALTAI_TAVAN_BOGD,
  ALTAI_TAVAN_BOGD_FOOTPRINTS,
  ALTAI_TAVAN_BOGD_SITES,
} from '../../src/game/data/altaiTavanBogd';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import {
  ALTAI_TAVAN_BOGD_GENERATED_REGION,
  WORLD_REGIONS,
  composedRegion,
} from '../../src/game/data/worldRegions';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import {
  ALTAI_TAVAN_BOGD_PAINTED_GROUND,
  altaiTavanBogdPaintedGroundEnabled,
  altaiTavanBogdPaintedGroundGpuBytes,
  altaiTavanBogdPaintedGroundWorldBounds,
} from '../../src/game/world3d/altaiTavanBogdPaintedGround';
import {
  altaiTavanBogdDressing,
  altaiTavanBogdDressingClear,
} from '../../src/game/world3d/altaiTavanBogdDressing';
import { PAINTED_GROUND_QUADRANTS } from '../../src/game/world3d/paintedGround';

const terrain = new ComposedTerrain(
  composedRegion('altai-tavan-bogd'),
  LANDSCAPES['altai-tavan-bogd'].water,
);
const centre = ALTAI_TAVAN_BOGD.world.terrainSize / 2;
const world = (point: { x: number; y: number }) => ({ x: centre + point.x, y: centre + point.y });
const elevation = (point: { x: number; y: number }) =>
  terrain.height(centre + point.x, centre + point.y) * terrain.region.biome.heightScale -
  terrain.region.scene.floor;

describe('Altai Tavan Bogd authored level', () => {
  it('uses the approved wide scale, off-seam camp and one raised moraine tier', () => {
    expect(ALTAI_TAVAN_BOGD.world).toMatchObject({
      width: 6400,
      height: 4000,
      terrainSize: 8000,
      minX: -3200,
      minY: -2000,
      campClearRadius: 520,
    });
    expect(ALTAI_TAVAN_BOGD.world.camp).toEqual(ALTAI_TAVAN_BOGD_SITES.camp);
    expect(Math.abs(ALTAI_TAVAN_BOGD.world.camp.x)).toBeGreaterThan(520);
    expect(Math.abs(ALTAI_TAVAN_BOGD.world.camp.y)).toBeGreaterThan(520);
    expect(ALTAI_TAVAN_BOGD.rise).toBe(240);
    expect(ALTAI_TAVAN_BOGD.plateaus).toHaveLength(1);
    expect(ALTAI_TAVAN_BOGD.plateaus[0]!.ramps).toHaveLength(2);
    const region = WORLD_REGIONS['altai-tavan-bogd'];
    expect(region.playBounds).toEqual({ x: -3200, y: -2000, width: 6400, height: 4000 });
    expect(terrain.playBounds).toEqual({ x: 800, y: 2000, width: 6400, height: 4000 });
    expect(region.terrainSize! - terrain.playBounds.x - terrain.playBounds.width).toBe(800);
    expect(region.terrainSize! - terrain.playBounds.y - terrain.playBounds.height).toBe(2000);
  });

  it('frames the playable valley with distant peaks and rock-finished ramp shoulders', () => {
    const peaks = ALTAI_TAVAN_BOGD.landmarks.filter(({ role }) => role === 'peak-frame');
    expect(peaks).toHaveLength(5);
    for (const peak of peaks) expect(peak.y).toBeLessThan(ALTAI_TAVAN_BOGD.world.minY);
    expect(ALTAI_TAVAN_BOGD.landmarks.find(({ role }) => role === 'glacier')!.y).toBeLessThan(
      ALTAI_TAVAN_BOGD.world.minY,
    );
    expect(ALTAI_TAVAN_BOGD.landmarks.filter(({ id }) => id.includes('ramp-cap'))).toHaveLength(4);
  });

  it('keeps every track endpoint at a named site and inside the playable rectangle', () => {
    const named = Object.values(ALTAI_TAVAN_BOGD_SITES);
    const endpoints = ALTAI_TAVAN_BOGD.paths.flatMap((path) => [path[0]!, path.at(-1)!]);
    for (const endpoint of endpoints) expect(named).toContainEqual(endpoint);
    for (const path of ALTAI_TAVAN_BOGD.paths)
      for (const point of path) {
        expect(point.x).toBeGreaterThanOrEqual(-3200);
        expect(point.x).toBeLessThanOrEqual(3200);
        expect(point.y).toBeGreaterThanOrEqual(-2000);
        expect(point.y).toBeLessThanOrEqual(2000);
      }
  });

  it('keeps landmarks, lake and dressing outside the spawn-safe camp clearing', () => {
    const camp = ALTAI_TAVAN_BOGD.world.camp;
    for (const landmark of ALTAI_TAVAN_BOGD_FOOTPRINTS)
      expect(Math.hypot(landmark.x - camp.x, landmark.y - camp.y)).toBeGreaterThan(
        ALTAI_TAVAN_BOGD.world.campClearRadius + landmark.footprint,
      );
    expect(altaiTavanBogdDressingClear(camp)).toBe(false);
  });

  it('projects authored terrain, water, camp and ramps while retaining the generated fallback', () => {
    expect(terrain.playBounds).toEqual({ x: 800, y: 2000, width: 6400, height: 4000 });
    expect(terrain.campPosition).toEqual(world(ALTAI_TAVAN_BOGD_SITES.camp));
    expect(terrain.river?.definition).toEqual(ALTAI_TAVAN_BOGD.lake);
    expect(WORLD_REGIONS['altai-tavan-bogd'].shelves).toHaveLength(1);
    expect(WORLD_REGIONS['altai-tavan-bogd'].ground?.paths).toEqual(ALTAI_TAVAN_BOGD.paths);
    expect(composedRegion('altai-tavan-bogd', true).scene.shelves.map(({ id }) => id)).toEqual([
      'camp-shelf',
      ...ALTAI_TAVAN_BOGD_GENERATED_REGION.shelves.map(({ id }) => id),
    ]);
  });

  it('puts the camp on lower ground and the moraine sites on the upper tier', () => {
    expect(Math.abs(elevation(ALTAI_TAVAN_BOGD_SITES.camp))).toBeLessThan(0.001);
    expect(elevation(ALTAI_TAVAN_BOGD_SITES.westernMoraine)).toBeGreaterThan(215);
    expect(elevation(ALTAI_TAVAN_BOGD_SITES.potaninOverlook)).toBeGreaterThan(215);
    for (const ramp of ALTAI_TAVAN_BOGD.plateaus[0]!.ramps) {
      expect(elevation(ramp.top)).toBeGreaterThan(165);
      expect(elevation(ramp.foot)).toBeLessThan(80);
    }
  });

  it('ships the four opaque paintings and shared detail layer under the fallback contract', () => {
    expect(altaiTavanBogdPaintedGroundEnabled('', true)).toBe(true);
    expect(altaiTavanBogdPaintedGroundEnabled('?altaiTavanBogdPaintedGround=0', true)).toBe(false);
    expect(altaiTavanBogdPaintedGroundEnabled('?altaiTavanBogdPaintedGround=0', false)).toBe(true);
    expect(altaiTavanBogdPaintedGroundWorldBounds(8000)).toEqual([800, 2000, 6400, 4000]);
    for (const quadrant of PAINTED_GROUND_QUADRANTS) {
      const painting = ALTAI_TAVAN_BOGD_PAINTED_GROUND.quadrants[quadrant];
      const png = readFileSync(resolve(`public/art/altai-tavan-bogd/${painting.file}`));
      expect([png.readUInt32BE(16), png.readUInt32BE(20), png.readUInt8(25)]).toEqual([
        1600, 1000, 2,
      ]);
    }
    const detail = readFileSync(
      resolve(`public/art/altai-tavan-bogd/${ALTAI_TAVAN_BOGD_PAINTED_GROUND.detail.file}`),
    );
    expect([detail.readUInt32BE(16), detail.readUInt32BE(20), detail.readUInt8(25)]).toEqual([
      1024, 1024, 0,
    ]);
    expect(altaiTavanBogdPaintedGroundGpuBytes()).toBe(39_724_100);
  });

  it('builds deterministic sparse authored dressing with all named landmarks', () => {
    const bounds = { x: 0, y: 0, width: 6400, height: 6400 };
    const first = altaiTavanBogdDressing('altai-test', bounds);
    const second = altaiTavanBogdDressing('altai-test', bounds);
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(ALTAI_TAVAN_BOGD.landmarks.length + 20);
    expect(first.filter((prop) => prop.kind === 'landmark')).toHaveLength(
      ALTAI_TAVAN_BOGD.landmarks.length,
    );
  });
});
