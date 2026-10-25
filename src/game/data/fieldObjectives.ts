import { GAME } from '../config';
export const FIELD_OBJECTIVES = {
  supplies: {
    title: 'Scattered supplies',
    instruction: 'Clear the cart and stay nearby to gather it.',
    reward: '+18 food · +12 materials',
    art: 'cart',
    ...GAME.field.rewards.supplies,
  },
  herd: {
    title: 'A loose herd',
    instruction: 'Approach the horses, then ride with them back to camp.',
    reward: '+3 horses · +8 food',
    art: 'packhorse',
    ...GAME.field.rewards.herd,
  },
  refugees: {
    title: 'Stranded households',
    instruction: 'Meet the survivors and escort them back to camp.',
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
