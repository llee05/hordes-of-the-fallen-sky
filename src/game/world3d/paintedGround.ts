export const PAINTED_GROUND_QUADRANTS = ['nw', 'ne', 'sw', 'se'] as const;
export type PaintedGroundQuadrant = (typeof PAINTED_GROUND_QUADRANTS)[number];

export interface PaintedGroundDefinition {
  query: string;
  directory: string;
  quadrants: Record<PaintedGroundQuadrant, { texture: string; file: string }>;
  detail: { texture: string; file: string; pixels: number };
  /** Level-centre-relative bounds: +x east, +y south. */
  bounds: { minX: number; minY: number; width: number; height: number };
  pixels: { width: number; height: number };
  /** Maximum irregular blend distance into the tiled fallback at the outer playable edge. */
  outerFeather?: number;
}

/** Painted ground ships on; development captures can force a level's tiled fallback with `=0`. */
export function paintedGroundEnabled(
  definition: PaintedGroundDefinition,
  search: string,
  development: boolean,
): boolean {
  return !development || new URLSearchParams(search).get(definition.query) !== '0';
}

/** World-space shader bounds: minimum x/z followed by width/depth. */
export function paintedGroundWorldBounds(
  definition: PaintedGroundDefinition,
  worldSize: number,
): readonly [number, number, number, number] {
  const center = worldSize / 2;
  const { minX, minY, width, height } = definition.bounds;
  return [center + minX, center + minY, width, height];
}

/** Uncompressed GPU bytes for RGBA uploads with a complete mip chain. */
export function paintedGroundGpuBytes(definition: PaintedGroundDefinition): number {
  const mipBytes = (width: number, height: number) => {
    let bytes = 0;
    while (true) {
      bytes += width * height * 4;
      if (width === 1 && height === 1) return bytes;
      width = Math.max(1, Math.floor(width / 2));
      height = Math.max(1, Math.floor(height / 2));
    }
  };
  return (
    4 * mipBytes(definition.pixels.width, definition.pixels.height) +
    mipBytes(definition.detail.pixels, definition.detail.pixels)
  );
}
