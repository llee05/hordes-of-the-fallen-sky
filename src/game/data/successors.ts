import { GAME } from '../config';
export const SUCCESSORS = {
  outrider: {
    title: 'The outrider',
    description: 'The Khan rides 5% faster.',
    speed: GAME.khan.outriderSpeed,
    protection: 1,
  },
  hearthguard: {
    title: 'The hearthguard',
    description: 'The Khan takes 8% less damage.',
    speed: 1,
    protection: GAME.khan.hearthguardProtection,
  },
} as const;
export type SuccessorTrait = keyof typeof SUCCESSORS;
