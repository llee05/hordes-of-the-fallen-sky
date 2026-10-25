import { GAME } from '../config';
export const SUCCESSORS = {
  outrider: {
    title: 'The outrider',
    description: 'Khan riding speed +5%.',
    speed: GAME.khan.outriderSpeed,
    protection: 1,
  },
  hearthguard: {
    title: 'The hearthguard',
    description: 'Khan takes 8% less damage.',
    speed: 1,
    protection: GAME.khan.hearthguardProtection,
  },
} as const;
export type SuccessorTrait = keyof typeof SUCCESSORS;
