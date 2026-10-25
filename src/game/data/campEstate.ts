import { GAME } from '../config';
import type { BuildingDefinition, BuildingPathDefinition } from './clan';
import type { BuildingId, CampEffectDefinition } from '../types';

const C = GAME.camp.estate;
export interface EstateImprovement {
  id: string;
  title: string;
  description: string;
  icon: string;
  effects: CampEffectDefinition;
  materials: number;
  spirit: number;
  workers: number;
  minTier: number;
  requiresBuildings?: readonly { building: BuildingId; level: number }[];
}
export const ENCAMPMENT_TIERS = [
  {
    title: 'Wandering Clan',
    description: 'A few families beneath a length of blue cloth.',
    effects: {},
  },
  {
    title: 'Established Encampment',
    description: 'Dedicated workplaces and a shared tally improve gathering by 10%.',
    effects: { multipliers: { materialProduction: C.modestProduction } },
  },
  {
    title: 'Prosperous Ordo',
    description:
      'Organised provisions improve food production by 10% and reduce clan damage by 5%.',
    effects: { multipliers: { foodProduction: C.modestProduction, clanProtection: C.protection } },
  },
  {
    title: 'Great Ordo',
    description: 'The travelling host fires 5% faster and carries its camp 6% more efficiently.',
    effects: { multipliers: { hostInterval: C.interval, mobility: C.mobility } },
  },
  {
    title: 'Imperial Ordo',
    description: 'A great portable household: material gathering +20%, clan damage −15%.',
    effects: {
      multipliers: { materialProduction: C.strongProduction, clanProtection: C.strongProtection },
    },
  },
].map((tier, i): EstateImprovement & { tier: number; slots: number; internalSlots: number } => ({
  ...tier,
  id: `encampment-${i + 1}`,
  tier: i + 1,
  icon: 'ger',
  effects: tier.effects as CampEffectDefinition,
  materials: C.tierCosts[i]!,
  spirit: C.tierSpirit[i]!,
  workers: 0,
  minTier: i,
  slots: C.slots[i]!,
  internalSlots: C.internalSlots[i]!,
  ...(i >= 2 ? { requiresBuildings: [{ building: 'ger' as const, level: i >= 3 ? 3 : 2 }] } : {}),
}));

export interface InternalDevelopment {
  id: string;
  title: string;
  description: string;
  icon: string;
  ranks: readonly EstateImprovement[];
}
const internal = (
  id: string,
  title: string,
  description: string,
  icon: string,
  effects: CampEffectDefinition,
  minTier = 1,
): InternalDevelopment => ({
  id,
  title,
  description,
  icon,
  ranks: [1, 2].map((rank): EstateImprovement => ({
    id: `${id}-${rank}`,
    title: rank === 1 ? title : `Experienced ${title.toLocaleLowerCase()}`,
    description,
    icon,
    effects,
    materials: C.internalCosts[rank - 1]!,
    spirit: C.internalSpirit[rank - 1]!,
    workers: rank === 1 ? C.internalWorkers : 0,
    minTier: Math.max(minTier, rank === 2 ? 3 : 1),
  })),
});
export const INTERNAL_DEVELOPMENTS: readonly InternalDevelopment[] = [
  internal(
    'clan-council',
    'Clan Council',
    'Shared decisions reduce food consumption by 5% per rank.',
    'journal',
    { multipliers: { consumption: C.consumption } },
  ),
  internal(
    'ancestral-hearth',
    'Ancestral Hearth',
    'Remembrance strengthens stored Spirit gained from defeats by 15% per rank.',
    'hearth',
    { multipliers: { spiritGain: C.spiritGain } },
  ),
  internal(
    'master-craftsmen',
    'Master Craftsmen',
    'Shared tools and teaching improve material gathering by 10% per rank.',
    'materials',
    { multipliers: { materialProduction: C.modestProduction } },
  ),
  internal(
    'war-council',
    'War Council',
    'Coordinated drills increase accompanying rider damage by 15% per rank.',
    'bow',
    { multipliers: { riderDamage: C.riderDamage } },
    2,
  ),
  internal(
    'supply-organisation',
    'Supply Organisation',
    'Each completed crossing brings 8 additional food per rank.',
    'grain',
    { bonuses: { arrivalFood: C.arrivalFood } },
    2,
  ),
  internal(
    'travelling-merchants',
    'Travelling Merchants',
    'Travelling exchange brings 6 additional materials after each crossing per rank.',
    'wagon',
    { bonuses: { arrivalMaterials: C.arrivalMaterials } },
    3,
  ),
];
const FACILITIES: Record<
  BuildingId,
  {
    tier: number;
    names: readonly [string, string];
    benefits: readonly [CampEffectDefinition, CampEffectDefinition];
    flavour: string;
  }
> = {
  ger: {
    tier: 1,
    names: ['Organised households', 'A gathering of families'],
    benefits: [
      { multipliers: { materialProduction: C.modestProduction } },
      { bonuses: { resolveRecovery: C.resolve } },
    ],
    flavour: 'The home is carried in felt, timber, memory, and the hands that unpack it.',
  },
  archery: {
    tier: 1,
    names: ['Mounted archery range', 'Veteran training grounds'],
    benefits: [{ bonuses: { range: C.range } }, { multipliers: { riderDamage: C.riderDamage } }],
    flavour: 'Practice travels with the riders; targets and bow racks fold onto the carts.',
  },
  felt: {
    tier: 2,
    names: ['Organised workshops', 'Master feltmakers'],
    benefits: [
      { multipliers: { materialProduction: C.modestProduction } },
      { multipliers: { consumption: C.consumption } },
    ],
    flavour: 'Portable frames and well-taught hands turn wool into shelter for the road.',
  },
  sanctuary: {
    tier: 2,
    names: ['Shamanic gathering place', 'Ancestral sanctuary'],
    benefits: [
      { multipliers: { spiritGain: C.spiritGain } },
      { multipliers: { sanctuaryInterval: C.strongInterval } },
    ],
    flavour: 'A carried hearth keeps the clan’s remembrance together without claiming the land.',
  },
  herd: {
    tier: 1,
    names: ['Seasonal herding teams', 'Great remount herd'],
    benefits: [
      { multipliers: { foodProduction: C.modestProduction } },
      { multipliers: { mobility: C.mobility } },
    ],
    flavour: 'The wealth of a travelling people grazes beside it, watched and tended.',
  },
  wagon: {
    tier: 1,
    names: ['Organised wagon train', 'Defended caravan'],
    benefits: [
      { multipliers: { wagonDamage: C.wagonDamage } },
      { multipliers: { clanProtection: C.protection } },
    ],
    flavour: 'Carts carry the household by day and shelter it when the banners stop.',
  },
  provisions: {
    tier: 1,
    names: ['Preserving households', 'Provisioning stewards'],
    benefits: [
      { multipliers: { consumption: C.consumption } },
      { bonuses: { arrivalFood: C.arrivalFood } },
    ],
    flavour: 'Dried provisions are a promise kept for the next pasture.',
  },
  relay: {
    tier: 3,
    names: ['Organised courier routes', 'Masters of the relay'],
    benefits: [
      { multipliers: { mobility: C.mobility } },
      { bonuses: { arrivalMaterials: C.arrivalMaterials } },
    ],
    flavour: 'Fresh mounts and remembered roads tie scattered households to the moving clan.',
  },
};
export function extendCampBuilding(building: BuildingDefinition): BuildingDefinition {
  const data = FACILITIES[building.id];
  const hasFinalChoice = ['archery', 'sanctuary', 'wagon', 'felt'].includes(building.id);
  const levels: BuildingPathDefinition[] = [2, 3].map((level, i) => ({
    id: `level-${level}`,
    level,
    title: data.names[i]!,
    description:
      level === 2
        ? 'Organise this facility for more dependable work.'
        : 'Experienced households pass their skills to the next generation.',
    effects: data.benefits[i],
    minTier: level,
    requires: level === 3 ? ['level-2'] : [],
    materials: C.levelCosts[level - 1],
    spirit: C.levelSpirit[level - 1],
    ...(building.id === 'ger'
      ? {
          apply: (run) => {
            run.clan.population = Math.min(GAME.clan.maxPopulation, run.clan.population + C.people);
          },
        }
      : {}),
  }));
  const choices: BuildingPathDefinition[] =
    building.id === 'felt'
      ? [
          {
            id: 'reinforced-felt',
            title: 'Reinforced felt production',
            description: 'Layered military felt reduces all clan damage by 15%.',
            exclusiveGroup: 'specialization',
            effects: { multipliers: { clanProtection: C.strongProtection } },
          },
          {
            id: 'fine-felt',
            title: 'Fine felt craftsmanship',
            description: 'Fine craft increases material gathering by 20%.',
            exclusiveGroup: 'specialization',
            effects: { multipliers: { materialProduction: C.strongProduction } },
          },
        ]
      : [];
  return {
    ...building,
    minTier: data.tier,
    maxLevel: hasFinalChoice ? 4 : 3,
    flavour: data.flavour,
    paths: [...levels, ...building.paths, ...choices].map((path) =>
      path.exclusiveGroup && hasFinalChoice
        ? {
            ...path,
            level: 4,
            minTier: 4,
            minLevel: 3,
            requires: [...new Set(['level-3', ...(path.requires ?? [])])],
          }
        : path,
    ),
  };
}
