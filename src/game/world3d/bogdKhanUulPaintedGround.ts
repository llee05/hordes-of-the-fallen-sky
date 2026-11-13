import { BOGD_KHAN_UUL } from '../data/bogdKhanUul';
import {
  paintedGroundEnabled,
  paintedGroundGpuBytes,
  paintedGroundWorldBounds,
  type PaintedGroundDefinition,
} from './paintedGround';

/** Four manuscript ground paintings over Bogd Khan Uul, plus the shared close brush grain. */
export const BOGD_KHAN_UUL_PAINTED_GROUND = {
  query: 'bogdKhanUulPaintedGround',
  directory: 'bogd-khan-uul/',
  quadrants: {
    nw: { texture: 'bogd-khan-uul-ground-nw', file: 'ground/overhaul-nw.png' },
    ne: { texture: 'bogd-khan-uul-ground-ne', file: 'ground/overhaul-ne.png' },
    sw: { texture: 'bogd-khan-uul-ground-sw', file: 'ground/overhaul-sw.png' },
    se: { texture: 'bogd-khan-uul-ground-se', file: 'ground/overhaul-se.png' },
  },
  detail: {
    texture: 'bogd-khan-uul-ground-detail',
    file: 'ground/overhaul-detail.png',
    pixels: 1024,
  },
  bounds: {
    minX: BOGD_KHAN_UUL.world.minX,
    minY: BOGD_KHAN_UUL.world.minY,
    width: BOGD_KHAN_UUL.world.width,
    height: BOGD_KHAN_UUL.world.height,
  },
  pixels: { width: 1600, height: 1000 },
  outerFeather: 700,
} as const satisfies PaintedGroundDefinition;

export const bogdKhanUulPaintedGroundEnabled = (search: string, development: boolean): boolean =>
  paintedGroundEnabled(BOGD_KHAN_UUL_PAINTED_GROUND, search, development);

export const bogdKhanUulPaintedGroundWorldBounds = (
  worldSize: number,
): readonly [number, number, number, number] =>
  paintedGroundWorldBounds(BOGD_KHAN_UUL_PAINTED_GROUND, worldSize);

export const bogdKhanUulPaintedGroundGpuBytes = (): number =>
  paintedGroundGpuBytes(BOGD_KHAN_UUL_PAINTED_GROUND);
