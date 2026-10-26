import { extendCampBuilding } from './campEstate';
import { GAME } from '../config';
import type {
  BuildingId,
  CampEffectDefinition,
  Doctrine,
  Formation,
  LocationId,
  RunState,
} from '../types';

export type StartingTraditionId = keyof typeof GAME.clan.starts;
export const STARTING_TRADITIONS = [
  {
    id: 'shared-hearth',
    title: 'Shared hearth',
    icon: 'ger',
    description:
      'What is left is shared out evenly, and the eight survivors are free to start however they choose.',
    role: 'Even stores, and any first move you like.',
  },
  {
    id: 'outriders',
    title: 'Outrider circle',
    icon: 'bow',
    description:
      'One more rider takes the field, but horsing the escort costs provisions and tools.',
    role: 'Fight early, and win back supplies before the crossing.',
  },
  {
    id: 'hearthkeepers',
    title: 'Hearthkeepers',
    icon: 'sanctuary',
    description:
      'The tools go into strengthening the households. The clan can take more punishment, but new facilities are slower to set up.',
    role: 'A safer camp that is slower to build.',
  },
  {
    id: 'pathfinders',
    title: 'Pathfinders',
    icon: 'banner',
    description:
      'Pack light and keep the scouts moving. Shards are swept up from farther off, and the caravan gets through faster.',
    role: 'Quicker scouting and travel on leaner stores.',
  },
] as const satisfies readonly {
  id: StartingTraditionId;
  title: string;
  icon: string;
  description: string;
  role: string;
}[];

export function startingTradition(id: RunState['startingTradition']) {
  const definition = STARTING_TRADITIONS.find((entry) => entry.id === id) ?? STARTING_TRADITIONS[0];
  return { ...definition, balance: GAME.clan.starts[definition.id] };
}

export interface BuildingPathDefinition {
  level?: number;
  minTier?: number;
  minLevel?: number;
  workers?: number;
  requiresBuildings?: readonly { building: BuildingId; level: number }[];
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
  minTier?: number;
  maxLevel?: number;
  flavour?: string;
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

const ORIGINAL_BUILDINGS: readonly BuildingDefinition[] = [
  {
    id: 'ger',
    category: 'Survival',
    illustration: 'ger',
    startsBuilt: true,
    onBuild: (run) => welcomePeople(run, 6),
    title: 'Family gers',
    icon: '⌂',
    description: 'Six survivors join the camp, and more hands gather materials faster.',
    materials: 18,
    spirit: 0,
    workers: 0,
    doctrine: 'wander',
    paths: [
      {
        id: 'hearthkeepers',
        exclusiveGroup: 'specialization',
        title: 'Hearthkeepers',
        description: 'Six more survivors join, and clan resolve recovers while the camp stays put.',
        apply: (run) => welcomePeople(run, 6),
      },
      {
        apply: (run) => welcomePeople(run, 10),
        id: 'refugee-beacons',
        exclusiveGroup: 'specialization',
        title: 'Refugee beacons',
        description:
          'Beacons call in the scattered: 10 more survivors arrive, and larger work crews become possible.',
      },
      {
        id: 'felt-linings',
        title: 'Felt-lined households',
        materials: C.ger.linings.materials,
        description: 'Layered felt keeps out more than the cold. The clan takes 10% less damage.',
        effects: { multipliers: { clanProtection: C.ger.linings.protection } },
      },
      {
        id: 'hospitality-circle',
        title: 'A place at every hearth',
        requires: ['hearthkeepers'],
        materials: C.ger.hospitality.materials,
        description:
          'The clan recovers another 0.15 resolve each second it stays put, and each arrival heals the Khan for 10 more.',
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
          'Households teach one another their skills. Material gathering in camp rises 20%.',
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
    description:
      'Train 3 horse archers. The riders can now form the encirclement and the charging wedge.',
    materials: 24,
    spirit: 0,
    workers: 3,
    doctrine: 'iron',
    paths: [
      {
        id: 'fire-arrows',
        exclusiveGroup: 'specialization',
        title: 'Fire arrows',
        description: 'Arrows burn. Paired with Wind shamans, they make the Burning Tempest.',
      },
      {
        id: 'veteran-riders',
        exclusiveGroup: 'specialization',
        title: 'Veteran riders',
        description: 'Three seasoned archers join you, and their volleys hit harder.',
      },
      {
        id: 'seasoned-bowyers',
        title: 'Horn-and-sinew bowyers',
        materials: C.archery.bowyers.materials,
        description:
          'Carefully fitted bows let the Khan and the riders with you target enemies 30 paces farther out.',
        effects: { bonuses: { range: C.archery.bowyers.range } },
      },
      {
        id: 'resin-preparation',
        title: 'Prepared resin bundles',
        requires: ['fire-arrows'],
        materials: C.archery.resin.materials,
        description: 'Fire arrows burn for 30% more damage.',
        effects: { multipliers: { burnDamage: C.archery.resin.damage } },
      },
      {
        id: 'arban-drills',
        title: 'Arban drills',
        requires: ['veteran-riders'],
        materials: C.archery.arban.materials,
        description:
          'The riders drill until they move as one. Their arrows deal 20% more damage, and the mounted host’s firing interval is 10% shorter.',
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
    description: 'Gain 4 horses and more food. The riders can now use the feigned retreat.',
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
        description: 'Spare horses mean a faster migration and a faster ride.',
      },
      {
        apply: (run) => {
          run.clan.food += 45;
        },
        id: 'winter-stores',
        exclusiveGroup: 'specialization',
        title: 'Winter stores',
        description: 'Gain 45 food, and the clan eats half as much.',
      },
      {
        id: 'seasonal-grazing',
        title: 'Seasonal grazing knowledge',
        materials: C.herd.grazing.materials,
        description:
          'Move the herds between grazing grounds and let each one rest. The pasture wears out 15% more slowly.',
        effects: { multipliers: { pastureUse: C.herd.grazing.depletion } },
      },
      {
        id: 'relay-remounts',
        title: 'A horse held in reserve',
        requires: ['remount-herds'],
        materials: C.herd.relay.materials,
        description: 'Gain 3 horses, and the gallop cooldown is a further 10% shorter.',
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
        description: 'Gain 25 food, and food production in camp rises 20%.',
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
        description: 'Storms strike more often, and they bend flaming volleys into sweeping arcs.',
      },
      {
        id: 'ancestral-ward',
        exclusiveGroup: 'specialization',
        title: 'Ancestral ward',
        description: 'A guardian strikes enemies that come near the camp and shields the clan.',
      },
      {
        id: 'ovoo-remembrance',
        title: 'Remembered ovoos',
        materials: C.sanctuary.remembrance.materials,
        spirit: C.sanctuary.remembrance.spirit,
        description:
          'Keep the memory of sacred places alive between you. Each successful arrival restores 6 more clan resolve.',
        effects: { bonuses: { arrivalResolve: C.sanctuary.remembrance.arrivalResolve } },
      },
      {
        id: 'storm-watch',
        title: 'Keepers of the storm watch',
        requires: ['wind-shamans'],
        materials: C.sanctuary.watch.materials,
        spirit: C.sanctuary.watch.spirit,
        description: 'The sanctuary’s lightning interval is another 15% shorter.',
        effects: { multipliers: { sanctuaryInterval: C.sanctuary.watch.interval } },
      },
      {
        id: 'ancestral-tales',
        title: 'Names beside the hearth',
        requires: ['ancestral-ward'],
        materials: C.sanctuary.tales.materials,
        spirit: C.sanctuary.tales.spirit,
        description:
          'The Khan recovers 0.15 health every active second, and the clan another 0.1 resolve each second it stays put.',
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
    description: 'The carts loose arrows to defend the camp and keep shooting on the march.',
    materials: 26,
    spirit: 0,
    workers: 1,
    doctrine: 'iron',
    paths: [
      {
        id: 'war-carts',
        exclusiveGroup: 'specialization',
        title: 'War carts',
        description: 'Carts fire triple volleys and lose no damage while moving.',
      },
      {
        apply: (run) => {
          run.clan.integrity = Math.min(100, run.clan.integrity + 30);
        },
        id: 'felt-armor',
        exclusiveGroup: 'specialization',
        title: 'Felt armor',
        description: 'The caravan takes half damage, and 30 resolve is restored.',
      },
      {
        id: 'rawhide-lashings',
        title: 'Rawhide lashings',
        materials: C.wagon.lashings.materials,
        description: 'Lash the loads down tight. The caravan’s migration mobility rises 8%.',
        effects: { multipliers: { mobility: C.wagon.lashings.mobility } },
      },
      {
        id: 'wheelwrights',
        title: 'Wheelwright crews',
        requires: ['war-carts'],
        materials: C.wagon.wheels.materials,
        description:
          'Steadier carts make better firing platforms. Wagon circle arrows deal 25% more damage.',
        effects: { multipliers: { wagonDamage: C.wagon.wheels.damage } },
      },
      {
        id: 'layered-felt',
        title: 'Layered felt screens',
        requires: ['felt-armor'],
        materials: C.wagon.felt.materials,
        description:
          'The clan takes a further 10% less damage. This multiplies with Felt armor and patron protection.',
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
    description:
      'Wool and household craft become supplies for the road. Material gathering rises 15%.',
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
          'Everyone sorts and prepares the wool together. Material gathering rises another 15%.',
        effects: { multipliers: { materialProduction: C.felt.sorting.gathering } },
      },
      {
        id: 'weatherproof-covers',
        title: 'Weatherproof ger covers',
        materials: C.felt.covers.materials,
        description:
          'Better shelter stretches the provisions. The clan eats 10% less food, on the road as well as in camp.',
        effects: { multipliers: { consumption: C.felt.covers.consumption } },
      },
      {
        id: 'pack-frames',
        title: 'Folding pack frames',
        materials: C.felt.frames.materials,
        description:
          'The wooden lattice and felt covers fold down for the road. Migration mobility rises 10%.',
        effects: { multipliers: { mobility: C.felt.frames.mobility } },
      },
      {
        id: 'master-feltmakers',
        title: 'Felt passed between generations',
        requires: ['wool-sorting', 'weatherproof-covers'],
        materials: C.felt.mastery.materials,
        description:
          'Craft handed down through the households: the clan takes 10% less damage. Needs both Wool sorting circles and Weatherproof ger covers.',
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
      'Dairy work and preserved food. Gain 25 food, and food production in camp rises 15%.',
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
        description: 'Dry curds to carry on the road. Gain 20 food, and the clan eats 10% less.',
        apply: (run) => {
          run.clan.food += C.provisions.aaruul.food;
        },
        effects: { multipliers: { consumption: C.provisions.aaruul.consumption } },
      },
      {
        id: 'borts-stores',
        title: 'Borts travel stores',
        materials: C.provisions.borts.materials,
        description: 'Dried meat put by for the road brings 15 food after each completed crossing.',
        effects: { bonuses: { arrivalFood: C.provisions.borts.arrivalFood } },
      },
      {
        id: 'airag-hospitality',
        title: 'Airag hospitality',
        materials: C.provisions.airag.materials,
        description:
          'Four survivors are welcomed to the shared table, and clan resolve rises by 10 at once.',
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
          'Each successful arrival heals the Khan for 10 more and restores 6 more clan resolve.',
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
    description: 'Couriers tie the moving clan to the road ahead. Migration mobility rises 8%.',
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
        description:
          'Scouts find better ground before the camp unpacks. The pasture wears out 10% more slowly.',
        effects: { multipliers: { pastureUse: C.relay.scouts.depletion } },
      },
      {
        id: 'supply-caches',
        title: 'Supplies along the road',
        materials: C.relay.caches.materials,
        description: 'Each successful crossing brings 10 more materials and 8 more food.',
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
        description: 'Each blue-banner rescue brings in 3 more people.',
        effects: { bonuses: { refugePeople: C.relay.messengers.people } },
      },
      {
        id: 'horse-relays',
        title: 'Fresh horses on the road',
        requires: ['pasture-scouts', 'supply-caches'],
        materials: C.relay.horses.materials,
        description: 'Each successful crossing brings 1 more horse and 4 more clan resolve.',
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

export const BUILDINGS: readonly BuildingDefinition[] = ORIGINAL_BUILDINGS.map(extendCampBuilding);

export const REGIONS = [
  {
    id: 'golden-pasture',
    name: 'The Golden Pasture',
    short: 'GOLDEN PASTURE',
    event: 'The Sundering',
    description: 'The grass is still warm. Beyond it, the sky is coming undone.',
    color: 0xc6ad6b,
  },
  {
    id: 'silent-river',
    name: 'The Silent River',
    short: 'SILENT RIVER',
    event: 'The White Silence',
    description: 'Winter follows no season now. Keep the herds fed.',
    color: 0xb4cbd0,
  },
  {
    id: 'broken-pass',
    name: 'The Broken Pass',
    short: 'BROKEN PASS',
    event: 'The Earth That Walks',
    description: 'The mountains stir. Your people must cross before they wake.',
    color: 0xa09d83,
  },
  {
    id: 'heart-of-the-steppe',
    name: 'The Heart of the Steppe',
    short: 'SACRED MOUNTAIN',
    event: 'The Red Eclipse',
    description: 'Raise the blue banners. Hold until the passage opens.',
    color: 0xa95f59,
  },
] as const;

export interface MigrationLocation {
  id: LocationId;
  name: string;
  short: string;
  area: string;
  description: string;
  context?: string;
  terrain: 'river' | 'foothills' | 'peaks' | 'volcanic' | 'desert';
  peaks: number;
  color: number;
  balance: { food: number; materials: number; mobility: number; crossing: number };
}

const neutralLocation = { food: 1, materials: 1, mobility: 1, crossing: 1 };

/** Real place context is separate from the game's invented weather, combat, and balance. */
export const LOCATIONS: readonly MigrationLocation[] = [
  ...REGIONS.map((region, index): MigrationLocation => ({
    ...region,
    area: 'The fictional steppe',
    terrain: index === 1 ? 'river' : index >= 2 ? 'peaks' : 'foothills',
    peaks: index >= 2 ? 3 : 0,
    balance: neutralLocation,
  })),
  {
    id: 'otgontenger',
    name: 'Mount Otgontenger',
    short: 'OTGONTENGER',
    area: 'Khangai · Mongolia',
    terrain: 'peaks',
    peaks: 1,
    color: 0xaeb9b1,
    description:
      'Camp in the high foothills under a snow-capped summit. The grazing is thin, so careful provisioning pays.',
    context:
      'A sacred mountain of the Khangai, with shamanic and Buddhist traditions of reverence.',
    balance: GAME.locations.otgontenger,
  },
  {
    id: 'bogd-khan-uul',
    name: 'Bogd Khan Uul',
    short: 'BOGD KHAN UUL',
    area: 'Khentii · Mongolia',
    terrain: 'foothills',
    peaks: 2,
    color: 0x9eaf8e,
    description:
      'Sheltered foothills with grazing and timber, and room for a camp that is still growing.',
    context:
      'A long-revered mountain south of present-day Ulaanbaatar, associated with protected sacred land.',
    balance: GAME.locations['bogd-khan-uul'],
  },
  {
    id: 'altai-tavan-bogd',
    name: 'Altai Tavan Bogd',
    short: 'ALTAI TAVAN BOGD',
    area: 'Mongol Altai · Mongolia',
    terrain: 'peaks',
    peaks: 5,
    color: 0xb7c4c1,
    description:
      'Five distant peaks stand around a stony camp. Materials are plentiful, but food and the next departure need care.',
    context: 'The Five Holy Peaks belong to the sacred landscapes of the Mongolian Altai.',
    balance: GAME.locations['altai-tavan-bogd'],
  },
  {
    id: 'khan-tengri',
    name: 'Khan Tengri Peak',
    short: 'KHAN TENGRI',
    area: 'Tian Shan · Central Asia',
    terrain: 'peaks',
    peaks: 1,
    color: 0xb8bcc5,
    description:
      'A sharp skyline rises over a hard highland camp. Bring stores for the long approach and the sparse grass.',
    context: 'A Tian Shan peak whose Turkic name is commonly interpreted as Lord of the Sky.',
    balance: GAME.locations['khan-tengri'],
  },
  {
    id: 'belukha',
    name: 'Mount Belukha (Üch-Sümer)',
    short: 'BELUKHA · ÜCH-SÜMER',
    area: 'Altai · Russia / Kazakhstan',
    terrain: 'peaks',
    peaks: 3,
    color: 0xc4c9c7,
    description:
      'White summits look down on a cool upland halt. Gather stone and wood, and keep watch over the stores.',
    context:
      'Belukha is especially revered in Altaian sacred-landscape traditions, distinct from Mongolian practices.',
    balance: GAME.locations.belukha,
  },
  {
    id: 'altan-ovoo',
    name: 'Altan Ovoo',
    short: 'ALTAN OVOO',
    area: 'Dariganga · Mongolia',
    terrain: 'volcanic',
    peaks: 1,
    color: 0xc6ad76,
    description:
      'Open steppe spreads around an old volcanic mountain. The gentle approaches suit a clan that moves quickly.',
    context:
      'An extinct volcanic mountain revered by Dariganga communities through local worship traditions.',
    balance: GAME.locations['altan-ovoo'],
  },
  {
    id: 'eej-khairkhan',
    name: 'Eej Khairkhan',
    short: 'EEJ KHAIRKHAN',
    area: 'Govi-Altai · Mongolia',
    terrain: 'desert',
    peaks: 2,
    color: 0xc9ad82,
    description:
      'Warm rock shelters a camp on the dry steppe. Salvage what materials you can, and keep the herd ready to move.',
    context:
      'A revered Govi-Altai mountain whose name carries an association with maternal protection.',
    balance: GAME.locations['eej-khairkhan'],
  },
  {
    id: 'orkhon-valley',
    name: 'Orkhon Valley',
    short: 'ORKHON VALLEY',
    area: 'Orkhon · Mongolia',
    terrain: 'river',
    peaks: 0,
    color: 0xa4b48a,
    description:
      'Broad river pastures feed the households, and the easy approach leaves more supplies for the next camp.',
    context:
      'A cultural landscape of Turkic and Mongol history, with memorials and a long tradition of nomadic pastoralism.',
    balance: GAME.locations['orkhon-valley'],
  },
];

export const ROUTES = [
  {
    id: 'river',
    title: 'Follow the river',
    icon: '≈',
    subtitle: 'PROVISIONS / LONG CROSSING',
    description: '+35 food, +2 horses. A longer crossing that keeps to the water.',
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
    description: '+28 materials, +10 spirit. A short crossing, exposed on the mountain.',
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
    description: '+8 people and 2 veteran riders. The rescued need 18 food when they arrive.',
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
    description: 'The riders stay close to the people. The clan takes 30% less damage.',
  },
  encircle: {
    title: 'Encirclement',
    description:
      'The riders circle nearby enemies. Volleys loosed on the move deal 30% more damage.',
  },
  wedge: {
    title: 'Charging wedge',
    description: 'The riders follow your charge, and galloping through enemies hurts them.',
  },
  retreat: {
    title: 'Feigned retreat',
    description:
      'A wide, loose formation. Volleys come faster while you move, and nearby shards follow you.',
  },
};
