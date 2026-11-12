import { ORKHON_VALLEY } from '../data/orkhonValley';
import {
  PAINTED_GROUND_QUADRANTS,
  paintedGroundEnabled,
  paintedGroundGpuBytes,
  paintedGroundWorldBounds,
  type PaintedGroundDefinition,
} from './paintedGround';

export const ORKHON_GROUND_QUADRANTS = PAINTED_GROUND_QUADRANTS;
export type OrkhonGroundQuadrant = (typeof ORKHON_GROUND_QUADRANTS)[number];

/** Four approved manuscript paintings over the wide Orkhon battlefield, plus close brush grain. */
export const ORKHON_PAINTED_GROUND = {
  query: 'orkhonPaintedGround',
  directory: 'orkhon-valley/',
  quadrants: {
    nw: { texture: 'orkhon-ground-nw', file: 'ground/overhaul-nw.png' },
    ne: { texture: 'orkhon-ground-ne', file: 'ground/overhaul-ne.png' },
    sw: { texture: 'orkhon-ground-sw', file: 'ground/overhaul-sw.png' },
    se: { texture: 'orkhon-ground-se', file: 'ground/overhaul-se.png' },
  },
  detail: { texture: 'orkhon-ground-detail', file: 'ground/overhaul-detail.png', pixels: 1024 },
  /** Level-centre-relative bounds: +x east, +y south. */
  bounds: {
    minX: ORKHON_VALLEY.world.minX,
    minY: ORKHON_VALLEY.world.minY,
    width: ORKHON_VALLEY.world.width,
    height: ORKHON_VALLEY.world.height,
  },
  pixels: { width: 1600, height: 1000 },
} as const satisfies PaintedGroundDefinition;

/** Painted ground ships on; development captures can force the tiled fallback with `=0`. */
export function orkhonPaintedGroundEnabled(search: string, development: boolean): boolean {
  return paintedGroundEnabled(ORKHON_PAINTED_GROUND, search, development);
}

/** World-space shader bounds: minimum x/z followed by width/depth. */
export function orkhonPaintedGroundWorldBounds(
  worldSize: number,
): readonly [number, number, number, number] {
  return paintedGroundWorldBounds(ORKHON_PAINTED_GROUND, worldSize);
}

/** Uncompressed GPU bytes for RGBA uploads with a complete mip chain. */
export function orkhonPaintedGroundGpuBytes(): number {
  return paintedGroundGpuBytes(ORKHON_PAINTED_GROUND);
}
