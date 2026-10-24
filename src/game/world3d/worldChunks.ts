import type { TerrainBounds } from '../terrain/types';

export function worldChunkBounds(
  column: number,
  row: number,
  worldSize: number,
  chunkSize: number,
): TerrainBounds {
  const count = Math.ceil(worldSize / chunkSize);
  const start = (index: number): number =>
    index < count ? index * chunkSize : worldSize + (index - count) * chunkSize;
  const span = (index: number): number =>
    index === count - 1 ? worldSize - index * chunkSize : chunkSize;
  return { x: start(column), y: start(row), width: span(column), height: span(row) };
}

/** Two rows of scenery beyond the physical world keep border mountains from ending in empty space. */
export function visibleWorldChunks(
  view: TerrainBounds,
  worldSize: number,
  chunkSize: number,
): { column: number; row: number }[] {
  const count = Math.ceil(worldSize / chunkSize);
  const result = [];
  for (let row = -2; row < count + 2; row++)
    for (let column = -2; column < count + 2; column++) {
      const bounds = worldChunkBounds(column, row, worldSize, chunkSize);
      if (
        bounds.x + bounds.width >= view.x - chunkSize &&
        bounds.x <= view.x + view.width + chunkSize &&
        bounds.y + bounds.height >= view.y - chunkSize &&
        bounds.y <= view.y + view.height + chunkSize
      )
        result.push({ column, row });
    }
  return result;
}
