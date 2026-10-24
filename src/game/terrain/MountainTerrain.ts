import { GAME } from '../config';
import { clamp01, coherentNoise, fractalNoise, mix, smoothstep, terrainSeed } from './noise';
import type {
  MaterialWeights,
  MountainRegion,
  TerrainBounds,
  TerrainCell,
  TerrainChunk,
  TerrainSample,
} from './types';

export function terrainWeights(
  elevation: number,
  slope: number,
  region: MountainRegion,
): MaterialWeights {
  const bands = region.biome.bands.map(([low, high]) => smoothstep(low, high, elevation));
  const [soil = 0, stone = 0, tundra = 0, snow = 0] = bands;
  const rock = smoothstep(0.32, 1.15, slope) * (1 - snow * 0.8);
  return [
    (1 - soil) * (1 - rock),
    (soil - stone) * (1 - rock),
    (stone - tundra) * (1 - rock) + rock,
    (tundra - snow) * (1 - rock),
    snow * (1 - rock),
  ];
}

/** Pure global-coordinate sampling. No random stream, artwork, Phaser, or simulation clock. */
export class MountainTerrain {
  readonly seed: number;
  readonly cellSize = GAME.terrain.cellSize;
  readonly chunkSize = GAME.terrain.chunkSize;
  private readonly chunks = new Map<string, TerrainChunk>();

  constructor(
    readonly region: MountainRegion,
    readonly worldSize: number = GAME.worldSize,
  ) {
    this.seed = terrainSeed(region.seed);
  }

  get cachedChunks(): number {
    return this.chunks.size;
  }

  /** The protected corridor is wider than the camp barrier and every formation. */
  protection(x: number, y: number): number {
    const { biome } = this.region;
    const cx = x - this.worldSize / 2;
    const cy = y - this.worldSize / 2;
    const camp = 1 - smoothstep(biome.campRadius, biome.campRadius + 320, Math.hypot(cx, cy));
    const roadX = Math.max(-biome.campRadius, Math.min(biome.caravan.length, cx));
    const roadDistance = Math.hypot(
      cx - roadX,
      Math.max(0, Math.abs(cy) - biome.caravan.halfWidth),
    );
    return Math.max(camp, 1 - smoothstep(0, biome.caravan.shoulder, roadDistance));
  }

  passCenter(x: number): number {
    const { pass } = this.region.biome;
    return this.worldSize / 2 + Math.sin((x - this.worldSize / 2) / pass.wavelength) * pass.bend;
  }

  height(x: number, y: number): number {
    const { biome } = this.region;
    const seed = this.seed;
    const wx = x + (coherentNoise(x / 1700, y / 1700, seed + 3) - 0.5) * biome.warp;
    const wy = y + (coherentNoise(x / 1700, y / 1700, seed + 7) - 0.5) * biome.warp;
    const broad = fractalNoise(wx / 2600, wy / 2300, seed + 11);
    const ridges = fractalNoise(
      wx / biome.rangeScale,
      wy / (biome.rangeScale * biome.rangeStretch),
      seed + 23,
      true,
    );
    let height = clamp01(0.08 + broad * 0.38 + ridges * 0.68);
    const plateau = biome.plateau;
    const flatten =
      (1 - smoothstep(plateau.width * 0.4, plateau.width, Math.abs(height - plateau.elevation))) *
      smoothstep(0.3, 0.7, coherentNoise(wx / 2100, wy / 2100, seed + 31));
    height = mix(
      height,
      plateau.elevation + (height - plateau.elevation) * (1 - plateau.strength),
      flatten,
    );
    const crossPass = this.worldSize / 2 - 720 + Math.sin((y - this.worldSize / 2) / 900) * 360;
    const distance = Math.min(Math.abs(y - this.passCenter(x)), Math.abs(x - crossPass) * 1.25);
    const carve =
      1 - smoothstep(biome.pass.halfWidth, biome.pass.halfWidth + biome.pass.shoulder, distance);
    height = mix(height, Math.min(height, biome.valleyElevation), carve);
    return mix(height, biome.valleyElevation, this.protection(x, y));
  }

  sample(x: number, y: number): TerrainSample {
    const step = this.cellSize / 2;
    const elevation = this.height(x, y);
    const dx =
      ((this.height(x + step, y) - this.height(x - step, y)) * this.region.biome.heightScale) /
      (step * 2);
    const dy =
      ((this.height(x, y + step) - this.height(x, y - step)) * this.region.biome.heightScale) /
      (step * 2);
    const slope = Math.hypot(dx, dy);
    const diffuse = Math.max(0, (dx * 0.48 + dy * 0.57 + 0.67) / Math.hypot(dx, dy, 1));
    return {
      x,
      y,
      elevation,
      dx,
      dy,
      slope,
      shade: 0.48 + diffuse * 0.52,
      weights: terrainWeights(elevation, slope, this.region),
    };
  }

  cell(column: number, row: number): TerrainCell {
    const x = column * this.cellSize;
    const y = row * this.cellSize;
    const width = Math.min(this.cellSize, this.worldSize - x);
    const height = Math.min(this.cellSize, this.worldSize - y);
    const sample = this.sample(x + width / 2, y + height / 2);
    return {
      x,
      y,
      width,
      height,
      column,
      row,
      sample,
      blocked: sample.slope >= this.region.biome.cliffSlope,
    };
  }

  isCliff(column: number, row: number): boolean {
    if (
      column < 0 ||
      row < 0 ||
      column * this.cellSize >= this.worldSize ||
      row * this.cellSize >= this.worldSize
    )
      return false;
    return this.cell(column, row).blocked;
  }

  getChunk(column: number, row: number): TerrainChunk {
    if (
      !Number.isInteger(column) ||
      !Number.isInteger(row) ||
      column < 0 ||
      row < 0 ||
      column * this.chunkSize >= this.worldSize ||
      row * this.chunkSize >= this.worldSize
    )
      throw new RangeError('Chunk outside terrain bounds');
    const key = `${column},${row}`;
    const cached = this.chunks.get(key);
    if (cached) {
      this.chunks.delete(key);
      this.chunks.set(key, cached);
      return cached;
    }
    const x = column * this.chunkSize;
    const y = row * this.chunkSize;
    const width = Math.min(this.chunkSize, this.worldSize - x);
    const height = Math.min(this.chunkSize, this.worldSize - y);
    const columns = Math.ceil(width / this.cellSize);
    const rows = Math.ceil(height / this.cellSize);
    const vertices: TerrainSample[] = [];
    const cells: TerrainCell[] = [];
    const cliffs: TerrainChunk['cliffs'][number][] = [];
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= columns; i++) {
        vertices.push(
          this.sample(
            x + Math.min(width, i * this.cellSize),
            y + Math.min(height, j * this.cellSize),
          ),
        );
      }
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < columns; i++) {
        const cell = this.cell(x / this.cellSize + i, y / this.cellSize + j);
        cells.push(cell);
        if (!cell.blocked) continue;
        let mask = 0;
        for (const [dx, dy, bit] of [
          [0, -1, 1],
          [1, 0, 2],
          [0, 1, 4],
          [-1, 0, 8],
        ]) {
          if (!this.isCliff(cell.column + dx!, cell.row + dy!)) mask |= bit!;
        }
        if (mask)
          cliffs.push({
            x: cell.x,
            y: cell.y,
            width: cell.width,
            height: cell.height,
            mask,
            shade: cell.sample.shade,
          });
      }
    const chunk = { column, row, x, y, width, height, columns, rows, vertices, cells, cliffs };
    this.chunks.set(key, chunk);
    if (this.chunks.size > GAME.terrain.maxCachedChunks)
      this.chunks.delete(this.chunks.keys().next().value!);
    return chunk;
  }

  visibleChunks(view: TerrainBounds, margin = 1): readonly { column: number; row: number }[] {
    const last = Math.ceil(this.worldSize / this.chunkSize) - 1;
    const result = [];
    for (
      let row = Math.max(0, Math.floor(view.y / this.chunkSize) - margin);
      row <= Math.min(last, Math.floor((view.y + view.height) / this.chunkSize) + margin);
      row++
    ) {
      for (
        let column = Math.max(0, Math.floor(view.x / this.chunkSize) - margin);
        column <= Math.min(last, Math.floor((view.x + view.width) / this.chunkSize) + margin);
        column++
      )
        result.push({ column, row });
    }
    return result;
  }
}
