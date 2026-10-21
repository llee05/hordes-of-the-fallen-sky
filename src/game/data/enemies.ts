import type { EnemyDefinition } from '../types';

/** Add an entry and a matching pixel sprite to introduce another enemy. */
export const ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'wisp',
    texture: 'wolf',
    health: 25,
    speed: 49,
    damage: 10,
    xp: 3,
    unlockAt: 0,
    weight: 6,
    scale: 2,
  },
  {
    id: 'bat',
    texture: 'shade',
    health: 18,
    speed: 90,
    damage: 8,
    xp: 4,
    unlockAt: 22,
    weight: 3,
    scale: 2,
  },
  {
    id: 'brute',
    texture: 'earth',
    health: 100,
    speed: 35,
    damage: 18,
    xp: 12,
    unlockAt: 55,
    weight: 2,
    scale: 3,
  },
  {
    id: 'ghost-rider',
    texture: 'ghost',
    health: 48,
    speed: 112,
    damage: 12,
    xp: 5,
    unlockAt: 90,
    weight: 3,
    scale: 2,
    behavior: 'charger',
  },
  {
    id: 'hollow-seer',
    texture: 'seer',
    health: 65,
    speed: 45,
    damage: 9,
    xp: 7,
    unlockAt: 150,
    weight: 2,
    scale: 2,
    behavior: 'ranged',
  },
  {
    id: 'frost-mare',
    texture: 'ghost',
    health: 250,
    speed: 82,
    damage: 20,
    xp: 22,
    unlockAt: 210,
    weight: 1,
    scale: 3,
    behavior: 'charger',
  },
  {
    id: 'eclipse-giant',
    texture: 'earth',
    health: 400,
    speed: 34,
    damage: 24,
    xp: 30,
    unlockAt: 330,
    weight: 1,
    scale: 4,
    behavior: 'ranged',
  },
];

export function spawnInterval(elapsed: number): number {
  return Math.max(0.14, 0.85 - elapsed * 0.004);
}

export function chooseEnemy(elapsed: number, random = Math.random): EnemyDefinition {
  const available = ENEMIES.filter((enemy) => enemy.unlockAt <= elapsed);
  let roll = random() * available.reduce((sum, enemy) => sum + enemy.weight, 0);
  for (const enemy of available) {
    roll -= enemy.weight;
    if (roll < 0) return enemy;
  }
  return available[available.length - 1]!;
}

export const SKYBREAKER: EnemyDefinition = {
  id: 'skybreaker',
  texture: 'skybreaker',
  health: 3600,
  speed: 42,
  damage: 26,
  xp: 160,
  unlockAt: 0,
  weight: 0,
  scale: 4,
  behavior: 'boss',
};
