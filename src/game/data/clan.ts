import { GAME } from '../config';
import type { BuildingId, Doctrine, Formation, RunState } from '../types';

export interface BuildingPathDefinition {
  id: string;
  title: string;
  description: string;
  requires?: readonly string[];
  exclusiveGroup?: string;
  materials?: number;
  spirit?: number;
  apply?: (run: RunState) => void;
}

export interface BuildingDefinition {
  id: BuildingId;
  title: string;
  icon: string;
  description: string;
  materials: number;
  spirit: number;
  workers: number;
  doctrine: Doctrine;
  category: string;
  startsBuilt?: boolean;
  illustration?: 'ger' | 'archery' | 'herd' | 'sanctuary' | 'wagon' | 'banner';
  onBuild?: (run: RunState) => void;
  paths: readonly BuildingPathDefinition[];
}

function welcomePeople(run: RunState, amount: number): void {
  run.clan.population = Math.min(GAME.clan.maxPopulation, run.clan.population + amount);
}

export const BUILDINGS: readonly BuildingDefinition[] = [
  {
    id: 'ger',
    category: 'Survival',
    illustration: 'ger',
    startsBuilt: true,
    onBuild: (run) => welcomePeople(run, 6),
    title: 'Family gers',
    icon: '⌂',
    description: 'Welcome 6 survivors. More hands gather materials faster.',
    materials: 18,
    spirit: 0,
    workers: 0,
    doctrine: 'wander',
    paths: [
      {
        id: 'hearthkeepers',
        exclusiveGroup: 'specialization',
        title: 'Hearthkeepers',
        description: 'Welcome 6 survivors and restore clan resolve while encamped.',
        apply: (run) => welcomePeople(run, 6),
      },
      {
        apply: (run) => welcomePeople(run, 10),
        id: 'refugee-beacons',
        exclusiveGroup: 'specialization',
        title: 'Refugee beacons',
        description: 'Welcome 10 more survivors; unlock larger work crews.',
      },
    ],
  },
  {
    id: 'archery',
    category: 'Warfare',
    illustration: 'archery',
    title: 'Archery grounds',
    icon: '➶',
    description: 'Train 3 horse archers. Unlock encirclement and charging wedge.',
    materials: 24,
    spirit: 0,
    workers: 3,
    doctrine: 'iron',
    paths: [
      {
        id: 'fire-arrows',
        exclusiveGroup: 'specialization',
        title: 'Fire arrows',
        description: 'Arrows ignite. With wind shamans, unlock the Burning Tempest.',
      },
      {
        id: 'veteran-riders',
        exclusiveGroup: 'specialization',
        title: 'Veteran riders',
        description: 'Recruit 3 elite archers; their volleys deal more damage.',
      },
    ],
  },
  {
    id: 'herd',
    category: 'Wayfinding',
    illustration: 'herd',
    onBuild: (run) => {
      run.clan.herd += 4;
    },
    title: 'Herding grounds',
    icon: '♧',
    description: 'Gain 4 horses, gather more food, and unlock feigned retreat.',
    materials: 20,
    spirit: 0,
    workers: 2,
    doctrine: 'wander',
    paths: [
      {
        apply: (run) => {
          run.stats.speed *= 1.12;
        },
        id: 'remount-herds',
        exclusiveGroup: 'specialization',
        title: 'Remount herds',
        description: 'Faster migration and faster mounted movement.',
      },
      {
        apply: (run) => {
          run.clan.food += 45;
        },
        id: 'winter-stores',
        exclusiveGroup: 'specialization',
        title: 'Winter stores',
        description: 'Gain 45 food and halve the clan’s food consumption.',
      },
    ],
  },
  {
    id: 'sanctuary',
    category: 'Spirit',
    illustration: 'sanctuary',
    title: 'Spirit sanctuary',
    icon: 'ϟ',
    description: 'A shaman calls lightning down on nearby enemies.',
    materials: 20,
    spirit: 12,
    workers: 2,
    doctrine: 'sky',
    paths: [
      {
        id: 'wind-shamans',
        exclusiveGroup: 'specialization',
        title: 'Wind shamans',
        description: 'Storms strike more often and bend flaming volleys into sweeping arcs.',
      },
      {
        id: 'ancestral-ward',
        exclusiveGroup: 'specialization',
        title: 'Ancestral ward',
        description: 'A guardian damages enemies approaching the camp and protects the clan.',
      },
    ],
  },
  {
    id: 'wagon',
    category: 'Warfare',
    illustration: 'wagon',
    title: 'Wagon circle',
    icon: '▣',
    description: 'Carts fire defensive arrows. They keep firing during migration.',
    materials: 26,
    spirit: 0,
    workers: 1,
    doctrine: 'iron',
    paths: [
      {
        id: 'war-carts',
        exclusiveGroup: 'specialization',
        title: 'War carts',
        description: 'Carts fire triple volleys and retain full damage while moving.',
      },
      {
        apply: (run) => {
          run.clan.integrity = Math.min(100, run.clan.integrity + 30);
        },
        id: 'felt-armor',
        exclusiveGroup: 'specialization',
        title: 'Felt armor',
        description: 'Halve damage to the caravan and repair 30 resolve.',
      },
    ],
  },
];

export const REGIONS = [
  {
    name: 'The Golden Pasture',
    short: 'GOLDEN PASTURE',
    event: 'The Sundering',
    description: 'The grass is still warm. Beyond it, the sky is coming undone.',
    color: 0xc6ad6b,
  },
  {
    name: 'The Silent River',
    short: 'SILENT RIVER',
    event: 'The White Silence',
    description: 'Winter follows no season now. Keep the herds fed.',
    color: 0xb4cbd0,
  },
  {
    name: 'The Broken Pass',
    short: 'BROKEN PASS',
    event: 'The Earth That Walks',
    description: 'The mountains stir. Your people must cross before they wake.',
    color: 0xa09d83,
  },
  {
    name: 'The Heart of the Steppe',
    short: 'SACRED MOUNTAIN',
    event: 'The Red Eclipse',
    description: 'Raise the blue banners. Hold until the passage opens.',
    color: 0xa95f59,
  },
] as const;

export const ROUTES = [
  {
    id: 'river',
    title: 'Follow the river',
    icon: '≈',
    subtitle: 'PROVISIONS / LONG CROSSING',
    description: '+35 food, +2 horses. A slower journey through the White Silence.',
    food: 35,
    materials: 0,
    population: 0,
    herd: 2,
    danger: 0.9,
    duration: 1.2,
    doctrine: 'wander' as const,
  },
  {
    id: 'ridge',
    title: 'Ride the high ridge',
    icon: '△',
    subtitle: 'MATERIALS / EXPOSED',
    description: '+28 materials, +10 spirit. A short, dangerous mountain crossing.',
    food: 0,
    materials: 28,
    population: 0,
    herd: 0,
    danger: 1.5,
    duration: 0.8,
    doctrine: 'sky' as const,
  },
  {
    id: 'refuge',
    title: 'Answer the blue banners',
    icon: '⚑',
    subtitle: 'SURVIVORS / MORE MOUTHS',
    description: '+8 people and 2 veteran riders. Rescues cost 18 food on arrival.',
    food: -18,
    materials: 0,
    population: 8,
    herd: 0,
    danger: 1.2,
    duration: 1,
    doctrine: 'iron' as const,
  },
] as const;

export const FORMATIONS: Record<Formation, { title: string; description: string }> = {
  guard: {
    title: 'Caravan guard',
    description: 'Riders protect your people. Clan damage reduced by 30%.',
  },
  encircle: {
    title: 'Encirclement',
    description: 'Riders circle nearby enemies. Moving volleys gain 30% damage.',
  },
  wedge: {
    title: 'Charging wedge',
    description: 'Riders follow your charge. Galloping through enemies deals damage.',
  },
  retreat: {
    title: 'Feigned retreat',
    description: 'Wide formation. Faster volleys while moving; nearby shards follow you.',
  },
};
