import { EEJ_KHAIRKHAN } from '../data/eejKhairkhan';
import {
  paintedGroundEnabled,
  paintedGroundGpuBytes,
  paintedGroundWorldBounds,
  type PaintedGroundDefinition,
} from './paintedGround';

export const EEJ_KHAIRKHAN_GRANITE_FALLBACK = {
  texture: 'eej-khairkhan-granite-fallback',
  file: 'ground/granite-fallback.png',
  pixels: 256,
} as const;

/** Four Eej Khairkhan manuscript paintings over the battlefield, plus close brush grain. */
export const EEJ_KHAIRKHAN_PAINTED_GROUND = {
  query: 'eejKhairkhanPaintedGround',
  directory: 'eej-khairkhan/',
  quadrants: {
    nw: { texture: 'eej-khairkhan-ground-nw', file: 'ground/overhaul-nw.png' },
    ne: { texture: 'eej-khairkhan-ground-ne', file: 'ground/overhaul-ne.png' },
    sw: { texture: 'eej-khairkhan-ground-sw', file: 'ground/overhaul-sw.png' },
    se: { texture: 'eej-khairkhan-ground-se', file: 'ground/overhaul-se.png' },
  },
  detail: {
    texture: 'eej-khairkhan-ground-detail',
    file: 'ground/overhaul-detail.png',
    pixels: 1024,
  },
  bounds: {
    minX: EEJ_KHAIRKHAN.world.minX,
    minY: EEJ_KHAIRKHAN.world.minY,
    width: EEJ_KHAIRKHAN.world.width,
    height: EEJ_KHAIRKHAN.world.height,
  },
  pixels: { width: 1586, height: 992 },
  outerFeather: 700,
} as const satisfies PaintedGroundDefinition;

export const eejKhairkhanPaintedGroundEnabled = (search: string, development: boolean): boolean =>
  paintedGroundEnabled(EEJ_KHAIRKHAN_PAINTED_GROUND, search, development);

export const eejKhairkhanPaintedGroundWorldBounds = (
  worldSize: number,
): readonly [number, number, number, number] =>
  paintedGroundWorldBounds(EEJ_KHAIRKHAN_PAINTED_GROUND, worldSize);

export const eejKhairkhanPaintedGroundGpuBytes = (): number =>
  paintedGroundGpuBytes(EEJ_KHAIRKHAN_PAINTED_GROUND);
