import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { composedRegion } from '../../src/game/data/worldRegions';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import {
  bakeOrkhonGroundMask,
  groundSurface,
  orkhonGroundFields,
  orkhonFlankAlong,
  orkhonGroundWeights,
  orkhonRampUniforms,
  orkhonSideProjection,
  sampleGroundMask,
  trailSegments,
} from '../../src/game/world3d/orkhonGround';
import {
  authoredMaterialWeights,
  rampWear,
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

  it('covers every trail and ramp; trails stop at the ramp feet', () => {
    const paths = ground.paths.reduce((sum, path) => sum + path.length - 1, 0);
    expect(trailSegments(orkhon)).toHaveLength(paths);
    const points = ground.paths.flat();
    for (const ramp of ground.ramps!) {
      expect(points).toContainEqual(ramp.foot);
      expect(points).not.toContainEqual(ramp.top);
    }
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
        if (rampWear(ground.ramps!, x - C, z - C) > 0) expect(near, `${x},${z}`).toBe(1);
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

describe('Orkhon ramps', () => {
  const frame = (ramp: NonNullable<typeof ground.ramps>[number]) => {
    const length = Math.hypot(ramp.top.x - ramp.foot.x, ramp.top.y - ramp.foot.y);
    const d = { x: (ramp.top.x - ramp.foot.x) / length, z: (ramp.top.y - ramp.foot.y) / length };
    /** Camp-relative point at fraction t of the ramp and lateral offset u (units). */
    const at = (t: number, u: number) => ({
      x: ramp.foot.x + d.x * t * length - d.z * u,
      z: ramp.foot.y + d.z * t * length + d.x * u,
    });
    return { length, d, at };
  };

  it('wears the ramp up to the head of the cut and not onto the plateau', () => {
    for (const ramp of ground.ramps!) {
      const { at } = frame(ramp);
      for (let t = 0.15; t <= 0.75; t += 0.05) {
        const p = at(t, 0);
        expect(rampWear([ramp], p.x, p.z)).toBe(1);
      }
      // The top (t = 1) is where the cut meets the plateau: nothing worn there or beyond, from
      // the ramp or a trail, across the ramp and its flanks.
      for (let t = 1; t <= 1.3; t += 0.02)
        for (let u = -(ramp.shoulder ?? ramp.halfWidth); u <= (ramp.shoulder ?? 0); u += 8) {
          const p = at(t, u);
          expect(rampWear([ramp], p.x, p.z), `${t},${u}`).toBe(0);
          const [wear] = sampleGroundMask(mask, orkhon.worldSize, p.x + C, p.z + C);
          expect(wear, `${t},${u}`).toBeLessThan(0.02);
        }
    }
  });

  it('frays the worn edges instead of ruling them straight', () => {
    for (const ramp of ground.ramps!) {
      const { at, length } = frame(ramp);
      // Where the wear crosses one half, on each side and at the head.
      const crossing = (point: (v: number) => { x: number; z: number }, from: number) => {
        let v = from;
        while (rampWear([ramp], point(v).x, point(v).z) >= 0.5) v += 1;
        return v;
      };
      const sides: number[] = [];
      for (let t = 0.2; t <= 0.7; t += 0.02)
        for (const sign of [-1, 1]) sides.push(crossing((v) => at(t, sign * v), 0));
      expect(Math.max(...sides) - Math.min(...sides)).toBeGreaterThan(12);
      const head: number[] = [];
      for (let u = -60; u <= 60; u += 6) head.push(crossing((v) => at(0.5 + v / length, u), 0));
      // A ruled end would cross within a unit everywhere.
      expect(Math.max(...head) - Math.min(...head)).toBeGreaterThan(4);
    }
  });

  it('runs flank bands along the ramp at their painted width, never mirrored', () => {
    for (const ramp of ground.ramps!) {
      const { at, d } = frame(ramp);
      const lateral = ((ramp.shoulder ?? ramp.halfWidth) + ramp.halfWidth) / 2;
      for (const sign of [-1, 1]) {
        // Outward normal of the flank on this side (embankment flanks face away from the ramp).
        const n = { x: -d.z * sign, z: d.x * sign };
        const values: number[] = [];
        for (let t = 0.05; t <= 0.95; t += 0.05) {
          const p = at(t, sign * lateral);
          values.push(orkhonFlankAlong(orkhon, p.x + C, p.z + C, n.x * 0.8, n.z * 0.8)!);
        }
        const step = 0.05 * frame(ramp).length;
        // The direction that plateau walls advance along, for this normal.
        const forward = -n.z * d.x + n.x * d.z >= 0 ? 1 : -1;
        for (let i = 1; i < values.length; i++)
          expect(values[i]! - values[i - 1]!).toBeCloseTo(forward * step, 6);
      }
    }
    expect(orkhonFlankAlong(orkhon, C, C, 0.6, 0)).toBeUndefined();
  });

  it('orients steep side projections like the top projection, never turned or mirrored', () => {
    for (const azimuth of [0.2, 1.4, 2.9, 3.8, 5.1])
      for (const degrees of [40, 60, 75]) {
        const slope = Math.tan((degrees * Math.PI) / 180);
        const uphill = [Math.cos(azimuth), Math.sin(azimuth)] as const;
        const scale = Math.hypot(slope, 1);
        const n = [(-slope * uphill[0]) / scale, 1 / scale, (-slope * uphill[1]) / scale] as const;
        const project = (dx: number, dz: number) => {
          const y = 150 + slope * (dx * uphill[0] + dz * uphill[1]);
          return orkhonSideProjection(400 + dx, y, 300 + dz, n);
        };
        const origin = project(0, 0);
        // Uphill: wherever a side projection carries weight, its height axis advances the same
        // way as the top projection's matching axis (x for x-facing, z for z-facing slopes).
        const up = project(uphill[0], uphill[1]);
        if (Math.abs(n[0]) > 0.3)
          expect(Math.sign(up.x[0] - origin.x[0])).toBe(Math.sign(uphill[0]));
        if (Math.abs(n[2]) > 0.3)
          expect(Math.sign(up.z[1] - origin.z[1])).toBe(Math.sign(uphill[1]));
        // The axis each shares with the top projection is copied unchanged.
        expect(up.x[1] - origin.x[1]).toBeCloseTo(uphill[1], 9);
        expect(up.z[0] - origin.z[0]).toBeCloseTo(uphill[0], 9);
      }
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
