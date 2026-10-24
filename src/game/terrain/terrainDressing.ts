import type { MountainTerrain } from './MountainTerrain';
import { terrainSeed } from './noise';
import type { TerrainChunk, TerrainDressingKind, TerrainPoint } from './types';

export interface TerrainDressing extends TerrainPoint {
  kind: TerrainDressingKind;
  scale: number;
}

/** Deterministic small clusters selected by the shelf, snow line and uphill cliff, never uniform scatter. */
export function terrainDressing(
  terrain: MountainTerrain,
  chunk: TerrainChunk,
): readonly TerrainDressing[] {
  const props: TerrainDressing[] = [];
  for (const cell of chunk.cells) {
    if (props.length >= 9) break;
    const seed = terrainSeed(`${terrain.region.seed}:${cell.column}:${cell.row}`);
    const x = cell.sample.x + ((seed & 255) / 255 - 0.5) * 36;
    const y = cell.sample.y + (((seed >>> 8) & 255) / 255 - 0.5) * 36;
    if (
      x < chunk.x ||
      y < chunk.y ||
      x >= chunk.x + chunk.width ||
      y >= chunk.y + chunk.height ||
      terrain.protection(x, y) > 0.05
    )
      continue;
    const sample = terrain.sample(x, y);
    if (sample.slope > 0.65 || sample.weights[4] > 0.45) continue;
    const higher = [
      [-96, 0],
      [96, 0],
      [0, -96],
      [0, 96],
    ].some(([dx, dy]) => terrain.height(x + dx!, y + dy!) - sample.elevation > 0.09);
    const chance = ((seed >>> 16) & 255) / 255;
    const kind: TerrainDressing['kind'] | undefined =
      higher && terrain.terraceStrength(x, y) > 0.5 && chance < 0.7
        ? 'rubble'
        : sample.landform === 'shelf' && sample.level > 0 && sample.level < 3 && chance < 0.16
          ? 'scrub'
          : sample.level < 2 && sample.slope < 0.2 && sample.weights[4] < 0.1 && chance < 0.035
            ? 'conifer'
            : undefined;
    if (!kind) continue;
    const count = kind === 'conifer' ? 1 : 2 + (seed % 3);
    for (let i = 0; i < count && props.length < 9; i++) {
      const px = x + (i - (count - 1) / 2) * 13;
      const py = y + Math.sin(i * 2.3 + seed) * 9;
      if (
        px < chunk.x ||
        px >= chunk.x + chunk.width ||
        py < chunk.y ||
        py >= chunk.y + chunk.height ||
        terrain.protection(px, py) > 0.05
      )
        continue;
      const placed = terrain.sample(px, py);
      if (
        placed.slope > 0.7 ||
        (kind === 'scrub' && placed.landform !== 'shelf') ||
        (kind === 'conifer' && (placed.level >= 2 || placed.weights[4] >= 0.1))
      )
        continue;
      if (
        kind === 'rubble' &&
        ![64, 96, 128].some((distance) =>
          [
            [-distance, 0],
            [distance, 0],
            [0, -distance],
            [0, distance],
          ].some(([dx, dy]) => terrain.height(px + dx!, py + dy!) - placed.elevation > 0.08),
        )
      )
        continue;
      props.push({
        x: px,
        y: py,
        kind,
        scale: 0.8 + ((seed + i * 13) % 100) / 250,
      });
    }
  }
  return props;
}
