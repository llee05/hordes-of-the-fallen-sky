import { GAME } from '../config';
import type { MountainTerrain } from './MountainTerrain';
import { smoothstep } from './noise';
import { terrainContours } from './terrainContours';
import { shadedColor, type TerrainLayerGeometry } from './terrainSurface';
import type { TerrainArt, TerrainChunk, TerrainPoint } from './types';

export interface CliffLayerGeometry extends Omit<TerrainLayerGeometry, 'material'> {
  part: 'shadow' | 'face' | 'rim';
}

interface ReliefPoint extends TerrainPoint {
  toe: TerrainPoint;
  shadow: TerrainPoint;
  rim: TerrainPoint;
  strength: number;
  shade: number;
}

/** Contour ledges remain attached to the heightfield, independently of square collision cells. */
export function terrainRelief(
  terrain: MountainTerrain,
  chunk: TerrainChunk,
  art: TerrainArt,
): readonly CliffLayerGeometry[] {
  const style = GAME.terrain.relief;
  const levels: number[] = [];
  for (let level: number = style.firstElevation; level < 1; level += style.elevationInterval)
    levels.push(level);
  const contours = terrainContours(chunk, GAME.terrain.surfaceStep, levels, (x, y) =>
    terrain.height(x, y),
  );
  const layers = (['shadow', 'face', 'rim'] as const).map((part): CliffLayerGeometry => ({
    part,
    texture: '__WHITE',
    vertices: [],
    uvs: [],
    indices: [],
    colors: [],
    alphas: [],
  }));
  const cache = new Map<string, ReliefPoint>();
  const pointAt = (point: TerrainPoint): ReliefPoint => {
    const key = `${point.x},${point.y}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const sample = terrain.sample(point.x, point.y);
    const nx = -sample.dx / Math.max(0.001, sample.slope);
    const ny = -sample.dy / Math.max(0.001, sample.slope);
    // Back-facing slopes are described by surface lighting, front-facing slopes by ledges.
    const strength =
      smoothstep(style.minSlope, style.fullSlope, sample.slope) *
      smoothstep(-0.55, 0.35, ny + nx * 0.2);
    const depth = style.faceDepth * strength;
    const toe = { x: point.x + nx * depth * 0.3, y: point.y + depth * (0.75 + ny * 0.25) };
    const result: ReliefPoint = {
      ...point,
      toe,
      shadow: { x: toe.x + style.shadowReach * 0.64, y: toe.y + style.shadowReach * 0.77 },
      rim: { x: point.x - nx * 2.5, y: point.y - ny * 2.5 },
      strength,
      shade: 0.72 + Math.max(0, -nx * 0.48 - ny * 0.57) * 0.28,
    };
    cache.set(key, result);
    return result;
  };
  const quad = (
    layer: CliffLayerGeometry,
    points: readonly TerrainPoint[],
    colors: readonly number[],
    alphas: readonly number[],
  ) => {
    const base = layer.vertices.length / 2;
    for (let i = 0; i < 4; i++) {
      layer.vertices.push(
        points[i]!.x - chunk.x - chunk.width / 2,
        -(points[i]!.y - chunk.y - chunk.height / 2),
      );
      layer.uvs.push(0.5, 0.5);
      layer.colors.push(colors[i]!);
      layer.alphas.push(alphas[i]!);
    }
    layer.indices.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
  };
  for (const contour of contours) {
    const a = pointAt(contour.a);
    const b = pointAt(contour.b);
    if (Math.max(a.strength, b.strength) < 0.015) continue;
    quad(
      layers[0]!,
      [a.toe, b.toe, a.shadow, b.shadow],
      [0x30392b, 0x30392b, 0x30392b, 0x30392b],
      [a.strength * 0.24, b.strength * 0.24, 0, 0],
    );
    quad(
      layers[1]!,
      [a, b, a.toe, b.toe],
      [
        shadedColor(art.cliff.color, a.shade),
        shadedColor(art.cliff.color, b.shade),
        shadedColor(art.cliff.color, a.shade * 0.74),
        shadedColor(art.cliff.color, b.shade * 0.74),
      ],
      [a.strength * 0.9, b.strength * 0.9, a.strength * 0.75, b.strength * 0.75],
    );
    quad(
      layers[2]!,
      [a.rim, b.rim, a, b],
      [art.cliff.rim, art.cliff.rim, art.cliff.rim, art.cliff.rim],
      [0, 0, a.strength * 0.25, b.strength * 0.25],
    );
  }
  return layers.filter((layer) => layer.indices.length);
}
