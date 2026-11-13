import { KHAN_TENGRI } from '../data/khanTengri';
import {
  paintedGroundEnabled,
  paintedGroundGpuBytes,
  paintedGroundWorldBounds,
  type PaintedGroundDefinition,
} from './paintedGround';

/** Four Khan Tengri glacier-margin paintings over the battlefield, plus close brush grain. */
export const KHAN_TENGRI_PAINTED_GROUND = {
  query: 'khanTengriPaintedGround',
  directory: 'khan-tengri/',
  quadrants: {
    nw: { texture: 'khan-tengri-ground-nw', file: 'ground/overhaul-nw.png' },
    ne: { texture: 'khan-tengri-ground-ne', file: 'ground/overhaul-ne.png' },
    sw: { texture: 'khan-tengri-ground-sw', file: 'ground/overhaul-sw.png' },
    se: { texture: 'khan-tengri-ground-se', file: 'ground/overhaul-se.png' },
  },
  detail: {
    texture: 'khan-tengri-ground-detail',
    file: 'ground/overhaul-detail.png',
    pixels: 1024,
  },
  bounds: {
    minX: KHAN_TENGRI.world.minX,
    minY: KHAN_TENGRI.world.minY,
    width: KHAN_TENGRI.world.width,
    height: KHAN_TENGRI.world.height,
  },
  pixels: { width: 1600, height: 1000 },
  outerFeather: 700,
} as const satisfies PaintedGroundDefinition;

export const khanTengriPaintedGroundEnabled = (search: string, development: boolean): boolean =>
  paintedGroundEnabled(KHAN_TENGRI_PAINTED_GROUND, search, development);

export const khanTengriPaintedGroundWorldBounds = (
  worldSize: number,
): readonly [number, number, number, number] =>
  paintedGroundWorldBounds(KHAN_TENGRI_PAINTED_GROUND, worldSize);

export const khanTengriPaintedGroundGpuBytes = (): number =>
  paintedGroundGpuBytes(KHAN_TENGRI_PAINTED_GROUND);
