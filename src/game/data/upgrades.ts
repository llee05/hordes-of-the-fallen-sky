import type { UpgradeDefinition } from '../types';

export const UPGRADES: readonly UpgradeDefinition[] = [
  {
    id: 'power',
    category: 'Warfare',
    title: 'Horn-and-sinew bows',
    subtitle: 'DAMAGE',
    icon: '✦',
    maxStacks: 8,
    description: 'Composite bows give every arrow 25% more force.',
    apply: (run) => {
      run.stats.damage *= 1.25;
    },
  },
  {
    id: 'haste',
    category: 'Warfare',
    title: 'The endless volley',
    subtitle: 'ATTACK SPEED',
    icon: 'ϟ',
    maxStacks: 6,
    description: 'Your mounted host looses arrows 15% more often.',
    apply: (run) => {
      run.stats.attackInterval *= 0.85;
    },
  },
  {
    id: 'multishot',
    category: 'Warfare',
    title: 'Sworn riders',
    subtitle: 'PROJECTILES',
    icon: '⋔',
    maxStacks: 4,
    description: 'One more mounted archer joins the host. Add an arrow to your volley.',
    apply: (run) => {
      run.stats.projectiles += 1;
    },
  },
  {
    id: 'stride',
    category: 'Wayfinding',
    title: 'Steppe-bred horses',
    subtitle: 'MOVEMENT',
    icon: '»',
    maxStacks: 5,
    description: 'Your commander rides 12% faster across the steppe.',
    apply: (run) => {
      run.stats.speed *= 1.12;
    },
  },
  {
    id: 'magnet',
    category: 'Wayfinding',
    title: 'Ancestral memory',
    subtitle: 'COLLECTION',
    icon: '◇',
    maxStacks: 5,
    description: 'Gather spirit shards from 40% farther away.',
    apply: (run) => {
      run.stats.pickupRadius *= 1.4;
    },
  },
  {
    id: 'vitality',
    category: 'Survival',
    title: 'The healer’s craft',
    subtitle: 'VITALITY',
    icon: '+',
    maxStacks: 8,
    description: 'Gain 20 commander health and recover 35 health.',
    apply: (run) => {
      run.stats.maxHealth += 20;
      run.health = Math.min(run.stats.maxHealth, run.health + 35);
    },
  },
];
