import { OTGONTENGER } from '../data/otgontenger';
import {
  paintedGroundEnabled,
  paintedGroundGpuBytes,
  paintedGroundWorldBounds,
  type PaintedGroundDefinition,
} from './paintedGround';

/** Four manuscript paintings for the Otgontenger valleys, plus close brush grain. */
export const OTGONTENGER_PAINTED_GROUND = {
  query: 'otgontengerPaintedGround',
  directory: 'otgontenger/',
  quadrants: {
    nw: { texture: 'otgontenger-ground-nw', file: 'ground/overhaul-nw.png' },
    ne: { texture: 'otgontenger-ground-ne', file: 'ground/overhaul-ne.png' },
    sw: { texture: 'otgontenger-ground-sw', file: 'ground/overhaul-sw.png' },
    se: { texture: 'otgontenger-ground-se', file: 'ground/overhaul-se.png' },
  },
  detail: {
    texture: 'otgontenger-ground-detail',
    file: 'ground/overhaul-detail.png',
    pixels: 1024,
  },
  bounds: {
    minX: OTGONTENGER.world.minX,
    minY: OTGONTENGER.world.minY,
    width: OTGONTENGER.world.width,
    height: OTGONTENGER.world.height,
  },
  pixels: { width: 1600, height: 1000 },
  outerFeather: 700,
} as const satisfies PaintedGroundDefinition;

export const otgontengerPaintedGroundEnabled = (search: string, development: boolean): boolean =>
  paintedGroundEnabled(OTGONTENGER_PAINTED_GROUND, search, development);

export const otgontengerPaintedGroundWorldBounds = (
  worldSize: number,
): readonly [number, number, number, number] =>
  paintedGroundWorldBounds(OTGONTENGER_PAINTED_GROUND, worldSize);

export const otgontengerPaintedGroundGpuBytes = (): number =>
  paintedGroundGpuBytes(OTGONTENGER_PAINTED_GROUND);
