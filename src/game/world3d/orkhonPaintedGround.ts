import { ORKHON_VALLEY } from '../data/orkhonValley';

export const ORKHON_GROUND_QUADRANTS = ['nw', 'ne', 'sw', 'se'] as const;
export type OrkhonGroundQuadrant = (typeof ORKHON_GROUND_QUADRANTS)[number];

/** Four approved manuscript paintings over the wide Orkhon battlefield, plus close brush grain. */
export const ORKHON_PAINTED_GROUND = {
  query: 'orkhonPaintedGround',
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
} as const;

/** Painted ground ships on; development captures can force the tiled fallback with `=0`. */
export function orkhonPaintedGroundEnabled(search: string, development: boolean): boolean {
  return !development || new URLSearchParams(search).get(ORKHON_PAINTED_GROUND.query) !== '0';
}

/** World-space shader bounds: minimum x/z followed by width/depth. */
export function orkhonPaintedGroundWorldBounds(
  worldSize: number,
): readonly [number, number, number, number] {
  const center = worldSize / 2;
  const { minX, minY, width, height } = ORKHON_PAINTED_GROUND.bounds;
  return [center + minX, center + minY, width, height];
}

/** Uncompressed GPU bytes for RGBA uploads with a complete mip chain. */
export function orkhonPaintedGroundGpuBytes(): number {
  const q = ORKHON_PAINTED_GROUND.pixels;
  const detail = ORKHON_PAINTED_GROUND.detail.pixels;
  const mipBytes = (width: number, height: number) => {
    let bytes = 0;
    while (true) {
      bytes += width * height * 4;
      if (width === 1 && height === 1) return bytes;
      width = Math.max(1, Math.floor(width / 2));
      height = Math.max(1, Math.floor(height / 2));
    }
  };
  return 4 * mipBytes(q.width, q.height) + mipBytes(detail, detail);
}
