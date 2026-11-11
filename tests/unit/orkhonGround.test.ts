import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { composedRegion } from '../../src/game/data/worldRegions';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import {
  bakeOrkhonGroundMask,
  ORKHON_GROUND_MASK,
  orkhonGroundWeights,
  orkhonRampUniforms,
  orkhonRampWear,
  sampleGroundMask,
  trailSegments,
} from '../../src/game/world3d/orkhonGround';
import {
  authoredMaterialWeights,
  habitatFields,
  pathDistance,
  terrainHabitat,
} from '../../src/game/world3d/terrainHabitat';
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

/** Exact per-point inputs, as the per-vertex rule computes them. */
function exact(x: number, z: number, normalY: number) {
  const y = orkhon.height(x, z) * 1000;
  const habitat = terrainHabitat(orkhon, x, z, y, normalY);
  return {
    y,
    habitat,
    point: {
      x,
      z,
      y,
      normalY,
      cliffFoot: habitat.cliffFoot,
      trail: Math.min(ORKHON_GROUND_MASK.trailRange, pathDistance(ground.paths, x - C, z - C)),
      ...habitatFields(orkhon, x, z),
    },
  };
}

describe('Orkhon per-pixel ground masks', () => {
  it('reproduces the per-vertex material rule at any point', () => {
    let checked = 0;
    for (let x = 140; x < orkhon.worldSize; x += 173)
      for (let z = 90; z < orkhon.worldSize; z += 191)
        for (const normalY of [1, 0.8, 0.45]) {
          const { y, habitat, point } = exact(x, z, normalY);
          const expected = authoredMaterialWeights(orkhon, y, normalY, habitat);
          const actual = orkhonGroundWeights(orkhon, point);
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

  it('bakes smooth fields the linear filter reproduces between texels', () => {
    expect(mask).toHaveLength(ORKHON_GROUND_MASK.size ** 2 * 4);
    let worst = { trail: 0, broad: 0, shore: 0 };
    for (let x = 31; x < orkhon.worldSize; x += 47)
      for (let z = 17; z < orkhon.worldSize; z += 53) {
        const { point } = exact(x, z, 1);
        const [trail, broad, shore] = sampleGroundMask(mask, orkhon.worldSize, x, z);
        worst = {
          trail: Math.max(
            worst.trail,
            Math.abs(trail * ORKHON_GROUND_MASK.trailRange - point.trail) *
              (point.trail < ORKHON_GROUND_MASK.trailRange - 6 ? 1 : 0),
          ),
          broad: Math.max(worst.broad, Math.abs(broad - point.broad)),
          shore: Math.max(worst.shore, Math.abs(shore - point.shore)),
        };
      }
    // A texel is about 5 units: the distance field is exact to a fraction of one, and the slow
    // fields to a few hundredths.
    expect(worst.trail).toBeLessThan(2);
    expect(worst.broad).toBeLessThan(0.01);
    expect(worst.shore).toBeLessThan(0.05);
  });

  it('marks every place a ramp can wear the ground, and little else', () => {
    let inside = 0;
    for (let x = 13; x < orkhon.worldSize; x += 29)
      for (let z = 7; z < orkhon.worldSize; z += 31) {
        const [, , , near] = sampleGroundMask(mask, orkhon.worldSize, x, z);
        const { wear } = orkhonRampWear(ground.ramps!, x - C, z - C);
        if (wear > 0) expect(near, `${x},${z}`).toBe(1);
        inside += near > 0 ? 1 : 0;
      }
    // Eight ramps' neighbourhoods are under a tenth of the battlefield.
    expect(
      inside / (Math.ceil(orkhon.worldSize / 29) * Math.ceil(orkhon.worldSize / 31)),
    ).toBeLessThan(0.1);
  });

  it('draws trail edges that change within a mesh cell instead of along its triangles', () => {
    // Walk across the camp-to-bridge trail (along z = camp + 0) in 2-unit steps: the wear falls
    // from full to none over about 28 units, less than one 32-unit mesh cell.
    const wear = (dz: number) => {
      const x = C + 700,
        z = C + dz;
      const [trail, broad, shore] = sampleGroundMask(mask, orkhon.worldSize, x, z);
      return orkhonGroundWeights(orkhon, {
        ...exact(x, z, 1).point,
        trail: trail * ORKHON_GROUND_MASK.trailRange,
        broad,
        shore,
      })[1];
    };
    const profile = Array.from({ length: 30 }, (_, i) => wear(i * 2));
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
