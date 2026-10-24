import { coherentNoise } from '../terrain/noise';
import type { ComposedTerrain } from './ComposedTerrain';
import type { WorldGeometry } from './mountainGeometry';

export interface CliffAnchor {
  x: number;
  z: number;
  bottom: number;
  top: number;
}
export const CLIFF_RELIEF = 8;
const BANDS = [0, 0.24, 0.5, 0.76, 1] as const;

/** A shallow broken face stays inside the conservative collision clearance. Top and foot never move. */
export function appendCliffFace(
  geometry: WorldGeometry,
  terrain: ComposedTerrain,
  a: CliffAnchor,
  b: CliffAnchor,
  layer: number,
): void {
  const point = (anchor: CliffAnchor, t: number) => {
    const normal = terrain.cliffNormal(anchor.x, anchor.z, layer);
    const span = anchor.top - anchor.bottom;
    const offset = (fraction: number) => {
      if (fraction <= 0 || fraction >= 1) return 0;
      const h = anchor.bottom + span * fraction;
      const joint = coherentNoise(
        (anchor.x + h * 0.4) / 95,
        anchor.z / 110,
        terrain.seed + layer * 151 + 701,
      );
      const ledge = Math.max(
        0,
        coherentNoise(anchor.x / 210, anchor.z / 170, terrain.seed + layer * 17 + 709) - 0.55,
      );
      return Math.min(
        CLIFF_RELIEF,
        Math.max(
          0,
          Math.sin(fraction * Math.PI) * (2 + joint * 5) +
            ledge * 8 * Math.max(0, 1 - Math.abs(fraction - 0.5) * 8),
        ),
      );
    };
    const out = offset(t);
    const dy = span > 1 ? -(offset(t + 0.002) - offset(t - 0.002)) / (span * 0.004) : 0;
    const length = Math.hypot(1, dy);
    return {
      position: [anchor.x + normal[0] * out, anchor.bottom + span * t, anchor.z + normal[2] * out],
      normal: [normal[0] / length, dy / length, normal[2] / length],
    };
  };
  for (let band = 0; band < BANDS.length - 1; band++) {
    const low = BANDS[band]!,
      high = BANDS[band + 1]!;
    for (const triangle of [
      [
        [a, low],
        [a, high],
        [b, high],
      ],
      [
        [a, low],
        [b, high],
        [b, low],
      ],
    ] as const) {
      const points = triangle.map(([anchor, t]) => ({ ...point(anchor, t), t }));
      const [p, q, r] = points;
      const u = q!.position.map((n, i) => n - p!.position[i]!);
      const v = r!.position.map((n, i) => n - p!.position[i]!);
      const n = p!.normal;
      if (
        (u[1]! * v[2]! - u[2]! * v[1]!) * n[0]! +
          (u[2]! * v[0]! - u[0]! * v[2]!) * n[1]! +
          (u[0]! * v[1]! - u[1]! * v[0]!) * n[2]! <
        0
      )
        [points[1], points[2]] = [points[2]!, points[1]!];
      for (const p of points) {
        geometry.positions.push(...p.position);
        geometry.normals.push(...p.normal);
        geometry.weights.push(0, 0, 1, 0, 0, 0, 0);
        geometry.occlusion.push(0.86 + Math.min(1, p.t * 3) * 0.14);
      }
    }
  }
}
