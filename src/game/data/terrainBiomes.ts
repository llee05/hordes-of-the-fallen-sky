import { GAME } from '../config';
import type { MountainRegion } from '../terrain/types';

/** A broad camp basin and two winding mountain passes, independent of story chapter. */
export const OTGONTENGER_MOUNTAINS: MountainRegion = {
  seed: 'otgontenger-white-crown-v1',
  geometry: {
    walkSlope: 0.85,
    shelf: {
      x: 350,
      z: -1000,
      width: 1180,
      depth: 600,
      rise: 230,
      fracture: 0.16,
      elevation: 0.48,
      flatten: 0.7,
    },
    ramp: {
      x: -260,
      bend: 140,
      wavelength: 450,
      halfWidth: 180,
      shoulder: 700,
      start: -300,
      length: 1200,
      elevation: 0.72,
    },
  },
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
    terraces: {
      thresholds: [0.34, 0.48, 0.62, 0.76],
      heights: [0.2, 0.36, 0.52, 0.7, 0.9],
      transition: 0.04,
      rampWidth: 300,
      materials: [
        [0.28, 0.72, 0, 0, 0],
        [0.02, 0.05, 0.65, 0.28, 0],
        [0, 0, 0.42, 0.52, 0.06],
        [0, 0, 0.48, 0.06, 0.46],
        [0, 0, 0.06, 0.02, 0.92],
      ],
    },
  },
};
