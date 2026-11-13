import { ALTAN_OVOO } from '../data/altanOvoo';
import {
  paintedGroundEnabled,
  paintedGroundGpuBytes,
  paintedGroundWorldBounds,
  type PaintedGroundDefinition,
} from './paintedGround';

export const ALTAN_OVOO_GRASS_FALLBACK = {
  texture: 'altan-ovoo-grass-fallback',
  file: 'ground/grass-fallback.png',
  pixels: 256,
} as const;

/** Four approved Altan Ovoo manuscript paintings over the battlefield, plus close brush grain. */
export const ALTAN_OVOO_PAINTED_GROUND = {
  query: 'altanOvooPaintedGround',
  directory: 'altan-ovoo/',
  quadrants: {
    nw: { texture: 'altan-ovoo-ground-nw', file: 'ground/overhaul-nw.png' },
    ne: { texture: 'altan-ovoo-ground-ne', file: 'ground/overhaul-ne.png' },
    sw: { texture: 'altan-ovoo-ground-sw', file: 'ground/overhaul-sw.png' },
    se: { texture: 'altan-ovoo-ground-se', file: 'ground/overhaul-se.png' },
  },
  detail: {
    texture: 'altan-ovoo-ground-detail',
    file: 'ground/overhaul-detail.png',
    pixels: 1024,
  },
  bounds: {
    minX: ALTAN_OVOO.world.minX,
    minY: ALTAN_OVOO.world.minY,
    width: ALTAN_OVOO.world.width,
    height: ALTAN_OVOO.world.height,
  },
  pixels: { width: 1600, height: 1000 },
  outerFeather: 700,
} as const satisfies PaintedGroundDefinition;

export const altanOvooPaintedGroundEnabled = (search: string, development: boolean): boolean =>
  paintedGroundEnabled(ALTAN_OVOO_PAINTED_GROUND, search, development);

export const altanOvooPaintedGroundWorldBounds = (
  worldSize: number,
): readonly [number, number, number, number] =>
  paintedGroundWorldBounds(ALTAN_OVOO_PAINTED_GROUND, worldSize);

export const altanOvooPaintedGroundGpuBytes = (): number =>
  paintedGroundGpuBytes(ALTAN_OVOO_PAINTED_GROUND);
