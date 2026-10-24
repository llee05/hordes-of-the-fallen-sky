import type { TerrainBounds } from '../terrain/types';

export const WORLD_3D = {
  angle: 65,
  minAngle: 55,
  maxAngle: 80,
  meshStep: 32,
  chunkBudget: 2,
  pixelRatio: 1.5,
  shadowSize: 1024,
  minRenderScale: 0.5,
} as const;

export const WORLD_DEBUG_MODES = [
  'off',
  'wireframe',
  'elevation',
  'normals',
  'slope',
  'traversal',
  'chunks',
  'collision',
] as const;
export type WorldDebugMode = (typeof WORLD_DEBUG_MODES)[number];

/** Physics X/Y becomes render X/Z. Height never changes combat distances. */
export function projectGround(
  x: number,
  z: number,
  height: number,
  angle = WORLD_3D.angle as number,
): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return { x, y: z * Math.sin(radians) - height * Math.cos(radians) };
}

export function groundView(
  x: number,
  z: number,
  width: number,
  height: number,
  zoom: number,
  maxHeight: number,
  angle: number,
): TerrainBounds {
  const radians = (angle * Math.PI) / 180;
  const span = height / zoom / Math.sin(radians);
  const relief = maxHeight / Math.tan(radians);
  return {
    x: x - width / zoom / 2,
    y: z - span / 2 - relief,
    width: width / zoom,
    height: span + relief * 2,
  };
}

/** Explicit opt-in preserves the shipping renderer during the migration. */
export function wantsWorld3D(): boolean {
  return (
    import.meta.env.VITE_TERRAIN_RENDERER === '3d' ||
    (import.meta.env.DEV && new URLSearchParams(location.search).get('terrain') === '3d')
  );
}
