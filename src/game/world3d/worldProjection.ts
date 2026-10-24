import type { TerrainBounds } from '../terrain/types';

export const WORLD_3D = {
  angle: 48,
  yaw: 30,
  minAngle: 35,
  maxAngle: 70,
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
  yaw = WORLD_3D.yaw as number,
): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  const turn = (yaw * Math.PI) / 180;
  return {
    x: x * Math.cos(turn) - z * Math.sin(turn),
    y: (x * Math.sin(turn) + z * Math.cos(turn)) * Math.sin(radians) - height * Math.cos(radians),
  };
}

/** Screen-relative riding, with horizontal world speed preserved through camera rotation. */
export function screenMovement(
  x: number,
  y: number,
  yaw = WORLD_3D.yaw as number,
): { x: number; y: number } {
  const radians = (yaw * Math.PI) / 180;
  return {
    x: x * Math.cos(radians) + y * Math.sin(radians),
    y: -x * Math.sin(radians) + y * Math.cos(radians),
  };
}

export function groundView(
  x: number,
  z: number,
  width: number,
  height: number,
  zoom: number,
  maxHeight: number,
  angle: number,
  yaw: number = WORLD_3D.yaw,
): TerrainBounds {
  const radians = (angle * Math.PI) / 180;
  const span = height / zoom / Math.sin(radians);
  const relief = maxHeight / Math.tan(radians);
  const turn = (yaw * Math.PI) / 180;
  const halfX =
    (Math.abs(Math.cos(turn)) * width) / zoom / 2 + Math.abs(Math.sin(turn)) * (span / 2 + relief);
  const halfZ =
    (Math.abs(Math.sin(turn)) * width) / zoom / 2 + Math.abs(Math.cos(turn)) * (span / 2 + relief);
  return { x: x - halfX, y: z - halfZ, width: halfX * 2, height: halfZ * 2 };
}

/** Explicit opt-in preserves the shipping renderer during the migration. */
export function wantsWorld3D(): boolean {
  return (
    import.meta.env.VITE_TERRAIN_RENDERER === '3d' ||
    (import.meta.env.DEV && new URLSearchParams(location.search).get('terrain') === '3d')
  );
}
