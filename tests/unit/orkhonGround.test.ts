import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { composedRegion } from '../../src/game/data/worldRegions';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import {
  bakeOrkhonGroundMask,
  groundSurface,
  orkhonGroundFields,
  orkhonGroundWeights,
  orkhonRampUniforms,
  orkhonRampWear,
  sampleGroundMask,
  trailSegments,
} from '../../src/game/world3d/orkhonGround';
import { authoredMaterialWeights, terrainHabitat } from '../../src/game/world3d/terrainHabitat';
import {
  ORKHON_COLOR,
  ORKHON_SAMPLING,
  TERRAIN_COLOR,
  TERRAIN_SAMPLING,
  terrainShaderSource,
} from '../../src/game/world3d/terrainShader';

const orkhon = new ComposedTerrain(
  composedRegion('orkhon-valley'),
  LANDSCAPES['orkhon-valley'].water,
);
const C = orkhon.worldSize / 2;
const ground = orkhon.region.scene.ground!;
const mask = bakeOrkhonGroundMask(orkhon);

describe('Orkhon per-pixel ground masks', () => {
  it('reproduces the per-vertex material rule at any point', () => {
    let checked = 0;
    for (let x = 140; x < orkhon.worldSize; x += 173)
      for (let z = 90; z < orkhon.worldSize; z += 191)
        for (const normalY of [1, 0.8, 0.45]) {
          const y = orkhon.height(x, z) * 1000;
          const habitat = terrainHabitat(orkhon, x, z, y, normalY);
          const fields = orkhonGroundFields(orkhon, x, z, y, normalY);
          expect(fields.wear).toBeCloseTo(habitat.wear, 12);
          const expected = authoredMaterialWeights(orkhon, y, normalY, habitat);
          const actual = orkhonGroundWeights(orkhon, {
            ...fields,
            y,
            normalY,
            cliffFoot: habitat.cliffFoot,
          });
          actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]!, 9));
          expect(expected.slice(5)).toEqual([0, 0]);
          checked++;
        }
    expect(checked).toBeGreaterThan(2000);
  });

  it('covers every trail, ramp centre line and ramp', () => {
    const paths = ground.paths.reduce((sum, path) => sum + path.length - 1, 0);
    expect(trailSegments(orkhon)).toHaveLength(paths);
    const ramps = orkhonRampUniforms(orkhon);
    expect(ramps.axis).toHaveLength(ground.ramps!.length);
    for (const [i, [, , dx, dz]] of ramps.axis.entries()) {
      expect(Math.hypot(dx, dz)).toBeCloseTo(1, 9);
      expect(ramps.size[i]![2]).toBeGreaterThan(ramps.size[i]![1]);
    }
  });

  it('bakes fields that draw the same ground as exact masks', () => {
    let count = 0,
      sum = 0,
      off = 0,
      wear = 0;
    for (let x = 31; x < orkhon.worldSize; x += 47)
      for (let z = 17; z < orkhon.worldSize; z += 53) {
        const [y, normalY] = groundSurface(orkhon, x, z);
        const exact = orkhonGroundFields(orkhon, x, z, y, normalY);
        const [bakedWear, bakedDry] = sampleGroundMask(mask, orkhon.worldSize, x, z);
        const point = { y, normalY, cliffFoot: terrainHabitat(orkhon, x, z, y, normalY).cliffFoot };
        const a = orkhonGroundWeights(orkhon, { ...point, ...exact });
        const b = orkhonGroundWeights(orkhon, { ...point, wear: bakedWear, dry: bakedDry });
        const error = Math.max(...a.map((value, i) => Math.abs(value - b[i]!)));
        sum += error;
        off += error > 0.1 ? 1 : 0;
        wear = Math.max(wear, Math.abs(bakedWear - exact.wear));
        count++;
      }
    // A texel is about 5 units, several times finer than any worn edge; dry grass may shift only
    // in a few places beside cliffs and the river, where moisture inputs are interpolated over
    // about 40 units.
    expect(wear).toBeLessThan(0.15);
    expect(sum / count).toBeLessThan(0.005);
    expect(off / count).toBeLessThan(0.01);
  });

  it('marks every place a ramp can wear the ground, and little else', () => {
    let inside = 0,
      count = 0;
    for (let x = 13; x < orkhon.worldSize; x += 29)
      for (let z = 7; z < orkhon.worldSize; z += 31) {
        const near = sampleGroundMask(mask, orkhon.worldSize, x, z)[2];
        if (orkhonRampWear(ground.ramps!, x - C, z - C).wear > 0) expect(near, `${x},${z}`).toBe(1);
        inside += near > 0 ? 1 : 0;
        count++;
      }
    // Eight ramps' neighbourhoods are under a tenth of the battlefield.
    expect(inside / count).toBeLessThan(0.1);
  });

  it('draws trail edges that change within a mesh cell instead of along its triangles', () => {
    // Walk across the camp-to-bridge trail (along z = camp + 0) in 2-unit steps: the wear falls
    // from full to none over about 28 units, less than one 32-unit mesh cell.
    const profile = Array.from(
      { length: 30 },
      (_, i) => sampleGroundMask(mask, orkhon.worldSize, C + 700, C + i * 2)[0],
    );
    expect(profile[0]).toBeGreaterThan(0.85);
    expect(profile[29]).toBeLessThan(0.02);
    const partial = profile.filter((value) => value > 0.05 && value < 0.85);
    expect(partial.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < profile.length; i++)
      expect(profile[i]!).toBeLessThanOrEqual(profile[i - 1]! + 1e-9);
  });
});

describe('terrain shader programs', () => {
  it('leaves the generated places’ program text exactly as it was', () => {
    // SHA-256 of the generated-place code before Orkhon moved to its own program. Even dead-code
    // edits change how the GPU compiler rounds a few pixels: change it only on purpose.
    expect(
      createHash('sha256')
        .update(TERRAIN_SAMPLING + '\u0000' + TERRAIN_COLOR)
        .digest('hex'),
    ).toBe('db735031322cf636704e396a2b0d182822959348e0b4043064038d75d032e82c');
  });

  it('adds Orkhon code only to Orkhon programs', () => {
    const generated = terrainShaderSource(undefined);
    expect(generated).toEqual({ sampling: TERRAIN_SAMPLING, color: TERRAIN_COLOR });
    for (const name of ['ORKHON_RAMPS', 'groundMask', 'orkhonWeights'])
      expect(generated.sampling + generated.color).not.toContain(name);
    const authored = terrainShaderSource({ ramps: 8 });
    expect(authored.sampling).toContain('#define ORKHON_RAMPS 8');
    expect(authored.sampling).toContain(ORKHON_SAMPLING);
    expect(authored.sampling).not.toContain(TERRAIN_SAMPLING);
    expect(authored.color).toBe(ORKHON_COLOR);
    expect(terrainShaderSource({ ramps: 0 }).sampling).toContain('#define ORKHON_RAMPS 1');
  });

  it('gives only Orkhon a scene ground plan', () => {
    for (const id of Object.keys(LANDSCAPES) as (keyof typeof LANDSCAPES)[]) {
      let region;
      try {
        region = composedRegion(id);
      } catch {
        continue;
      }
      expect(Boolean(region.scene.ground), id).toBe(id === 'orkhon-valley');
    }
  });
});
