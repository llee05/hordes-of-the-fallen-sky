export interface TerrainPoint {
  x: number;
  y: number;
}

export interface TerrainBounds extends TerrainPoint {
  width: number;
  height: number;
}

export const TERRAIN_MATERIALS = ['grassland', 'rocky-soil', 'stone', 'tundra', 'snow'] as const;
export type TerrainMaterial = (typeof TERRAIN_MATERIALS)[number];
export type MaterialWeights = readonly [number, number, number, number, number];

export interface MountainBiome {
  id: string;
  heightScale: number;
  rangeScale: number;
  rangeStretch: number;
  warp: number;
  plateau: { elevation: number; width: number; strength: number };
  valleyElevation: number;
  pass: { halfWidth: number; shoulder: number; bend: number; wavelength: number };
  campRadius: number;
  caravan: { length: number; halfWidth: number; shoulder: number };
  /** Rise / run, independent of the render resolution. */
  cliffSlope: number;
  terraces: {
    thresholds: readonly number[];
    heights: readonly number[];
    materials: readonly MaterialWeights[];
    transition: number;
    rampWidth: number;
  };
}

export interface MountainRegion {
  seed: string;
  biome: MountainBiome;
}

export interface TerrainSample extends TerrainPoint {
  rawElevation: number;
  level: number;
  depression: number;
  cliff: number;
  landform: 'basin' | 'pass' | 'ravine' | 'ridge' | 'shelf' | 'summit' | 'cliff';
  elevation: number;
  slope: number;
  dx: number;
  dy: number;
  shade: number;
  weights: MaterialWeights;
}

export interface TerrainCell extends TerrainBounds {
  column: number;
  row: number;
  sample: TerrainSample;
  blocked: boolean;
}

/** N/E/S/W bits describe exposed sides of a steep traversal cell, retained as diagnostic metadata. */
export interface CliffModule extends TerrainPoint {
  width: number;
  height: number;
  mask: number;
  shade: number;
}

export interface TerrainChunk extends TerrainBounds {
  column: number;
  row: number;
  columns: number;
  rows: number;
  vertices: readonly TerrainSample[];
  cells: readonly TerrainCell[];
  cliffs: readonly CliffModule[];
}

export type TerrainDebugMode = 'off' | 'elevation' | 'slope' | 'cliffs' | 'collision';
export type TerrainDressingKind = 'rubble' | 'scrub' | 'conifer';

export interface TerrainMaterialArt {
  /** An already loaded, locally bundled Phaser texture. Undefined uses a flat placeholder colour. */
  texture?: string;
  color: number;
  /** Optional multiply tint for reusing a painted material in a cooler or warmer band. */
  tint?: number;
}

export interface TerrainArt {
  materials: Readonly<Record<TerrainMaterial, TerrainMaterialArt>>;
  tileScale: number;
  dressing?: Readonly<
    Record<TerrainDressingKind, { texture: string; frame: string; width: number; tint: number }>
  >;
  cliff: {
    color: number;
    rim: number;
  };
}
