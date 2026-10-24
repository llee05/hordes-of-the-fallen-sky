import type { TerrainBounds, TerrainPoint } from './types';

export interface ContourSegment {
  a: TerrainPoint;
  b: TerrainPoint;
}

/** Marching squares in world space. Boundary crossings use the same ordered edge in either chunk. */
export function terrainContours(
  bounds: TerrainBounds,
  step: number,
  levels: readonly number[],
  height: (x: number, y: number) => number,
): readonly (ContourSegment & { elevation: number })[] {
  const columns = Math.ceil(bounds.width / step);
  const rows = Math.ceil(bounds.height / step);
  const points = Array.from({ length: rows + 1 }, (_, row) =>
    Array.from({ length: columns + 1 }, (_, column) => {
      const x = bounds.x + Math.min(bounds.width, column * step);
      const y = bounds.y + Math.min(bounds.height, row * step);
      return { x, y, height: height(x, y) };
    }),
  );
  const segments: (ContourSegment & { elevation: number })[] = [];
  for (const elevation of levels)
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const corners = [
          points[row]![column]!,
          points[row]![column + 1]!,
          points[row + 1]![column + 1]!,
          points[row + 1]![column]!,
        ];
        const crossings = new Map<number, TerrainPoint>();
        // Always interpolate left-to-right or top-to-bottom, even on the bottom/left edge.
        for (const [edge, start, end] of [
          [0, 0, 1],
          [1, 1, 2],
          [2, 3, 2],
          [3, 0, 3],
        ] as const) {
          const a = corners[start]!;
          const b = corners[end]!;
          if (a.height >= elevation === b.height >= elevation) continue;
          const t = (elevation - a.height) / (b.height - a.height);
          crossings.set(edge, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
        const add = (a: number, b: number) => {
          const start = crossings.get(a)!;
          const end = crossings.get(b)!;
          if (Math.hypot(start.x - end.x, start.y - end.y) > 0.000001)
            segments.push({ a: start, b: end, elevation });
        };
        if (crossings.size === 2) {
          const [a, b] = [...crossings.keys()];
          add(a!, b!);
        } else if (crossings.size === 4) {
          // Resolve saddle connectivity with the bilinear asymptotic decider.
          const values = corners.map((point) => point.height - elevation);
          const diagonal = values[0]! * values[2]! - values[1]! * values[3]!;
          if (diagonal >= 0) {
            add(0, 1);
            add(2, 3);
          } else {
            add(0, 3);
            add(1, 2);
          }
        }
      }
  return segments;
}
