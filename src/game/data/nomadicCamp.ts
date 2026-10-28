import {
  CORE_CAMP_BUILDINGS,
  OPTIONAL_CAMP_BUILDINGS,
  type NomadicBuildingId,
} from '../../shared/nomadicCamp.js';
import { GAME } from '../config';
import type { CampEffectDefinition, PlayerStats, Doctrine } from '../types';

export interface NomadicBuildingEffects {
  ongoing?: CampEffectDefinition;
  player?: Partial<Pick<PlayerStats, 'damage' | 'maxHealth' | 'pickupRadius' | 'projectiles'>>;
  attackInterval?: number;
  pierce?: number;
  populationCapacity?: number;
  experience?: number;
  unlocks?: { building: import('../types').BuildingId; path: string }[];
  /** Recorded and shown as planned benefits; no absent gameplay subsystem is simulated. */
  future?: Partial<
    Record<
      | 'populationCapacity'
      | 'leadership'
      | 'mountSpeed'
      | 'mountEffectiveness'
      | 'storageCapacity'
      | 'relocationEfficiency'
      | 'leather'
      | 'wool'
      | 'armourEffectiveness'
      | 'equipmentCrafting'
      | 'companionCapacity'
      | 'companionStrength'
      | 'companionAbilities'
      | 'explorationRadius'
      | 'hiddenDiscovery'
      | 'expeditionRewards'
      | 'specialArrows'
      | 'guardStrength'
      | 'rareAnimalResources'
      | 'huntingExpeditions'
      | 'craftingEfficiency'
      | 'tradeRates'
      | 'merchantInventory'
      | 'rareTradeResources'
      | 'healingEffectiveness'
      | 'patronBlessings'
      | 'spiritualAbilities'
      | 'rituals'
      | 'corruptionCleansing'
      | 'companionMorale'
      | 'patronBonuses'
      | 'experienceGain'
      | 'technologyProgression'
      | 'loreDiscoveries',
      number
    >
  >;
}
export interface NomadicBuildingLevel {
  level: number;
  title: string;
  cost: { materials: number; spirit: number };
  effects: NomadicBuildingEffects;
  visual: {
    art: 'ger' | 'wagon' | 'herd' | 'archery' | 'sanctuary' | 'banner';
    scale: number;
    ornament: number;
  };
  requires?: { building: NomadicBuildingId; level: number }[];
}
export interface NomadicBuildingDefinition {
  id: NomadicBuildingId;
  title: string;
  category: 'Core' | 'Military' | 'Economy & survival' | 'Spiritual & cultural';
  description: string;
  icon: string;
  doctrine: Doctrine;
  workers: number;
  levels: readonly NomadicBuildingLevel[];
  /** Core anchors stay fixed; optional instances use their persistent slot's anchor. */
  position?: readonly [number, number];
}
const C = GAME.camp.nomadic;
type Art = NomadicBuildingLevel['visual']['art'];
function define(
  id: NomadicBuildingId,
  title: string,
  category: NomadicBuildingDefinition['category'],
  description: string,
  icon: string,
  art: Art,
  effects: readonly NomadicBuildingEffects[],
  position?: readonly [number, number],
): NomadicBuildingDefinition {
  return {
    id,
    title,
    category,
    description,
    icon,
    position,
    doctrine:
      category === 'Military' ? 'iron' : category === 'Spiritual & cultural' ? 'sky' : 'wander',
    workers: category === 'Core' ? 0 : C.workers,
    levels: effects.map((effect, i) => ({
      level: i + 1,
      title: ['Basic', 'Established', 'Advanced'][i] ?? `Level ${i + 1}`,
      cost: {
        materials: category === 'Core' && i === 0 ? 0 : C.materials[i]!,
        spirit: category === 'Spiritual & cultural' ? C.spirit[i]! : 0,
      },
      effects: effect,
      visual: { art, scale: 1 + i * 0.12, ornament: i },
      ...(i > 0 && id !== 'khans-ger'
        ? { requires: [{ building: 'khans-ger' as const, level: i + 1 }] }
        : {}),
    })),
  };
}
const repeat = (effects: NomadicBuildingEffects): NomadicBuildingEffects[] => [
  effects,
  structuredClone(effects),
  structuredClone(effects),
];
export const NOMADIC_BUILDINGS: readonly NomadicBuildingDefinition[] = [
  define(
    'khans-ger',
    "Khan's Ger",
    'Core',
    'The central household leads the clan and organises the growth of every workplace.',
    'ger',
    'ger',
    repeat({
      ongoing: { multipliers: { materialProduction: C.production } },
      populationCapacity: C.populationCapacity,
      future: { leadership: C.futureEfficiency },
    }),
    [50, 31],
  ),
  define(
    'horse-lines',
    'Horse Lines',
    'Core',
    'Hitching lines, remounts and careful packing keep the travelling camp moving.',
    'horse',
    'herd',
    repeat({
      ongoing: { multipliers: { mobility: C.mobility } },
      future: { mountSpeed: C.futureEfficiency, mountEffectiveness: C.futureEfficiency },
    }),
    [19, 28],
  ),
  define(
    'herding-grounds',
    'Herding Grounds',
    'Core',
    'The livestock provide food and the materials of a portable household.',
    'horse',
    'herd',
    repeat({
      ongoing: { multipliers: { foodProduction: C.production } },
      future: { leather: 1, wool: 1 },
    }),
    [16, 64],
  ),
  define(
    'communal-hearth',
    'Communal Hearth',
    'Core',
    'Shared meals waste less food, restore the Khan and keep the people together.',
    'hearth',
    'ger',
    repeat({
      ongoing: {
        multipliers: { consumption: C.efficiency },
        bonuses: { commanderRecovery: C.recovery, resolveRecovery: C.recovery },
      },
    }),
    [82, 28],
  ),
  define(
    'wagon-yard',
    'Wagon Yard',
    'Core',
    'Stores and decorated carts carry the clan and its tools to another pasture.',
    'wagon',
    'wagon',
    repeat({
      ongoing: {
        multipliers: { mobility: C.mobility },
        bonuses: { arrivalMaterials: C.arrivalMaterials },
      },
      future: { storageCapacity: C.futureCapacity, relocationEfficiency: C.futureEfficiency },
    }),
    [84, 64],
  ),
  define(
    'archery-range',
    'Archery Range',
    'Military',
    'Riders practice the moving shot, improving ranged damage, firing cadence and piercing.',
    'bow',
    'archery',
    [
      { player: { damage: C.damage }, attackInterval: C.interval },
      { player: { damage: C.damage }, attackInterval: C.interval },
      { player: { damage: C.damage }, pierce: 1 },
    ],
  ),
  define(
    'smiths-forge',
    "Smith's Forge",
    'Military',
    'A portable forge strengthens weapons and prepares work for future equipment crafting.',
    'materials',
    'wagon',
    repeat({
      player: { damage: C.damage },
      ongoing: { multipliers: { clanProtection: C.protection } },
      future: { armourEffectiveness: C.futureEfficiency, equipmentCrafting: 1 },
    }),
  ),
  define(
    'warriors-training-ground',
    "Warrior's Training Ground",
    'Military',
    'Train a stronger escort and preserve room for future recruited companions.',
    'banner',
    'archery',
    repeat({
      ongoing: { multipliers: { riderDamage: C.production } },
      future: {
        companionCapacity: 1,
        companionStrength: C.futureEfficiency,
        companionAbilities: 1,
      },
    }),
  ),
  define(
    'scouts-watchpost',
    "Scout's Watchpost",
    'Military',
    'Scouts read the road ahead and practice locating distant supplies.',
    'mountain',
    'banner',
    repeat({
      player: { pickupRadius: C.range },
      ongoing: { bonuses: { arrivalMaterials: C.arrivalMaterials } },
      future: {
        explorationRadius: C.range,
        hiddenDiscovery: 1,
        expeditionRewards: C.futureEfficiency,
      },
    }),
  ),
  define(
    'fletchers-workshop',
    "Fletcher's Workshop",
    'Military',
    'Prepare additional shafts, careful fletching and specialised ammunition.',
    'bow',
    'ger',
    [
      { player: { projectiles: 1 } },
      { attackInterval: C.interval },
      { pierce: 1, unlocks: [{ building: 'archery', path: 'fire-arrows' }] },
    ],
  ),
  define(
    'palisade-watchfires',
    'Palisade & Watchfires',
    'Military',
    'Portable stakes and watchfires protect the households from attackers.',
    'sanctuary',
    'banner',
    repeat({
      ongoing: { multipliers: { clanProtection: C.protection } },
      future: { guardStrength: C.futureEfficiency },
    }),
  ),
  define(
    'hunting-lodge',
    'Hunting Lodge',
    'Economy & survival',
    'Hunters supplement the herd and prepare for future hunting expeditions.',
    'bow',
    'ger',
    repeat({
      ongoing: {
        multipliers: { foodProduction: C.production },
        bonuses: { arrivalFood: C.arrivalFood },
      },
      future: { rareAnimalResources: 1, huntingExpeditions: 1 },
    }),
  ),
  define(
    'artisans-ger',
    "Artisan's Ger",
    'Economy & survival',
    'Felt, clothing and shared tools make material gathering and resource use more efficient.',
    'materials',
    'ger',
    repeat({
      ongoing: { multipliers: { materialProduction: C.production, consumption: C.efficiency } },
      future: { craftingEfficiency: C.futureEfficiency, equipmentCrafting: 1 },
    }),
  ),
  define(
    'trading-post',
    'Trading Post',
    'Economy & survival',
    'A meeting place for merchants, recorded for future commerce and rare goods.',
    'wagon',
    'wagon',
    repeat({
      ongoing: { bonuses: { arrivalMaterials: C.arrivalMaterials } },
      future: { tradeRates: C.futureEfficiency, merchantInventory: 1, rareTradeResources: 1 },
    }),
  ),
  define(
    'healers-ger',
    "Healer's Ger",
    'Economy & survival',
    'Medicine strengthens the Khan and supports recovery while the clan rests.',
    'hearth',
    'ger',
    repeat({
      player: { maxHealth: C.health },
      ongoing: { bonuses: { commanderRecovery: C.recovery } },
      future: { healingEffectiveness: C.futureEfficiency },
    }),
  ),
  define(
    'sacred-ovoo',
    'Sacred Ovoo',
    'Spiritual & cultural',
    'A fictional sanctuary of the travelling clan, offering spiritual protection and stronger camp lightning.',
    'sanctuary',
    'sanctuary',
    repeat({
      ongoing: {
        multipliers: {
          spiritGain: C.production,
          sanctuaryInterval: C.interval,
          clanProtection: C.protection,
        },
      },
      future: { patronBlessings: C.futureEfficiency },
    }),
  ),
  define(
    'shamans-ger',
    "Shaman's Ger",
    'Spiritual & cultural',
    'A place for the story world’s spiritual arts; rituals and cleansing remain future mechanics.',
    'spirit',
    'ger',
    repeat({
      unlocks: [{ building: 'sanctuary', path: 'wind-shamans' }],
      ongoing: { multipliers: { burnDamage: C.production } },
      future: {
        spiritualAbilities: C.futureEfficiency,
        rituals: 1,
        corruptionCleansing: C.futureEfficiency,
      },
    }),
  ),
  define(
    'ancestral-standard',
    'Ancestral Standard',
    'Spiritual & cultural',
    'The clan’s ceremonial banner steadies the living host beneath its ancestral colours.',
    'banner',
    'banner',
    repeat({
      ongoing: {
        multipliers: { riderDamage: C.production },
        bonuses: { resolveRecovery: C.recovery },
      },
      future: { companionMorale: C.futureEfficiency, patronBonuses: C.futureEfficiency },
    }),
  ),
  define(
    'storytellers-hearth',
    "Storyteller's Hearth",
    'Spiritual & cultural',
    'Oral histories preserve knowledge, improving experience and technology progression while lore discoveries await future integration.',
    'journal',
    'ger',
    repeat({
      ongoing: { multipliers: { spiritGain: C.production } },
      experience: C.production,
      future: {
        loreDiscoveries: 1,
      },
    }),
  ),
];
export const CORE_NOMADIC_BUILDINGS = NOMADIC_BUILDINGS.filter((b) =>
  (CORE_CAMP_BUILDINGS as readonly string[]).includes(b.id),
);
export const OPTIONAL_NOMADIC_BUILDINGS = NOMADIC_BUILDINGS.filter((b) =>
  (OPTIONAL_CAMP_BUILDINGS as readonly string[]).includes(b.id),
);
export function nomadicBuilding(id: NomadicBuildingId): NomadicBuildingDefinition {
  return NOMADIC_BUILDINGS.find((b) => b.id === id)!;
}
