import { GAME } from '../config';
import type { MountainTerrain } from './MountainTerrain';
import type { TerrainBounds, TerrainPoint } from './types';

export interface CliffBandVertex extends TerrainPoint {
  raw: number;
}
export interface CliffBand {
  tier: number;
  lower: number;
  upper: number;
  vertices: readonly CliffBandVertex[];
}

function clip(
  polygon: readonly CliffBandVertex[],
  boundary: number,
  above: boolean,
): CliffBandVertex[] {
  const result: CliffBandVertex[] = [];
  for (let i = 0; i < polygon.length; i++) {
    let a = polygon[i]!;
    let b = polygon[(i + 1) % polygon.length]!;
    const insideA = above ? a.raw >= boundary : a.raw <= boundary;
    const insideB = above ? b.raw >= boundary : b.raw <= boundary;
    if (insideA) result.push(a);
    if (insideA === insideB) continue;
    if (a.x > b.x || (a.x === b.x && a.y > b.y)) [a, b] = [b, a];
    const t = (boundary - a.raw) / (b.raw - a.raw);
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, raw: boundary });
  }
  return result;
}

/** Complete wall footprints between the lower and upper contour of each elevation transition. */
export function terrainCliffBands(
  terrain: MountainTerrain,
  bounds: TerrainBounds,
  height: (x: number, y: number) => number = (x, y) => terrain.rawHeight(x, y),
): readonly CliffBand[] {
  const step = GAME.terrain.surfaceStep;
  const columns = Math.ceil(bounds.width / step);
  const rows = Math.ceil(bounds.height / step);
  const points = Array.from({ length: rows + 1 }, (_, row) =>
    Array.from({ length: columns + 1 }, (_, column): CliffBandVertex => {
      const x = bounds.x + Math.min(bounds.width, column * step);
      const y = bounds.y + Math.min(bounds.height, row * step);
      return { x, y, raw: height(x, y) };
    }),
  );
  const { thresholds, transition } = terrain.region.biome.terraces;
  const bands: CliffBand[] = [];
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const a = points[row]![column]!;
      const b = points[row]![column + 1]!;
      const c = points[row + 1]![column]!;
      const d = points[row + 1]![column + 1]!;
      for (const triangle of [
        [a, c, b],
        [c, d, b],
      ]) {
        const min = Math.min(...triangle.map((point) => point.raw));
        const max = Math.max(...triangle.map((point) => point.raw));
        for (let tier = 0; tier < thresholds.length; tier++) {
          const lower = thresholds[tier]! - transition;
          const upper = thresholds[tier]! + transition;
          if (max <= lower || min >= upper) continue;
          const vertices = clip(clip(triangle, lower, true), upper, false);
          if (vertices.length >= 3) bands.push({ tier, lower, upper, vertices });
        }
      }
    }
  return bands;
}
