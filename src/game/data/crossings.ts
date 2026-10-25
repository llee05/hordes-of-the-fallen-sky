import { GAME } from '../config';
export const CROSSING_ENCOUNTERS = {
  river: {
    title: 'Hold the ford',
    warning: 'Movement on both banks. Defend the caravan through the shallows.',
    task: 'Defeat the marked bank attackers',
    reward: '+12 resolve on arrival',
    guards: GAME.crossings.riverGuards,
  },
  ridge: {
    title: 'The exposed shelf',
    warning: 'An ambush gathers ahead. Ride forward and break it before the wagons arrive.',
    task: 'Clear the marked ridge ambush',
    reward: '+10 materials · +6 resolve on arrival',
    guards: GAME.crossings.ridgeGuards,
  },
  refuge: {
    title: 'Bring them into the column',
    warning: 'Households are approaching the blue banners. Meet them and keep raiders away.',
    task: 'Ride near the households to escort them into the caravan',
    reward: '+2 additional people · +6 resolve on arrival',
    guards: GAME.crossings.refugeGuards,
  },
} as const;
export type CrossingRoute = keyof typeof CROSSING_ENCOUNTERS;
