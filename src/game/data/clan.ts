import { GAME } from '../config';
import type { BuildingId, CampEffectDefinition, Doctrine, Formation, RunState } from '../types';

export interface BuildingPathDefinition {
  effects?: CampEffectDefinition;
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
  effects?: CampEffectDefinition;
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

const C = GAME.camp;

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
      {
        id: 'felt-linings',
        title: 'Felt-lined households',
        materials: C.ger.linings.materials,
        description: 'Layered shelter reduces all clan damage by 10%.',
        effects: { multipliers: { clanProtection: C.ger.linings.protection } },
      },
      {
        id: 'hospitality-circle',
        title: 'A place at every hearth',
        requires: ['hearthkeepers'],
        materials: C.ger.hospitality.materials,
        description:
          'Recover another 0.15 resolve per stationary second. Arrivals heal the commander by 10 more.',
        effects: {
          bonuses: {
            resolveRecovery: C.ger.hospitality.resolve,
            arrivalHealth: C.ger.hospitality.arrivalHealth,
          },
        },
      },
      {
        id: 'household-apprentices',
        title: 'Household apprentices',
        requires: ['refugee-beacons'],
        materials: C.ger.apprentices.materials,
        description:
          'Pass skills between households. Stationary material gathering increases by 20%.',
        effects: { multipliers: { materialProduction: C.ger.apprentices.gathering } },
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
      {
        id: 'seasoned-bowyers',
        title: 'Horn-and-sinew bowyers',
        materials: C.archery.bowyers.materials,
        description:
          'Carefully fitted bows extend commander and accompanying-rider targeting range by 30 paces.',
        effects: { bonuses: { range: C.archery.bowyers.range } },
      },
      {
        id: 'resin-preparation',
        title: 'Prepared resin bundles',
        requires: ['fire-arrows'],
        materials: C.archery.resin.materials,
        description: 'Fire-arrow burn damage increases by 30%.',
        effects: { multipliers: { burnDamage: C.archery.resin.damage } },
      },
      {
        id: 'arban-drills',
        title: 'Arban drills',
        requires: ['veteran-riders'],
        materials: C.archery.arban.materials,
        description:
          'Practise coordinated riding: companion arrow damage +20%; mounted-host firing intervals fall by 10%.',
        effects: {
          multipliers: {
            riderDamage: C.archery.arban.damage,
            hostInterval: C.archery.arban.interval,
          },
        },
      },
    ],
  },
  {
    id: 'herd',
    category: 'Wayfinding',
    illustration: 'herd',
    onBuild: (run) => {
      run.clan.herd = Math.min(GAME.clan.maxHerd, run.clan.herd + 4);
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
      {
        id: 'seasonal-grazing',
        title: 'Seasonal grazing knowledge',
        materials: C.herd.grazing.materials,
        description: 'Choose and rest the grazing ground. Pasture depletion falls by 15%.',
        effects: { multipliers: { pastureUse: C.herd.grazing.depletion } },
      },
      {
        id: 'relay-remounts',
        title: 'A horse held in reserve',
        requires: ['remount-herds'],
        materials: C.herd.relay.materials,
        description: 'Gain 3 horses. Gallop cooldown falls by a further 10%.',
        apply: (run) => {
          run.clan.herd = Math.min(GAME.clan.maxHerd, run.clan.herd + C.herd.relay.horses);
        },
        effects: { multipliers: { gallopCooldown: C.herd.relay.gallop } },
      },
      {
        id: 'dairy-reserves',
        title: 'The herders’ dairy reserve',
        requires: ['winter-stores'],
        materials: C.herd.dairy.materials,
        description: 'Gain 25 food. Stationary food production increases by 20%.',
        apply: (run) => {
          run.clan.food += C.herd.dairy.food;
        },
        effects: { multipliers: { foodProduction: C.herd.dairy.production } },
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
      {
        id: 'ovoo-remembrance',
        title: 'Remembered ovoos',
        materials: C.sanctuary.remembrance.materials,
        spirit: C.sanctuary.remembrance.spirit,
        description:
          'Keep the memory of sacred places together. Successful arrivals restore 6 additional clan resolve.',
        effects: { bonuses: { arrivalResolve: C.sanctuary.remembrance.arrivalResolve } },
      },
      {
        id: 'storm-watch',
        title: 'Keepers of the storm watch',
        requires: ['wind-shamans'],
        materials: C.sanctuary.watch.materials,
        spirit: C.sanctuary.watch.spirit,
        description: 'Sanctuary lightning intervals fall by another 15%.',
        effects: { multipliers: { sanctuaryInterval: C.sanctuary.watch.interval } },
      },
      {
        id: 'ancestral-tales',
        title: 'Names beside the hearth',
        requires: ['ancestral-ward'],
        materials: C.sanctuary.tales.materials,
        spirit: C.sanctuary.tales.spirit,
        description:
          'Recover 0.15 commander health per active second and another 0.1 clan resolve per stationary second.',
        effects: {
          bonuses: {
            commanderRecovery: C.sanctuary.tales.health,
            resolveRecovery: C.sanctuary.tales.resolve,
          },
        },
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
      {
        id: 'rawhide-lashings',
        title: 'Rawhide lashings',
        materials: C.wagon.lashings.materials,
        description: 'Secure the travelling loads. Caravan migration mobility increases by 8%.',
        effects: { multipliers: { mobility: C.wagon.lashings.mobility } },
      },
      {
        id: 'wheelwrights',
        title: 'Wheelwright crews',
        requires: ['war-carts'],
        materials: C.wagon.wheels.materials,
        description: 'Stable firing platforms increase Wagon circle arrow damage by 25%.',
        effects: { multipliers: { wagonDamage: C.wagon.wheels.damage } },
      },
      {
        id: 'layered-felt',
        title: 'Layered felt screens',
        requires: ['felt-armor'],
        materials: C.wagon.felt.materials,
        description:
          'Clan damage falls by another 10%, multiplying with Felt armor and patron protection.',
        effects: { multipliers: { clanProtection: C.wagon.felt.protection } },
      },
    ],
  },
  {
    id: 'felt',
    title: 'Feltmakers’ workshop',
    category: 'Craft',
    illustration: 'ger',
    icon: '⌂',
    description: 'Turn wool and household craft into travelling supplies. Material gathering +15%.',
    materials: C.felt.base.materials,
    spirit: 0,
    workers: C.felt.base.workers,
    doctrine: 'wander',
    effects: { multipliers: { materialProduction: C.felt.base.gathering } },
    paths: [
      {
        id: 'wool-sorting',
        title: 'Wool sorting circles',
        materials: C.felt.sorting.materials,
        description:
          'Share the work of preparing wool. Material gathering increases by another 15%.',
        effects: { multipliers: { materialProduction: C.felt.sorting.gathering } },
      },
      {
        id: 'weatherproof-covers',
        title: 'Weatherproof ger covers',
        materials: C.felt.covers.materials,
        description:
          'Better shelter conserves provisions. Food consumption falls by 10%, including during travel.',
        effects: { multipliers: { consumption: C.felt.covers.consumption } },
      },
      {
        id: 'pack-frames',
        title: 'Folding pack frames',
        materials: C.felt.frames.materials,
        description:
          'Pack the wooden lattice and felt covers for the road. Migration mobility increases by 10%.',
        effects: { multipliers: { mobility: C.felt.frames.mobility } },
      },
      {
        id: 'master-feltmakers',
        title: 'Felt passed between generations',
        requires: ['wool-sorting', 'weatherproof-covers'],
        materials: C.felt.mastery.materials,
        description:
          'Skilled household craft reduces all clan damage by 10%. Requires both wool sorting and weatherproof covers.',
        effects: { multipliers: { clanProtection: C.felt.mastery.protection } },
      },
    ],
  },
  {
    id: 'provisions',
    title: 'Provisioning ger',
    category: 'Provisions',
    illustration: 'ger',
    icon: '♧',
    description:
      'Dairy work and preserved supplies. Gain 25 food; stationary food production +15%.',
    materials: C.provisions.base.materials,
    spirit: 0,
    workers: C.provisions.base.workers,
    doctrine: 'wander',
    onBuild: (run) => {
      run.clan.food += C.provisions.base.food;
    },
    effects: { multipliers: { foodProduction: C.provisions.base.production } },
    paths: [
      {
        id: 'aaruul-drying',
        title: 'Aaruul drying racks',
        materials: C.provisions.aaruul.materials,
        description: 'Store dried curds for the road. Gain 20 food; food consumption falls by 10%.',
        apply: (run) => {
          run.clan.food += C.provisions.aaruul.food;
        },
        effects: { multipliers: { consumption: C.provisions.aaruul.consumption } },
      },
      {
        id: 'borts-stores',
        title: 'Borts travel stores',
        materials: C.provisions.borts.materials,
        description: 'Preserved meat reserves provide 15 food after each completed crossing.',
        effects: { bonuses: { arrivalFood: C.provisions.borts.arrivalFood } },
      },
      {
        id: 'airag-hospitality',
        title: 'Airag hospitality',
        materials: C.provisions.airag.materials,
        description:
          'Welcome 4 survivors around the shared table and restore 10 clan resolve immediately.',
        apply: (run) => {
          welcomePeople(run, C.provisions.airag.people);
          run.clan.integrity = Math.min(100, run.clan.integrity + C.provisions.airag.resolve);
        },
      },
      {
        id: 'shared-provisions',
        title: 'Provisions for every household',
        requires: ['aaruul-drying', 'borts-stores'],
        materials: C.provisions.shared.materials,
        description:
          'Successful arrivals restore 10 additional commander health and 6 additional clan resolve.',
        effects: {
          bonuses: {
            arrivalHealth: C.provisions.shared.arrivalHealth,
            arrivalResolve: C.provisions.shared.arrivalResolve,
          },
        },
      },
    ],
  },
  {
    id: 'relay',
    title: 'Örtöö relay',
    category: 'Wayfinding',
    illustration: 'banner',
    icon: '⚑',
    description:
      'Couriers link the travelling clan to the road ahead. Migration mobility increases by 8%.',
    materials: C.relay.base.materials,
    spirit: 0,
    workers: C.relay.base.workers,
    doctrine: 'iron',
    effects: { multipliers: { mobility: C.relay.base.mobility } },
    paths: [
      {
        id: 'pasture-scouts',
        title: 'Pasture scouts',
        materials: C.relay.scouts.materials,
        description: 'Find better ground before unpacking. Pasture depletion falls by 10%.',
        effects: { multipliers: { pastureUse: C.relay.scouts.depletion } },
      },
      {
        id: 'supply-caches',
        title: 'Supplies along the road',
        materials: C.relay.caches.materials,
        description:
          'Each successful crossing brings 10 additional materials and 8 additional food.',
        effects: {
          bonuses: {
            arrivalMaterials: C.relay.caches.arrivalMaterials,
            arrivalFood: C.relay.caches.arrivalFood,
          },
        },
      },
      {
        id: 'family-messengers',
        title: 'Messengers to scattered families',
        materials: C.relay.messengers.materials,
        description: 'Blue-banner rescue arrivals welcome 3 additional people.',
        effects: { bonuses: { refugePeople: C.relay.messengers.people } },
      },
      {
        id: 'horse-relays',
        title: 'Fresh horses on the road',
        requires: ['pasture-scouts', 'supply-caches'],
        materials: C.relay.horses.materials,
        description:
          'Each successful crossing grants 1 additional horse and 4 additional clan resolve.',
        effects: {
          bonuses: {
            arrivalHerd: C.relay.horses.arrivalHerd,
            arrivalResolve: C.relay.horses.arrivalResolve,
          },
        },
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
