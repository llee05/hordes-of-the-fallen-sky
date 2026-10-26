import { GAME } from '../config';
export const FIELD_OBJECTIVES = {
  supplies: {
    title: 'Scattered supplies',
    instruction: 'Clear the enemies off the cart, then stay close while it is gathered.',
    reward: '+18 food · +12 materials',
    art: 'cart',
    ...GAME.field.rewards.supplies,
  },
  herd: {
    title: 'A loose herd',
    instruction: 'Ride up to the horses, then lead them back to camp.',
    reward: '+3 horses · +8 food',
    art: 'packhorse',
    ...GAME.field.rewards.herd,
  },
  refugees: {
    title: 'Stranded households',
    instruction: 'Reach the survivors and bring them safely back to camp.',
    reward: '+2 people · +6 resolve',
    art: 'worker',
    ...GAME.field.rewards.refugees,
  },
  gathering: {
    title: 'An enemy gathering',
    instruction: 'Defeat the marked raiders before they reach camp.',
    reward: '+10 Spirit · +12 materials',
    art: 'banner',
    ...GAME.field.rewards.gathering,
  },
} as const;
export type FieldObjectiveKind = keyof typeof FIELD_OBJECTIVES;
