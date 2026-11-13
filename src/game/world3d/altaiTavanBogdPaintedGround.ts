import { ALTAI_TAVAN_BOGD } from '../data/altaiTavanBogd';
import {
  paintedGroundEnabled,
  paintedGroundGpuBytes,
  paintedGroundWorldBounds,
  type PaintedGroundDefinition,
} from './paintedGround';

export const ALTAI_TAVAN_BOGD_SCREE_FALLBACK = {
  texture: 'altai-tavan-bogd-northern-scree',
  file: 'ground/northern-scree.png',
  pixels: 1024,
} as const;

/** Four manuscript paintings over the authored valley, plus close paper and brush grain. */
export const ALTAI_TAVAN_BOGD_PAINTED_GROUND = {
  query: 'altaiTavanBogdPaintedGround',
  directory: 'altai-tavan-bogd/',
  quadrants: {
    nw: { texture: 'altai-tavan-bogd-ground-nw', file: 'ground/overhaul-nw.png' },
    ne: { texture: 'altai-tavan-bogd-ground-ne', file: 'ground/overhaul-ne.png' },
    sw: { texture: 'altai-tavan-bogd-ground-sw', file: 'ground/overhaul-sw.png' },
    se: { texture: 'altai-tavan-bogd-ground-se', file: 'ground/overhaul-se.png' },
  },
  detail: {
    texture: 'altai-tavan-bogd-ground-detail',
    file: 'ground/overhaul-detail.png',
    pixels: 1024,
  },
  bounds: {
    minX: ALTAI_TAVAN_BOGD.world.minX,
    minY: ALTAI_TAVAN_BOGD.world.minY,
    width: ALTAI_TAVAN_BOGD.world.width,
    height: ALTAI_TAVAN_BOGD.world.height,
  },
  pixels: { width: 1600, height: 1000 },
  outerFeather: 700,
} as const satisfies PaintedGroundDefinition;

export const altaiTavanBogdPaintedGroundEnabled = (search: string, development: boolean): boolean =>
  paintedGroundEnabled(ALTAI_TAVAN_BOGD_PAINTED_GROUND, search, development);

export const altaiTavanBogdPaintedGroundWorldBounds = (
  worldSize: number,
): readonly [number, number, number, number] =>
  paintedGroundWorldBounds(ALTAI_TAVAN_BOGD_PAINTED_GROUND, worldSize);

export const altaiTavanBogdPaintedGroundGpuBytes = (): number =>
  paintedGroundGpuBytes(ALTAI_TAVAN_BOGD_PAINTED_GROUND);
