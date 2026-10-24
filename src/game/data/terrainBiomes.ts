import { GAME } from '../config';
import type { MountainRegion } from '../terrain/types';

/** A broad camp basin and two winding mountain passes, independent of story chapter. */
export const OTGONTENGER_MOUNTAINS: MountainRegion = {
  seed: 'otgontenger-white-crown-v1',
  biome: {
    id: 'otgontenger-alpine',
    heightScale: 1150,
    rangeScale: 1550,
    rangeStretch: 0.55,
    warp: 290,
    plateau: { elevation: 0.6, width: 0.13, strength: 0.88 },
    valleyElevation: 0.2,
    pass: { halfWidth: 190, shoulder: 340, bend: 420, wavelength: 1050 },
    campRadius: 430,
    caravan: { length: 1530, halfWidth: 280, shoulder: 380 },
    cliffSlope: GAME.terrain.cliffSlope,
    bands: [
      [0.26, 0.4],
      [0.4, 0.56],
      [0.58, 0.74],
      [0.74, 0.88],
    ],
  },
};
