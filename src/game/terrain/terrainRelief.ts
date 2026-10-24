import { GAME } from '../config';
import type { MountainTerrain } from './MountainTerrain';
import { clamp01, smoothstep } from './noise';
import { terrainCliffBands } from './terrainCliffBands';
import { terrainContours } from './terrainContours';
import { appendTerrainPolygon, type PaintedVertex } from './terrainPolygon';
import { shadedColor, type TerrainLayerGeometry } from './terrainSurface';
import type { TerrainArt, TerrainChunk, TerrainPoint } from './types';

export interface CliffLayerGeometry extends Omit<TerrainLayerGeometry, 'material'> {
  part: 'shadow' | 'ao' | 'face' | 'rim';
}

/** Tier walls cover the whole height transition, with a top lip and shadows below its foot. */
export function terrainRelief(
  terrain: MountainTerrain,
  chunk: TerrainChunk,
  art: TerrainArt,
  sizes: Readonly<Record<string, { width: number; height: number }>> = {},
): readonly CliffLayerGeometry[] {
  const { terraces, heightScale } = terrain.region.biome;
  const rawSamples = new Map<string, number>();
  const rawAt = (x: number, y: number): number => {
    const key = `${x},${y}`;
    let height = rawSamples.get(key);
    if (height === undefined) {
      height = terrain.rawHeight(x, y);
      rawSamples.set(key, height);
    }
    return height;
  };
  const layers = (['shadow', 'ao', 'face', 'rim'] as const).map((part): CliffLayerGeometry => ({
    part,
    texture: part === 'face' ? (art.materials.stone.texture ?? '__WHITE') : '__WHITE',
    vertices: [],
    uvs: [],
    indices: [],
    colors: [],
    alphas: [],
  }));
  const cache = new Map<string, { nx: number; ny: number; slope: number; ramp: number }>();
  const normalAt = (point: TerrainPoint) => {
    const key = `${point.x},${point.y}`;
    let normal = cache.get(key);
    if (!normal) {
      const dx = (rawAt(point.x + 16, point.y) - rawAt(point.x - 16, point.y)) / 32;
      const dy = (rawAt(point.x, point.y + 16) - rawAt(point.x, point.y - 16)) / 32;
      const slope = Math.max(0.000001, Math.hypot(dx, dy));
      normal = {
        nx: -dx / slope,
        ny: -dy / slope,
        slope: slope * heightScale,
        ramp: terrain.terraceStrength(point.x, point.y),
      };
      cache.set(key, normal);
    }
    return normal;
  };
  const strength = (point: TerrainPoint, tier: number) => {
    const normal = normalAt(point);
    const rise = terraces.heights[tier + 1]! - terraces.heights[tier]!;
    return normal.ramp * smoothstep(0.35, 1.5, (normal.slope * rise) / (terraces.transition * 2));
  };
  const append = (layer: CliffLayerGeometry, polygon: readonly PaintedVertex[]) => {
    const size = sizes[layer.texture] ?? { width: 1254, height: 1254 };
    const white = layer.texture === '__WHITE';
    appendTerrainPolygon(
      layer,
      polygon,
      { x: chunk.x + chunk.width / 2, y: chunk.y + chunk.height / 2 },
      white ? 1000000 : size.width * art.tileScale,
      white ? 1000000 : size.height * art.tileScale,
    );
  };
  const faceColor = art.materials.stone.texture
    ? (art.materials.stone.tint ?? 0xffffff)
    : art.cliff.color;
  for (const band of terrainCliffBands(terrain, chunk, rawAt)) {
    const polygon = band.vertices.map((point): PaintedVertex => {
      const normal = normalAt(point);
      const t = clamp01((point.raw - band.lower) / (band.upper - band.lower));
      const light = Math.max(0, -normal.nx * 0.64 - normal.ny * 0.77);
      const shade = (0.5 + light * 0.3) * (0.54 + t * 0.46);
      return { ...point, color: shadedColor(faceColor, shade), alpha: strength(point, band.tier) };
    });
    if (polygon.some((point) => point.alpha > 0.015)) append(layers[2]!, polygon);
  }
  const quads = (tier: number, level: number, top: boolean) => {
    const contours = terrainContours(chunk, GAME.terrain.surfaceStep, [level], (x, y) =>
      rawAt(x, y),
    );
    for (const { a, b } of contours) {
      const sa = strength(a, tier);
      const sb = strength(b, tier);
      if (Math.max(sa, sb) < 0.015) continue;
      const na = normalAt(a);
      const nb = normalAt(b);
      if (top) {
        append(layers[3]!, [
          { x: a.x - na.nx * 3, y: a.y - na.ny * 3, color: art.cliff.rim, alpha: 0 },
          { x: b.x - nb.nx * 3, y: b.y - nb.ny * 3, color: art.cliff.rim, alpha: 0 },
          { ...b, color: art.cliff.rim, alpha: sb * 0.3 },
          { ...a, color: art.cliff.rim, alpha: sa * 0.3 },
        ]);
      } else {
        // Ambient occlusion hugs every cliff foot; directional shadows fall to the lower right.
        append(layers[1]!, [
          { ...a, color: 0x202a28, alpha: sa * 0.55 },
          { ...b, color: 0x202a28, alpha: sb * 0.55 },
          { x: b.x + nb.nx * 14, y: b.y + nb.ny * 14, color: 0x202a28, alpha: 0 },
          { x: a.x + na.nx * 14, y: a.y + na.ny * 14, color: 0x202a28, alpha: 0 },
        ]);
        const reach = GAME.terrain.relief.shadowReach;
        append(layers[0]!, [
          { ...a, color: 0x30392b, alpha: sa * 0.3 },
          { ...b, color: 0x30392b, alpha: sb * 0.3 },
          { x: b.x + reach * 0.64, y: b.y + reach * 0.77, color: 0x30392b, alpha: 0 },
          { x: a.x + reach * 0.64, y: a.y + reach * 0.77, color: 0x30392b, alpha: 0 },
        ]);
      }
    }
  };
  for (let tier = 0; tier < terraces.thresholds.length; tier++) {
    quads(tier, terraces.thresholds[tier]! - terraces.transition, false);
    quads(tier, terraces.thresholds[tier]! + terraces.transition, true);
  }
  return layers.filter((layer) => layer.indices.length);
}
