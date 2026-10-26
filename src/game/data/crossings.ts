import { GAME } from '../config';
export const CROSSING_ENCOUNTERS = {
  river: {
    title: 'Hold the ford',
    warning: 'Something is moving on both banks. Guard the caravan through the shallows.',
    task: 'Drive off the marked attackers on the banks',
    reward: '+12 resolve on arrival',
    guards: GAME.crossings.riverGuards,
  },
  ridge: {
    title: 'The exposed shelf',
    warning: 'An ambush is gathering ahead. Ride out and break it before the wagons reach it.',
    task: 'Break the marked ambush on the ridge',
    reward: '+10 materials · +6 resolve on arrival',
    guards: GAME.crossings.ridgeGuards,
  },
  refuge: {
    title: 'Bring them into the column',
    warning:
      'Households are making for the blue banners. Ride out to meet them and keep the raiders off.',
    task: 'Ride beside the households to bring them into the caravan',
    reward: '+2 additional people · +6 resolve on arrival',
    guards: GAME.crossings.refugeGuards,
  },
} as const;
export type CrossingRoute = keyof typeof CROSSING_ENCOUNTERS;
