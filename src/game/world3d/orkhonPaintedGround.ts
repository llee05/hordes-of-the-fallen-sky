/** Development-only painted-ground prototype approved for the falls-plateau ramp area. */
export const ORKHON_PAINTED_GROUND = {
  query: 'orkhonPaintedGround',
  texture: 'orkhon-painted-ground-c',
  file: 'ground/painted_ramp_region_c.png',
  /** Camp-relative bounds: +x east, +y south. */
  bounds: { minX: -550, minY: -1600, size: 1600 },
  pixels: 2048,
} as const;

/** The prototype is deliberately unavailable in production builds even if a query is supplied. */
export function orkhonPaintedGroundEnabled(search: string, development: boolean): boolean {
  if (!development) return false;
  return new URLSearchParams(search).get(ORKHON_PAINTED_GROUND.query) === '1';
}

/** World-space shader bounds: minimum x/z followed by width/depth. */
export function orkhonPaintedGroundWorldBounds(
  worldSize: number,
): readonly [number, number, number, number] {
  const center = worldSize / 2;
  const { minX, minY, size } = ORKHON_PAINTED_GROUND.bounds;
  return [center + minX, center + minY, size, size];
}
