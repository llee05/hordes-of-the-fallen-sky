import type { EnemyDefinition } from '../types';
import { ENEMIES } from './enemies';

export const ENCOUNTER_PHASES = [
  { id: 'warning', title: 'Distant drums', duration: 8, interval: 1.7, enemies: ['wisp', 'bat'] },
  {
    id: 'assault',
    title: 'The gathering host',
    duration: 26,
    interval: 0.7,
    enemies: ['wisp', 'brute', 'ghost-rider', 'hollow-seer'],
  },
  {
    id: 'elite',
    title: 'A champion approaches',
    duration: 12,
    interval: 1.25,
    enemies: ['brute', 'ghost-rider', 'hollow-seer'],
  },
  {
    id: 'recovery',
    title: 'Gather and regroup',
    duration: 24,
    interval: 3,
    enemies: ['wisp', 'bat'],
  },
] as const;
export type EncounterPhase = 'probing' | (typeof ENCOUNTER_PHASES)[number]['id'];
export const ENCOUNTER_ELITES = ['eclipse-giant', 'frost-mare', 'brute'] as const;
export function unlockedEnemy(id: string, score: number): EnemyDefinition | undefined {
  return ENEMIES.find((e) => e.id === id && e.unlockAt <= score);
}
