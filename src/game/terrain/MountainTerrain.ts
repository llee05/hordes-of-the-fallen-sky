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
  depression = 0,
): MaterialWeights {
  const { heights, materials } = region.biome.terraces;
  let low = 0;
  while (low < heights.length - 2 && elevation > heights[low + 1]!) low++;
  const blend = smoothstep(heights[low]!, heights[low + 1]!, elevation);
  const weights = materials[low]!.map((value, i) => mix(value, materials[low + 1]![i]!, blend));
  const snow = depression * smoothstep(0.4, 0.72, elevation) * 0.4;
  const rock = smoothstep(0.8, 2.8, slope) * (1 - weights[4]! * 0.85) * 0.65;
  return weights.map(
    (weight, i) => (weight * (1 - snow) + (i === 4 ? snow : 0)) * (1 - rock) + (i === 2 ? rock : 0),
  ) as unknown as MaterialWeights;
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
    const { heights, thresholds, materials, transition } = region.biome.terraces;
    if (
      heights.length < 4 ||
      heights.length !== thresholds.length + 1 ||
      materials.length !== heights.length ||
      heights.some((h, i) => !Number.isFinite(h) || (i > 0 && h <= heights[i - 1]!)) ||
      thresholds.some(
        (h, i) => !Number.isFinite(h) || (i > 0 && h - thresholds[i - 1]! <= transition * 2),
      ) ||
      transition <= 0 ||
      materials.some((weights) => Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 0.000001)
    )
      throw new Error(
        'Mountain terraces require ordered height levels, non-overlapping transitions, and normalized materials',
      );
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

  ravineCenter(y: number): number {
    return this.worldSize / 2 - 720 + Math.sin((y - this.worldSize / 2) / 900) * 360;
  }

  rawHeight(x: number, y: number): number {
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
    const center = this.worldSize / 2;
    const north = center - 1300 + Math.sin(wx / 860) * 260;
    const south = center + 1300 + Math.sin(wx / 1030 + 1.5) * 340;
    const distanceToRidge = Math.min(Math.abs(wy - north), Math.abs(wy - south));
    const spine = Math.exp(-Math.pow(distanceToRidge / 650, 2));
    let height = clamp01(0.16 + broad * 0.17 + ridges * 0.12 + spine * (0.47 + broad * 0.18));
    const plateau = biome.plateau;
    const flatten =
      (1 - smoothstep(plateau.width * 0.4, plateau.width, Math.abs(height - plateau.elevation))) *
      smoothstep(0.3, 0.7, coherentNoise(wx / 2100, wy / 2100, seed + 31));
    height = mix(
      height,
      plateau.elevation + (height - plateau.elevation) * (1 - plateau.strength),
      flatten,
    );
    const crossPass = this.ravineCenter(y);
    const distance = Math.min(Math.abs(y - this.passCenter(x)), Math.abs(x - crossPass) * 1.25);
    const carve =
      1 - smoothstep(biome.pass.halfWidth, biome.pass.halfWidth + biome.pass.shoulder, distance);
    height = mix(height, Math.min(height, biome.valleyElevation), carve);
    return mix(height, biome.valleyElevation, this.protection(x, y));
  }

  /** Wide climbing ramps interrupt the tier walls and connect shelves to the valley network. */
  terraceStrength(x: number, y: number): number {
    const { rampWidth } = this.region.biome.terraces;
    const center = this.worldSize / 2;
    const a = center - 1200 + Math.sin(y / 700) * 520;
    const b = center + 1200 + Math.sin(y / 850 + 1) * 460;
    const distance = Math.min(Math.abs(x - a), Math.abs(x - b));
    return smoothstep(rampWidth, rampWidth + 160, distance) * (1 - this.protection(x, y));
  }

  height(x: number, y: number): number {
    const raw = this.rawHeight(x, y);
    const { heights, thresholds, transition } = this.region.biome.terraces;
    let stepped = heights[0]!;
    for (let i = 0; i < thresholds.length; i++)
      stepped +=
        (heights[i + 1]! - heights[i]!) *
        smoothstep(thresholds[i]! - transition, thresholds[i]! + transition, raw);
    return mix(raw, stepped, this.terraceStrength(x, y));
  }

  sample(x: number, y: number): TerrainSample {
    const step = this.cellSize / 2;
    const elevation = this.height(x, y);
    const rawElevation = this.rawHeight(x, y);
    const { thresholds, transition } = this.region.biome.terraces;
    const level = thresholds.filter((threshold) => rawElevation >= threshold).length;
    const cliff =
      Math.max(
        ...thresholds.map(
          (threshold) =>
            1 - smoothstep(transition * 0.55, transition, Math.abs(rawElevation - threshold)),
        ),
      ) * this.terraceStrength(x, y);
    const radius = 96;
    const average =
      (this.height(x - radius, y) +
        this.height(x + radius, y) +
        this.height(x, y - radius) +
        this.height(x, y + radius)) /
      4;
    const depression = clamp01((average - elevation) / 0.06);
    const dx =
      ((this.height(x + step, y) - this.height(x - step, y)) * this.region.biome.heightScale) /
      (step * 2);
    const dy =
      ((this.height(x, y + step) - this.height(x, y - step)) * this.region.biome.heightScale) /
      (step * 2);
    const slope = Math.hypot(dx, dy);
    const diffuse = Math.max(0, (dx * 0.48 + dy * 0.57 + 0.67) / Math.hypot(dx, dy, 1));
    const protectedGround = this.protection(x, y);
    const weights = terrainWeights(elevation, slope, this.region, depression).map(
      (weight, i) => weight * (1 - protectedGround) + (i === 0 ? protectedGround : 0),
    ) as unknown as MaterialWeights;
    return {
      x,
      y,
      rawElevation,
      level,
      depression,
      cliff,
      landform:
        protectedGround > 0.8
          ? 'basin'
          : cliff > 0.4
            ? 'cliff'
            : rawElevation < 0.24
              ? Math.abs(y - this.passCenter(x)) > this.region.biome.pass.halfWidth &&
                Math.abs(x - this.ravineCenter(y)) < this.region.biome.pass.halfWidth
                ? 'ravine'
                : 'pass'
              : depression > 0.3 && level < 2
                ? 'ravine'
                : level >= 3
                  ? 'summit'
                  : slope < 0.3
                    ? 'shelf'
                    : 'ridge',
      elevation,
      dx,
      dy,
      slope,
      shade: 0.48 + diffuse * 0.52,
      weights,
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

  /** Shallow water remains traversable; navigation can prefer dry ground. */
  waterDepth(_x: number, _y: number): number {
    return 0;
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
