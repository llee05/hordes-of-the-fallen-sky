import type { TerrainLayerGeometry } from './terrainSurface';
import type { TerrainPoint } from './types';

export interface PaintedVertex extends TerrainPoint {
  color: number;
  alpha: number;
}

function interpolate(a: PaintedVertex, b: PaintedVertex, t: number): PaintedVertex {
  const channel = (shift: number) =>
    Math.round(((a.color >>> shift) & 255) * (1 - t) + ((b.color >>> shift) & 255) * t);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    alpha: a.alpha + (b.alpha - a.alpha) * t,
    color: (channel(16) << 16) | (channel(8) << 8) | channel(0),
  };
}

function clip(
  polygon: readonly PaintedVertex[],
  axis: 'x' | 'y',
  boundary: number,
  greater: boolean,
): PaintedVertex[] {
  const result: PaintedVertex[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const insideA = greater ? a[axis] >= boundary : a[axis] <= boundary;
    const insideB = greater ? b[axis] >= boundary : b[axis] <= boundary;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const point = interpolate(a, b, (boundary - a[axis]) / (b[axis] - a[axis]));
      point[axis] = boundary;
      result.push(point);
    }
  }
  return result;
}

/** Clip a convex face at texture wraps, preserving world registration and interpolated tint/alpha. */
export function appendTerrainPolygon(
  geometry: Omit<TerrainLayerGeometry, 'material'>,
  polygon: readonly PaintedVertex[],
  origin: TerrainPoint,
  repeatX: number,
  repeatY: number,
): void {
  const minX = Math.floor(Math.min(...polygon.map((point) => point.x)) / repeatX);
  const maxX = Math.floor(Math.max(...polygon.map((point) => point.x)) / repeatX);
  const minY = Math.floor(Math.min(...polygon.map((point) => point.y)) / repeatY);
  const maxY = Math.floor(Math.max(...polygon.map((point) => point.y)) / repeatY);
  for (let row = minY; row <= maxY; row++)
    for (let column = minX; column <= maxX; column++) {
      const x = column * repeatX;
      const y = row * repeatY;
      let clipped = clip(polygon, 'x', x, true);
      clipped = clip(clipped, 'x', x + repeatX, false);
      clipped = clip(clipped, 'y', y, true);
      clipped = clip(clipped, 'y', y + repeatY, false);
      if (clipped.length < 3) continue;
      for (let i = 1; i < clipped.length - 1; i++) {
        const vertices = [clipped[0]!, clipped[i]!, clipped[i + 1]!];
        const [a, b, c] = vertices;
        if (Math.abs((b!.x - a!.x) * (c!.y - a!.y) - (b!.y - a!.y) * (c!.x - a!.x)) < 0.000001)
          continue;
        for (const point of vertices) {
          geometry.indices.push(geometry.alphas.length);
          geometry.vertices.push(point.x - origin.x, -(point.y - origin.y));
          geometry.uvs.push((point.x - x) / repeatX, (point.y - y) / repeatY);
          geometry.colors.push(point.color);
          geometry.alphas.push(point.alpha);
        }
      }
    }
}
