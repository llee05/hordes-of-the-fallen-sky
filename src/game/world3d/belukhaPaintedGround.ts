import { BELUKHA } from '../data/belukha';
import {
  paintedGroundEnabled,
  paintedGroundGpuBytes,
  paintedGroundWorldBounds,
  type PaintedGroundDefinition,
} from './paintedGround';

/** Four manuscript paintings over the Belukha valley, plus the shared close brush grain. */
export const BELUKHA_PAINTED_GROUND = {
  query: 'belukhaPaintedGround',
  directory: 'belukha/',
  quadrants: {
    nw: { texture: 'belukha-ground-nw', file: 'ground/overhaul-nw.png' },
    ne: { texture: 'belukha-ground-ne', file: 'ground/overhaul-ne.png' },
    sw: { texture: 'belukha-ground-sw', file: 'ground/overhaul-sw.png' },
    se: { texture: 'belukha-ground-se', file: 'ground/overhaul-se.png' },
  },
  detail: {
    texture: 'belukha-ground-detail',
    file: 'ground/overhaul-detail.png',
    pixels: 1024,
  },
  bounds: {
    minX: BELUKHA.world.minX,
    minY: BELUKHA.world.minY,
    width: BELUKHA.world.width,
    height: BELUKHA.world.height,
  },
  pixels: { width: 1600, height: 1000 },
  outerFeather: 700,
} as const satisfies PaintedGroundDefinition;

export const belukhaPaintedGroundEnabled = (search: string, development: boolean): boolean =>
  paintedGroundEnabled(BELUKHA_PAINTED_GROUND, search, development);

export const belukhaPaintedGroundWorldBounds = (
  worldSize: number,
): readonly [number, number, number, number] =>
  paintedGroundWorldBounds(BELUKHA_PAINTED_GROUND, worldSize);

export const belukhaPaintedGroundGpuBytes = (): number =>
  paintedGroundGpuBytes(BELUKHA_PAINTED_GROUND);
