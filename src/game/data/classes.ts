import {
  CHARACTER_BACKGROUNDS,
  CHARACTER_BANNER_COLOURS,
  CHARACTER_BANNER_EMBLEMS,
  CHARACTER_BANNER_TRIMS,
  CHARACTER_CLASSES,
  CHARACTER_CLOTHING_COLOURS,
  CHARACTER_GENDERS,
  CHARACTER_HAIRSTYLES,
  CHARACTER_HEADGEAR,
  CHARACTER_MOUNTS,
  CHARACTER_OATHS,
  normalizeCharacterProfile,
  type CharacterBackgroundId,
  type CharacterBannerColourId,
  type CharacterBannerEmblemId,
  type CharacterBannerTrimId,
  type CharacterClassId,
  type CharacterClothingColourId,
  type CharacterGender,
  type CharacterHairstyleId,
  type CharacterHeadgearId,
  type CharacterMountId,
  type CharacterOathId,
  type CharacterProfile,
} from '../../shared/characterProfile.js';
import { GAME } from '../config.js';
import { applyCampEffects } from '../state/camp.js';
import type { CampEffectDefinition, PlayerStats, RunState } from '../types.js';

export {
  CHARACTER_BACKGROUNDS,
  CHARACTER_BANNER_COLOURS,
  CHARACTER_BANNER_EMBLEMS,
  CHARACTER_BANNER_TRIMS,
  CHARACTER_CLASSES,
  CHARACTER_CLOTHING_COLOURS,
  CHARACTER_GENDERS,
  CHARACTER_HAIRSTYLES,
  CHARACTER_HEADGEAR,
  CHARACTER_MOUNTS,
  CHARACTER_OATHS,
  type CharacterBackgroundId,
  type CharacterBannerColourId,
  type CharacterBannerEmblemId,
  type CharacterBannerTrimId,
  type CharacterClassId,
  type CharacterClothingColourId,
  type CharacterGender,
  type CharacterHairstyleId,
  type CharacterHeadgearId,
  type CharacterMountId,
  type CharacterOathId,
  type CharacterProfile,
};

export type ClassAbilitySlot = 'q' | 'w' | 'e' | 'r';

export type ClassAbilityEffect =
  | { kind: 'volley'; projectiles: number; damage: number }
  | { kind: 'arc'; range: number; angle: number; damage: number }
  | { kind: 'line'; range: number; width: number; damage: number }
  | { kind: 'pulse'; range: number; width: number; damage: number }
  | { kind: 'charge'; range: number; width: number; damage: number }
  | { kind: 'guard'; duration: number; heal: number }
  | { kind: 'ward'; duration: number; heal: number; resolve: number }
  | {
      kind: 'guardians';
      duration: number;
      count: number;
      attackEvery: number;
      range: number;
      damage: number;
      intercepts: number;
      interceptRange: number;
    }
  | { kind: 'gust'; range: number; width: number; damage: number; push: number }
  | {
      kind: 'ovoo';
      duration: number;
      range: number;
      slowDuration: number;
      spiritDamage: number;
      spiritRate: number;
    }
  | {
      kind: 'veil';
      duration: number;
      energyDuration: number;
      spiritMultiplier: number;
      spectralCopies: number;
      echoEvery: number;
      echoDamage: number;
    };

interface ClassAbilityBase {
  id: string;
  slot: ClassAbilitySlot;
  slotLabel: string;
  name: string;
  description: string;
  cooldown: number;
}

export type ClassAbilityDefinition = ClassAbilityBase & ClassAbilityEffect;

export interface ClassBasicAttackDefinition {
  name: string;
  description: string;
  shape: 'projectile' | 'line' | 'arc' | 'pulse';
  range: number;
  damage: number;
  /** Projectile collision width, line width, or arc angle in radians. */
  width: number;
  projectiles: number;
}

export interface ClassHeavyAttackDefinition extends ClassBasicAttackDefinition {
  cooldown: number;
  windup: number;
  charge?: {
    maxDuration: number;
    waveEvery: number;
    maxWaves: number;
    waveDelay: number;
    rangeStep: number;
    slowDuration: number;
  };
}

export interface ClassProgressionNode {
  level: number;
  id: string;
  title: string;
  summary: string;
  statBonuses?: Partial<PlayerStats>;
  attackIntervalMultiplier?: number;
  campEffects?: CampEffectDefinition;
}

export interface ClassWeaponDefinition {
  id: 'recurve-bow' | 'steppe-lance' | 'pagoda-saber' | 'ritual-staff';
  hudLabel: 'BOW' | 'LANCE' | 'SABER' | 'STAFF';
  title: string;
  secondaryTitle: string;
  description: string;
  projectileStyle: 'arrow' | 'lance-thrust' | 'saber-wave' | 'spirit-bolt';
  projectileTint: number;
  homingTurnRate: number;
  spreadAngle: number;
  pinsOnCharged: boolean;
  chargedExtraPierce: number;
  /** Damage multiplier for the Khan's charged volley with this weapon. */
  chargedDamage: number;
}

export interface ClassDefinition {
  id: CharacterClassId;
  title: string;
  subtitle: string;
  summary: string;
  stats: PlayerStats & {
    range: number;
    projectileSpeed: number;
    damageTakenMultiplier: number;
    passiveRegen: number;
    gallopCooldownMultiplier: number;
    gallopSpeedMultiplier: number;
    clanProtectionMultiplier: number;
  };
  weapon: ClassWeaponDefinition;
  basicAttack: ClassBasicAttackDefinition;
  heavyAttack: ClassHeavyAttackDefinition;
  abilities: readonly [
    ClassAbilityDefinition,
    ClassAbilityDefinition,
    ClassAbilityDefinition,
    ClassAbilityDefinition,
  ];
  keyTraits: readonly [string, string, string];
  progression: readonly [
    ClassProgressionNode,
    ClassProgressionNode,
    ClassProgressionNode,
    ClassProgressionNode,
  ];
}

export interface BackgroundDefinition {
  id: CharacterBackgroundId;
  title: string;
  summary: string;
  bonusLabel: string;
  bonuses: readonly string[];
  startingResources?: {
    food?: number;
    materials?: number;
    herd?: number;
    spirit?: number;
    population?: number;
  };
  statBonuses?: Partial<PlayerStats>;
  campEffects?: CampEffectDefinition;
}

export interface OathDefinition {
  id: CharacterOathId;
  title: string;
  summary: string;
  bonusLabel: string;
  startingResources?: {
    spirit?: number;
  };
  statBonuses?: Partial<PlayerStats>;
  campEffects?: CampEffectDefinition;
}

export interface HairstyleDefinition {
  id: CharacterHairstyleId;
  title: string;
  shortLabel: string;
}

export interface HeadgearDefinition {
  id: CharacterHeadgearId;
  title: string;
  shortLabel: string;
}

export interface ClothingColourDefinition {
  id: CharacterClothingColourId;
  title: string;
  hex: string;
  accentHex: string;
  trimHex: string;
  spriteTint: number;
}

export interface MountDefinition {
  id: CharacterMountId;
  title: string;
  subtitle: string;
  coatHex: string;
  maneHex: string;
  tackHex: string;
  spriteTint: number;
}

export interface BannerEmblemDefinition {
  id: CharacterBannerEmblemId;
  title: string;
}

export interface BannerColourDefinition {
  id: CharacterBannerColourId;
  title: string;
  hex: string;
  borderHex: string;
  spriteTint: number;
}

export interface BannerTrimDefinition {
  id: CharacterBannerTrimId;
  title: string;
  pattern: string;
}

export const CLASSES: readonly ClassDefinition[] = [
  {
    id: 'mounted-archer',
    title: 'Mounted Archer',
    subtitle: 'Swift Horseback Skirmisher',
    summary:
      'Masters of the composite recurve bow who loose relentless volleys on the move and strike with curved sabers when foes close in.',
    stats: {
      maxHealth: GAME.classes['mounted-archer'].health,
      speed: GAME.classes['mounted-archer'].speed,
      damage: GAME.classes['mounted-archer'].damage,
      attackInterval: GAME.classes['mounted-archer'].attackInterval,
      pickupRadius: GAME.classes['mounted-archer'].pickupRadius,
      projectiles: GAME.classes['mounted-archer'].projectiles,
      pierce: GAME.classes['mounted-archer'].pierce,
      range: GAME.classes['mounted-archer'].range,
      projectileSpeed: GAME.classes['mounted-archer'].projectileSpeed,
      damageTakenMultiplier: GAME.classes['mounted-archer'].damageTakenMultiplier,
      passiveRegen: GAME.classes['mounted-archer'].passiveRegen,
      gallopCooldownMultiplier: GAME.classes['mounted-archer'].gallopCooldownMultiplier,
      gallopSpeedMultiplier: GAME.classes['mounted-archer'].gallopSpeedMultiplier,
      clanProtectionMultiplier: GAME.classes['mounted-archer'].clanProtectionMultiplier,
    },
    weapon: {
      id: 'recurve-bow',
      hudLabel: 'BOW',
      title: 'Composite Recurve Bow',
      secondaryTitle: 'Curved Steppe Saber',
      description: 'Long-range composite bow paired with a fast close-quarters saber sweep.',
      projectileStyle: 'arrow',
      projectileTint: 0xf4dca8,
      homingTurnRate: 0,
      spreadAngle: 0.14,
      pinsOnCharged: false,
      chargedExtraPierce: GAME.classes['mounted-archer'].chargedExtraPierce,
      chargedDamage: GAME.classes['mounted-archer'].chargedDamage,
    },
    basicAttack: {
      name: 'Aimed Arrow',
      description: 'A fast composite-bow shot loosed directly toward the cursor.',
      ...GAME.classes['mounted-archer'].basic,
    },
    heavyAttack: {
      name: 'Drawn Power Shot',
      description: 'A fully drawn arrow that flies farther and strikes with crushing force.',
      ...GAME.classes['mounted-archer'].heavy,
    },
    abilities: [
      {
        id: 'flurry-arrow-volley',
        slot: 'q',
        slotLabel: '1',
        name: 'Flurry Arrow Volley',
        description: 'Fans seven quick arrows toward the cursor.',
        ...GAME.classes['mounted-archer'].abilities.q,
      },
      {
        id: 'saber-slash',
        slot: 'w',
        slotLabel: '2',
        name: 'Saber Close Slash',
        description: 'Sweeps a curved saber through a broad close arc.',
        ...GAME.classes['mounted-archer'].abilities.w,
      },
      {
        id: 'circling-shot',
        slot: 'e',
        slotLabel: '3',
        name: 'Circling Shot',
        description: 'Looses an eleven-arrow fan to open an escape route.',
        ...GAME.classes['mounted-archer'].abilities.e,
      },
      {
        id: 'windrunner',
        slot: 'r',
        slotLabel: '4',
        name: 'Windrunner',
        description: 'Bursts forward and cuts a damaging lane through the horde.',
        ...GAME.classes['mounted-archer'].abilities.r,
      },
    ],
    keyTraits: ['Ranged Harassment', 'High Mobility', 'Hit-and-Fade'],
    progression: [
      {
        level: 3,
        id: 'thumb-ring-draw',
        title: 'Thumb-Ring Draw',
        summary: '+1 Projectile per Volley, -0.04s Attack Interval',
        statBonuses: { projectiles: 1, attackInterval: -0.04 },
      },
      {
        level: 6,
        id: 'twin-nock-quiver',
        title: 'Twin-Nock Quiver',
        summary: '+3 Bow Damage, +12 Movement Speed',
        statBonuses: { damage: 3, speed: 12 },
      },
      {
        level: 10,
        id: 'bone-tipped-bodkins',
        title: 'Bone-Tipped Bodkins',
        summary: '+1 Arrow Pierce, +4 Bow Damage',
        statBonuses: { pierce: 1, damage: 4 },
      },
      {
        level: 15,
        id: 'eagle-eye-mastery',
        title: 'Eagle-Eye Mastery',
        summary: '+1 Projectile, +12 Movement Speed',
        statBonuses: { projectiles: 1, speed: 12 },
      },
    ],
  },
  {
    id: 'lancer',
    title: 'Lancer',
    subtitle: 'Shock Cavalry Vanguard',
    summary:
      'Shock horsemen who couch heavy ash-wood lances to impale lines of foes and shatter formations with devastating charges.',
    stats: {
      maxHealth: GAME.classes.lancer.health,
      speed: GAME.classes.lancer.speed,
      damage: GAME.classes.lancer.damage,
      attackInterval: GAME.classes.lancer.attackInterval,
      pickupRadius: GAME.classes.lancer.pickupRadius,
      projectiles: GAME.classes.lancer.projectiles,
      pierce: GAME.classes.lancer.pierce,
      range: GAME.classes.lancer.range,
      projectileSpeed: GAME.classes.lancer.projectileSpeed,
      damageTakenMultiplier: GAME.classes.lancer.damageTakenMultiplier,
      passiveRegen: GAME.classes.lancer.passiveRegen,
      gallopCooldownMultiplier: GAME.classes.lancer.gallopCooldownMultiplier,
      gallopSpeedMultiplier: GAME.classes.lancer.gallopSpeedMultiplier,
      clanProtectionMultiplier: GAME.classes.lancer.clanProtectionMultiplier,
    },
    weapon: {
      id: 'steppe-lance',
      hudLabel: 'LANCE',
      title: 'Couched Steppe Lance',
      secondaryTitle: 'Haft Sweeping Strike',
      description: 'High-impact piercing lance thrusts that skewer columns of enemies.',
      projectileStyle: 'lance-thrust',
      projectileTint: 0xf2b36d,
      homingTurnRate: 0,
      spreadAngle: 0.08,
      pinsOnCharged: true,
      chargedExtraPierce: GAME.classes.lancer.chargedExtraPierce,
      chargedDamage: GAME.classes.lancer.chargedDamage,
    },
    basicAttack: {
      name: 'Couched Thrust',
      description: 'A short, forceful lance thrust through enemies in a narrow line.',
      ...GAME.classes.lancer.basic,
    },
    heavyAttack: {
      name: 'Charging Thrust',
      description: 'A braced forward thrust that punches through a longer, broader lane.',
      ...GAME.classes.lancer.heavy,
    },
    abilities: [
      {
        id: 'sweeping-strike',
        slot: 'q',
        slotLabel: '1',
        name: 'Sweeping Strike',
        description: 'Cleaves a wide haft-and-blade arc ahead of the mount.',
        ...GAME.classes.lancer.abilities.q,
      },
      {
        id: 'devastating-charge',
        slot: 'w',
        slotLabel: '2',
        name: 'Devastating Charge',
        description: 'Surges forward behind a crushing, deep-piercing thrust.',
        ...GAME.classes.lancer.abilities.w,
      },
      {
        id: 'line-breaker',
        slot: 'e',
        slotLabel: '3',
        name: 'Line Breaker',
        description: 'Drives a braced lance through a long, broad enemy line.',
        ...GAME.classes.lancer.abilities.e,
      },
      {
        id: 'shock-lance',
        slot: 'r',
        slotLabel: '4',
        name: 'Shock Lance',
        description: 'Gallops through a long breakthrough lane with the lance locked low.',
        ...GAME.classes.lancer.abilities.r,
      },
    ],
    keyTraits: ['Piercing Reach', 'Devastating Charge', 'Line Breaker'],
    progression: [
      {
        level: 3,
        id: 'ash-wood-shaft',
        title: 'Ash-Wood Shaft',
        summary: '+4 Lance Damage, +1 Pierce',
        statBonuses: { damage: 4, pierce: 1 },
      },
      {
        level: 6,
        id: 'stirrup-bracing',
        title: 'Stirrup Bracing',
        summary: '+15 Max Health, +10 Movement Speed',
        statBonuses: { maxHealth: 15, speed: 10 },
      },
      {
        level: 10,
        id: 'steel-pennon-point',
        title: 'Steel Pennon Point',
        summary: '+5 Lance Damage, -8% Attack Interval',
        statBonuses: { damage: 5 },
        attackIntervalMultiplier: 0.92,
      },
      {
        level: 15,
        id: 'thunder-of-hooves',
        title: 'Thunder of Hooves',
        summary: '+1 Thrust Wave, +1 Pierce, +20 Max Health',
        statBonuses: { projectiles: 1, pierce: 1, maxHealth: 20 },
      },
    ],
  },
  {
    id: 'iron-pagoda',
    title: 'Iron Pagoda',
    subtitle: 'Cataphract Heavy Bulwark',
    summary:
      'Clad head-to-hoof in heavy lamellar armor, the Iron Pagoda anchors the clan line with unyielding stances and crushing saber cleaves.',
    stats: {
      maxHealth: GAME.classes['iron-pagoda'].health,
      speed: GAME.classes['iron-pagoda'].speed,
      damage: GAME.classes['iron-pagoda'].damage,
      attackInterval: GAME.classes['iron-pagoda'].attackInterval,
      pickupRadius: GAME.classes['iron-pagoda'].pickupRadius,
      projectiles: GAME.classes['iron-pagoda'].projectiles,
      pierce: GAME.classes['iron-pagoda'].pierce,
      range: GAME.classes['iron-pagoda'].range,
      projectileSpeed: GAME.classes['iron-pagoda'].projectileSpeed,
      damageTakenMultiplier: GAME.classes['iron-pagoda'].damageTakenMultiplier,
      passiveRegen: GAME.classes['iron-pagoda'].passiveRegen,
      gallopCooldownMultiplier: GAME.classes['iron-pagoda'].gallopCooldownMultiplier,
      gallopSpeedMultiplier: GAME.classes['iron-pagoda'].gallopSpeedMultiplier,
      clanProtectionMultiplier: GAME.classes['iron-pagoda'].clanProtectionMultiplier,
    },
    weapon: {
      id: 'pagoda-saber',
      hudLabel: 'SABER',
      title: 'Heavy Cavalry Saber',
      secondaryTitle: 'Lamellar Greatshield',
      description: 'Twin wide saber shock-arcs backed by cataphract armor and shield slams.',
      projectileStyle: 'saber-wave',
      projectileTint: 0xd8dee9,
      homingTurnRate: 0,
      spreadAngle: 0.22,
      pinsOnCharged: true,
      chargedExtraPierce: GAME.classes['iron-pagoda'].chargedExtraPierce,
      chargedDamage: GAME.classes['iron-pagoda'].chargedDamage,
    },
    basicAttack: {
      name: 'Heavy Saber Arc',
      description: 'A wide close cavalry-saber cut aimed toward the cursor.',
      ...GAME.classes['iron-pagoda'].basic,
    },
    heavyAttack: {
      name: 'Overhead Cleave',
      description: 'A deliberate overhead blow that crushes a larger close arc.',
      ...GAME.classes['iron-pagoda'].heavy,
    },
    abilities: [
      {
        id: 'crushing-aura',
        slot: 'q',
        slotLabel: '1',
        name: 'Crushing Aura',
        description: 'Crushes every enemy pressing close to the armored mount.',
        ...GAME.classes['iron-pagoda'].abilities.q,
      },
      {
        id: 'unbreakable-stance',
        slot: 'w',
        slotLabel: '2',
        name: 'Unbreakable Stance',
        description: 'Locks the lamellar guard, briefly preventing harm and mending wounds.',
        ...GAME.classes['iron-pagoda'].abilities.w,
      },
      {
        id: 'shield-bash',
        slot: 'e',
        slotLabel: '3',
        name: 'Shield Bash',
        description: 'Smashes a broad lane ahead with shield and armored horse.',
        ...GAME.classes['iron-pagoda'].abilities.e,
      },
      {
        id: 'shielded-advance',
        slot: 'r',
        slotLabel: '4',
        name: 'Shielded Advance',
        description: 'Surges forward behind the shield through a broad enemy lane.',
        ...GAME.classes['iron-pagoda'].abilities.r,
      },
    ],
    keyTraits: ['Unbreakable Armor', 'Battlefield Presence', 'Frontline Bulwark'],
    progression: [
      {
        level: 3,
        id: 'riveted-lamellar',
        title: 'Riveted Lamellar',
        summary: '+25 Max Health, +3 Saber Damage',
        statBonuses: { maxHealth: 25, damage: 3 },
      },
      {
        level: 6,
        id: 'bulwark-discipline',
        title: 'Bulwark Discipline',
        summary: '+1 Pierce, +1 Cleave Arc',
        statBonuses: { pierce: 1, projectiles: 1 },
      },
      {
        level: 10,
        id: 'tempered-edge',
        title: 'Tempered Edge',
        summary: '+5 Saber Damage, +1 Pierce',
        statBonuses: { damage: 5, pierce: 1 },
      },
      {
        level: 15,
        id: 'mountain-unmoved',
        title: 'Mountain Unmoved',
        summary: '+35 Max Health, -8% Attack Interval',
        statBonuses: { maxHealth: 35 },
        attackIntervalMultiplier: 0.92,
      },
    ],
  },
  {
    id: 'spirit-caller',
    title: 'Spirit Caller',
    subtitle: 'Ancestral Wind Channeler',
    summary:
      'A conduit between the living clan and the eternal sky who gathers spiritual energy, summons Ongod guardians, and parts the veil between worlds.',
    stats: {
      maxHealth: GAME.classes['spirit-caller'].health,
      speed: GAME.classes['spirit-caller'].speed,
      damage: GAME.classes['spirit-caller'].damage,
      attackInterval: GAME.classes['spirit-caller'].attackInterval,
      pickupRadius: GAME.classes['spirit-caller'].pickupRadius,
      projectiles: GAME.classes['spirit-caller'].projectiles,
      pierce: GAME.classes['spirit-caller'].pierce,
      range: GAME.classes['spirit-caller'].range,
      projectileSpeed: GAME.classes['spirit-caller'].projectileSpeed,
      damageTakenMultiplier: GAME.classes['spirit-caller'].damageTakenMultiplier,
      passiveRegen: GAME.classes['spirit-caller'].passiveRegen,
      gallopCooldownMultiplier: GAME.classes['spirit-caller'].gallopCooldownMultiplier,
      gallopSpeedMultiplier: GAME.classes['spirit-caller'].gallopSpeedMultiplier,
      clanProtectionMultiplier: GAME.classes['spirit-caller'].clanProtectionMultiplier,
    },
    weapon: {
      id: 'ritual-staff',
      hudLabel: 'STAFF',
      title: 'Antler Ritual Staff',
      secondaryTitle: 'Sacred Spirit Drum',
      description:
        'Channels twin homing turquoise spirit bolts and resonant ancestral drum pulses.',
      projectileStyle: 'spirit-bolt',
      projectileTint: 0x72e0d1,
      homingTurnRate: 0.45,
      spreadAngle: 0.18,
      pinsOnCharged: true,
      chargedExtraPierce: GAME.classes['spirit-caller'].chargedExtraPierce,
      chargedDamage: GAME.classes['spirit-caller'].chargedDamage,
    },
    basicAttack: {
      name: 'Spirit Wisps',
      description: 'Small homing wisps that generate spiritual energy whenever they hit.',
      ...GAME.classes['spirit-caller'].basic,
    },
    heavyAttack: {
      name: 'Ancestral Drum',
      description: 'An expanding slowing shockwave; hold longer to release up to three waves.',
      ...GAME.classes['spirit-caller'].heavy,
    },
    abilities: [
      {
        id: 'ongod-guardians',
        slot: 'q',
        slotLabel: '1',
        name: 'Ongod Guardians',
        description: 'Summons two spirits that attack nearby foes and intercept four shots.',
        ...GAME.classes['spirit-caller'].abilities.q,
      },
      {
        id: 'wind-of-tengri',
        slot: 'w',
        slotLabel: '2',
        name: 'Wind of Tengri',
        description: 'Drives a damaging gust through a broad lane and pushes enemies away.',
        ...GAME.classes['spirit-caller'].abilities.w,
      },
      {
        id: 'sacred-ovoo',
        slot: 'e',
        slotLabel: '3',
        name: 'Sacred Ovoo',
        description: 'Raises a slowing sacred area that empowers spirits fighting within it.',
        ...GAME.classes['spirit-caller'].abilities.e,
      },
      {
        id: 'veil-between-worlds',
        slot: 'r',
        slotLabel: '4',
        name: 'Veil Between Worlds',
        description: 'Multiplies active spirits and creates spectral echoes of Spirit Wisps.',
        ...GAME.classes['spirit-caller'].abilities.r,
      },
    ],
    keyTraits: ['Spiritual Energy', 'Ongod Guardians', 'Veil Between Worlds'],
    progression: [
      {
        level: 3,
        id: 'resonant-drumskin',
        title: 'Resonant Drumskin',
        summary: '+1 Spirit Bolt Projectile, +18 Pickup Radius',
        statBonuses: { projectiles: 1, pickupRadius: 18 },
      },
      {
        level: 6,
        id: 'ancestral-chorus',
        title: 'Ancestral Chorus',
        summary: '+3 Spirit Bolt Damage, -0.05s Attack Interval',
        statBonuses: { damage: 3, attackInterval: -0.05 },
      },
      {
        level: 10,
        id: 'sky-touched-focus',
        title: 'Sky-Touched Focus',
        summary: '+1 Pierce, -8% Attack Interval',
        statBonuses: { pierce: 1 },
        attackIntervalMultiplier: 0.92,
      },
      {
        level: 15,
        id: 'tengris-conduit',
        title: 'Tengri’s Conduit',
        summary: '+1 Spirit Bolt Projectile, +4 Damage, +15 Max Health',
        statBonuses: { projectiles: 1, damage: 4, maxHealth: 15 },
      },
    ],
  },
] as const;

export const BACKGROUNDS: readonly BackgroundDefinition[] = [
  {
    id: 'steppe-herder',
    title: 'Steppe Herder',
    summary:
      'Raised among the great horse herds of the open grass sea, reading wind and pasture at a glance.',
    bonusLabel: '+2 Herd · +12 Food · -8% Pasture Depletion',
    bonuses: ['+2 Starting Herd', '+12 Starting Food', '-8% Pasture Depletion'],
    startingResources: {
      herd: GAME.backgrounds['steppe-herder'].herd,
      food: GAME.backgrounds['steppe-herder'].food,
    },
    campEffects: {
      multipliers: { pastureUse: GAME.backgrounds['steppe-herder'].pastureUse },
    },
  },
  {
    id: 'imperial-retainer',
    title: 'Imperial Retainer',
    summary:
      'Trained in the discipline of frontier garrisons and armored escorts before the Sundering.',
    bonusLabel: '+15 Max Health · +8% Clan Protection',
    bonuses: ['+15 Khan Max Health', '+8% Clan Protection'],
    statBonuses: {
      maxHealth: GAME.backgrounds['imperial-retainer'].maxHealth,
    },
    campEffects: {
      multipliers: { clanProtection: GAME.backgrounds['imperial-retainer'].clanProtection },
    },
  },
  {
    id: 'artisan',
    title: 'Artisan',
    summary:
      'Skilled in bowcraft, felt-fulling, and wagon joinery prized by every migrating household.',
    bonusLabel: '+18 Materials · +10% Material Gathering',
    bonuses: ['+18 Starting Materials', '+10% Material Production'],
    startingResources: {
      materials: GAME.backgrounds.artisan.materials,
    },
    campEffects: {
      multipliers: { materialProduction: GAME.backgrounds.artisan.materialProduction },
    },
  },
  {
    id: 'caravan-trader',
    title: 'Caravan Trader',
    summary:
      'Seasoned along the ridge passes and river fords where scouts and pack-trains barter for survival.',
    bonusLabel: '+10 Food · +10 Materials · +6% Caravan Mobility',
    bonuses: ['+10 Starting Food', '+10 Starting Materials', '+6% Caravan Mobility'],
    startingResources: {
      food: GAME.backgrounds['caravan-trader'].food,
      materials: GAME.backgrounds['caravan-trader'].materials,
    },
    campEffects: {
      multipliers: { mobility: GAME.backgrounds['caravan-trader'].mobility },
    },
  },
  {
    id: 'ritual-apprentice',
    title: 'Ritual Apprentice',
    summary:
      'Kept the ovoo cairns and ancestral hearth-offerings under the guidance of steppe elders.',
    bonusLabel: '+10 Spirit · +15% Spirit Gain',
    bonuses: ['+10 Starting Spirit', '+15% Spirit Gain'],
    startingResources: {
      spirit: GAME.backgrounds['ritual-apprentice'].spirit,
    },
    campEffects: {
      multipliers: { spiritGain: GAME.backgrounds['ritual-apprentice'].spiritGain },
    },
  },
] as const;

export const OATHS: readonly OathDefinition[] = [
  {
    id: 'oath-of-the-steppe',
    title: 'Oath of the Steppe',
    summary: 'Swear to keep the herds moving and never let the horizon close around your people.',
    bonusLabel: '+8 Movement Speed · +8% Caravan Mobility',
    statBonuses: { speed: GAME.oaths['oath-of-the-steppe'].speed },
    campEffects: { multipliers: { mobility: GAME.oaths['oath-of-the-steppe'].mobility } },
  },
  {
    id: 'oath-of-the-khan',
    title: 'Oath of the Khan',
    summary:
      'Swear to ride first into every ambush and bear the weight of command in iron and blood.',
    bonusLabel: '+3 Weapon Damage · +10% Rider Host Damage',
    statBonuses: { damage: GAME.oaths['oath-of-the-khan'].damage },
    campEffects: { multipliers: { riderDamage: GAME.oaths['oath-of-the-khan'].riderDamage } },
  },
  {
    id: 'oath-of-the-spirits',
    title: 'Oath of the Spirits',
    summary:
      'Swear to honor the sky cairns and preserve the memory of every household through the storm.',
    bonusLabel: '+8 Starting Spirit · +0.12/s Resolve Recovery',
    startingResources: { spirit: GAME.oaths['oath-of-the-spirits'].spirit },
    campEffects: {
      bonuses: { resolveRecovery: GAME.oaths['oath-of-the-spirits'].resolveRecovery },
    },
  },
] as const;

export const HAIRSTYLES: readonly HairstyleDefinition[] = [
  { id: 'warrior-plaits', title: 'Warrior Plaits', shortLabel: 'Plaits' },
  { id: 'topknot', title: 'Steppe Topknot', shortLabel: 'Topknot' },
  { id: 'twin-braids', title: 'Twin Braids', shortLabel: 'Braids' },
  { id: 'flowing-locks', title: 'Wind-Swept Locks', shortLabel: 'Locks' },
  { id: 'shaved-tresses', title: 'Rider’s Chuprun', shortLabel: 'Chuprun' },
] as const;

export const HEADGEAR_OPTIONS: readonly HeadgearDefinition[] = [
  { id: 'sable-cap', title: 'Sable-Trimmed Cap', shortLabel: 'Sable Cap' },
  { id: 'felt-kalpak', title: 'Stitched Felt Kalpak', shortLabel: 'Kalpak' },
  { id: 'plumed-cap', title: 'Owl-Plume Cap', shortLabel: 'Plumed Cap' },
  { id: 'lamellar-helm', title: 'Iron Lamellar Helm', shortLabel: 'Iron Helm' },
  { id: 'wolfskin-hood', title: 'Steppe Wolf Hood', shortLabel: 'Wolf Hood' },
] as const;

export const CLOTHING_COLOURS: readonly ClothingColourDefinition[] = [
  {
    id: 'ivory',
    title: 'Undyed Ivory Felt',
    hex: '#e7dcc6',
    accentHex: '#b94832',
    trimHex: '#c9933b',
    spriteTint: 0xffffff,
  },
  {
    id: 'vermilion',
    title: 'Vermilion Silk',
    hex: '#b94832',
    accentHex: '#d9aa4c',
    trimHex: '#f0dfbe',
    spriteTint: 0xf4a593,
  },
  {
    id: 'ochre',
    title: 'Golden Ochre',
    hex: '#c9933b',
    accentHex: '#7a2f22',
    trimHex: '#f2e4c4',
    spriteTint: 0xf5d693,
  },
  {
    id: 'lapis',
    title: 'Lapis Indigo',
    hex: '#2e4d73',
    accentHex: '#d9aa4c',
    trimHex: '#dce6f2',
    spriteTint: 0x9ec0e6,
  },
  {
    id: 'sage',
    title: 'Steppe Sage',
    hex: '#4f6d52',
    accentHex: '#c9933b',
    trimHex: '#e2ebdc',
    spriteTint: 0xb2d4b5,
  },
  {
    id: 'umber',
    title: 'Chestnut Umber',
    hex: '#6d442a',
    accentHex: '#d8c39e',
    trimHex: '#c9933b',
    spriteTint: 0xd9b091,
  },
  {
    id: 'charcoal',
    title: 'Ash & Iron',
    hex: '#3a3b40',
    accentHex: '#489399',
    trimHex: '#d4c8b0',
    spriteTint: 0xbec3cf,
  },
] as const;

export const MOUNTS: readonly MountDefinition[] = [
  {
    id: 'bay',
    title: 'Chestnut Bay Courser',
    subtitle: 'Sure-footed steppe bay with dark points',
    coatHex: '#8b4c2b',
    maneHex: '#241710',
    tackHex: '#b94832',
    spriteTint: 0xffffff,
  },
  {
    id: 'white',
    title: 'Sacred White Steed',
    subtitle: 'Silver-maned ceremonial courser of the sky herds',
    coatHex: '#e6dfd1',
    maneHex: '#b8ae9c',
    tackHex: '#c9933b',
    spriteTint: 0xf7f4ec,
  },
  {
    id: 'black',
    title: 'Night-Maned Stallion',
    subtitle: 'Deep obsidian charger bred for night raids',
    coatHex: '#2f3138',
    maneHex: '#15161a',
    tackHex: '#b94832',
    spriteTint: 0xa2a9ba,
  },
  {
    id: 'dun',
    title: 'Golden Steppe Dun',
    subtitle: 'Dorsal-striped buckskin tireless across long marches',
    coatHex: '#c89b54',
    maneHex: '#332214',
    tackHex: '#2e4d73',
    spriteTint: 0xf3d89c,
  },
  {
    id: 'piebald',
    title: 'Cloud-Dappled Tobiano',
    subtitle: 'Piebald warhorse prized by vanguard outriders',
    coatHex: '#9c6844',
    maneHex: '#ede6d8',
    tackHex: '#4f6d52',
    spriteTint: 0xe8cab0,
  },
] as const;

export const BANNER_EMBLEMS: readonly BannerEmblemDefinition[] = [
  { id: 'flame-sun', title: 'Sun & Moon Soyombo' },
  { id: 'wolf', title: 'Ashina Wolf' },
  { id: 'hawk', title: 'White Saker Falcon' },
  { id: 'cloud', title: 'Cloud-Scroll Crest' },
  { id: 'knot', title: 'Endless Steppe Knot' },
] as const;

export const BANNER_COLOURS: readonly BannerColourDefinition[] = [
  { id: 'ivory', title: 'Ivory Silk', hex: '#e7dcc6', borderHex: '#8c6239', spriteTint: 0xf2ead8 },
  {
    id: 'vermilion',
    title: 'Vermilion Lacquer',
    hex: '#b94832',
    borderHex: '#d9aa4c',
    spriteTint: 0xe3826d,
  },
  { id: 'lapis', title: 'Lapis Sky', hex: '#2e4d73', borderHex: '#d9aa4c', spriteTint: 0x7ba6d9 },
  { id: 'sage', title: 'Jade Steppe', hex: '#4f6d52', borderHex: '#d8c39e', spriteTint: 0x93bd97 },
  {
    id: 'ochre',
    title: 'Golden Ochre',
    hex: '#c9933b',
    borderHex: '#6d2b1f',
    spriteTint: 0xedc472,
  },
  { id: 'umber', title: 'Sable Umber', hex: '#6d442a', borderHex: '#d9aa4c', spriteTint: 0xc29272 },
] as const;

export const BANNER_TRIMS: readonly BannerTrimDefinition[] = [
  { id: 'steppe-fret', title: 'Key-Fret Border', pattern: 'fret' },
  { id: 'cloud-scroll', title: 'Cloud-Scroll Trim', pattern: 'cloud' },
  { id: 'horn-curl', title: 'Ram-Horn Ornament', pattern: 'horn' },
  { id: 'braided-cord', title: 'Braided Horsehair', pattern: 'braid' },
  { id: 'lattice-band', title: 'Ger Lattice Band', pattern: 'lattice' },
] as const;

export function classDefinition(classId?: CharacterClassId): ClassDefinition {
  return CLASSES.find((entry) => entry.id === classId) ?? CLASSES[0]!;
}

export function backgroundDefinition(backgroundId?: CharacterBackgroundId): BackgroundDefinition {
  return BACKGROUNDS.find((entry) => entry.id === backgroundId) ?? BACKGROUNDS[0]!;
}

export function oathDefinition(oathId?: CharacterOathId): OathDefinition {
  return OATHS.find((entry) => entry.id === oathId) ?? OATHS[0]!;
}

export function hairstyleDefinition(hairstyleId?: CharacterHairstyleId): HairstyleDefinition {
  return HAIRSTYLES.find((entry) => entry.id === hairstyleId) ?? HAIRSTYLES[0]!;
}

export function headgearDefinition(headgearId?: CharacterHeadgearId): HeadgearDefinition {
  return HEADGEAR_OPTIONS.find((entry) => entry.id === headgearId) ?? HEADGEAR_OPTIONS[0]!;
}

export function clothingColourDefinition(
  colourId?: CharacterClothingColourId,
): ClothingColourDefinition {
  return CLOTHING_COLOURS.find((entry) => entry.id === colourId) ?? CLOTHING_COLOURS[0]!;
}

export function mountDefinition(mountId?: CharacterMountId): MountDefinition {
  return MOUNTS.find((entry) => entry.id === mountId) ?? MOUNTS[0]!;
}

export function bannerEmblemDefinition(emblemId?: CharacterBannerEmblemId): BannerEmblemDefinition {
  return BANNER_EMBLEMS.find((entry) => entry.id === emblemId) ?? BANNER_EMBLEMS[0]!;
}

export function bannerColourDefinition(colourId?: CharacterBannerColourId): BannerColourDefinition {
  return BANNER_COLOURS.find((entry) => entry.id === colourId) ?? BANNER_COLOURS[0]!;
}

export function bannerTrimDefinition(trimId?: CharacterBannerTrimId): BannerTrimDefinition {
  return BANNER_TRIMS.find((entry) => entry.id === trimId) ?? BANNER_TRIMS[0]!;
}

function blendTint(first: number, second: number): number {
  const r1 = (first >> 16) & 0xff;
  const g1 = (first >> 8) & 0xff;
  const b1 = first & 0xff;
  const r2 = (second >> 16) & 0xff;
  const g2 = (second >> 8) & 0xff;
  const b2 = second & 0xff;
  const r = Math.round(r1 * 0.6 + r2 * 0.4);
  const g = Math.round(g1 * 0.6 + g2 * 0.4);
  const b = Math.round(b1 * 0.6 + b2 * 0.4);
  return (r << 16) | (g << 8) | b;
}

const CLASS_BASE_TINTS: Readonly<Record<CharacterClassId, number>> = {
  'mounted-archer': 0xffffff,
  lancer: 0xf5d6a7,
  'iron-pagoda': 0xcfd8e6,
  'spirit-caller': 0xb8efe6,
};

export function playerVisualConfig(character?: CharacterProfile): {
  textureKey: string;
  framePrefix: string;
  baseTint: number;
} {
  const classId = character?.classId ?? 'mounted-archer';
  const clothing = clothingColourDefinition(character?.clothingColour);
  const mount = mountDefinition(character?.mount);
  const classTint = CLASS_BASE_TINTS[classId];
  const customTint =
    clothing.id === 'ivory' && mount.id === 'bay'
      ? 0xffffff
      : blendTint(clothing.spriteTint, mount.spriteTint);
  const baseTint =
    classTint === 0xffffff
      ? customTint
      : customTint === 0xffffff
        ? classTint
        : blendTint(classTint, customTint);
  return {
    textureKey: 'steppe-mounted-motion',
    framePrefix: 'player',
    baseTint,
  };
}

export function khanBasicRange(run: Pick<RunState, 'character' | 'clan'>): number {
  return (
    classDefinition(run.character?.classId).basicAttack.range + run.clan.campEffects.bonuses.range
  );
}

export function khanHeavyRange(run: Pick<RunState, 'character' | 'clan'>): number {
  return (
    classDefinition(run.character?.classId).heavyAttack.range + run.clan.campEffects.bonuses.range
  );
}

/** Khan gallop speed in world units per second, including the class gallop modifier. */
export function khanGallopSpeed(run: Pick<RunState, 'character'>): number {
  return GAME.dash.speed * classDefinition(run.character?.classId).stats.gallopSpeedMultiplier;
}

function applyStatDelta(run: RunState, bonuses?: Partial<PlayerStats>): void {
  if (!bonuses) return;
  if (bonuses.maxHealth) {
    run.stats.maxHealth += bonuses.maxHealth;
    if (run.khan.successionRemaining === 0 && run.health > 0) {
      run.health = Math.min(run.stats.maxHealth, run.health + bonuses.maxHealth);
    }
  }
  if (bonuses.speed) run.stats.speed += bonuses.speed;
  if (bonuses.damage) run.stats.damage += bonuses.damage;
  if (bonuses.attackInterval) {
    run.stats.attackInterval = Math.max(
      0.18,
      Number((run.stats.attackInterval + bonuses.attackInterval).toFixed(3)),
    );
  }
  if (bonuses.pickupRadius) run.stats.pickupRadius += bonuses.pickupRadius;
  if (bonuses.projectiles) run.stats.projectiles += bonuses.projectiles;
  if (bonuses.pierce) run.stats.pierce += bonuses.pierce;
}

/**
 * Applies the selected character profile's class stats, background starting bonus,
 * and oath starting bonus to a newly initialized run.
 */
export function applyCharacterLoadout(run: RunState, rawProfile: CharacterProfile): void {
  const profile = normalizeCharacterProfile(rawProfile);
  run.character = profile;
  const cls = classDefinition(profile.classId);
  const start = GAME.clan.starts[run.startingTradition ?? 'shared-hearth'];

  run.stats = {
    maxHealth: cls.stats.maxHealth,
    speed: Math.round(cls.stats.speed * start.speed),
    damage: cls.stats.damage,
    attackInterval: cls.stats.attackInterval,
    pickupRadius: Math.round(cls.stats.pickupRadius * start.pickup),
    projectiles: cls.stats.projectiles,
    pierce: cls.stats.pierce,
  };
  run.health = run.stats.maxHealth;

  if (cls.stats.clanProtectionMultiplier !== 1) {
    run.clan.campEffects.multipliers.clanProtection *= cls.stats.clanProtectionMultiplier;
  }
  if (cls.stats.gallopCooldownMultiplier !== 1) {
    run.clan.campEffects.multipliers.gallopCooldown *= cls.stats.gallopCooldownMultiplier;
  }
  if (cls.stats.passiveRegen > 0) {
    run.clan.campEffects.bonuses.commanderRecovery += cls.stats.passiveRegen;
  }

  const background = backgroundDefinition(profile.background);
  if (background.startingResources) {
    if (background.startingResources.food) run.clan.food += background.startingResources.food;
    if (background.startingResources.materials)
      run.clan.materials += background.startingResources.materials;
    if (background.startingResources.herd)
      run.clan.herd = Math.min(
        GAME.clan.maxHerd,
        run.clan.herd + background.startingResources.herd,
      );
    if (background.startingResources.spirit) run.clan.spirit += background.startingResources.spirit;
    if (background.startingResources.population)
      run.clan.population = Math.min(
        GAME.clan.maxPopulation,
        run.clan.population + background.startingResources.population,
      );
  }
  applyStatDelta(run, background.statBonuses);
  applyCampEffects(run.clan.campEffects, background.campEffects);

  const oath = oathDefinition(profile.oath);
  if (oath.startingResources?.spirit) {
    run.clan.spirit += oath.startingResources.spirit;
  }
  applyStatDelta(run, oath.statBonuses);
  applyCampEffects(run.clan.campEffects, oath.campEffects);
}

/**
 * Applies any class progression milestones unlocked between `previousLevel` and `nextLevel`.
 */
export function applyClassProgressionMilestones(
  run: RunState,
  previousLevel: number,
  nextLevel: number,
): ClassProgressionNode[] {
  const cls = classDefinition(run.character?.classId);
  const unlocked: ClassProgressionNode[] = [];
  for (const node of cls.progression) {
    if (node.level > previousLevel && node.level <= nextLevel) {
      applyStatDelta(run, node.statBonuses);
      if (node.attackIntervalMultiplier) {
        run.stats.attackInterval = Math.max(
          0.18,
          Number((run.stats.attackInterval * node.attackIntervalMultiplier).toFixed(3)),
        );
      }
      applyCampEffects(run.clan.campEffects, node.campEffects);
      unlocked.push(node);
    }
  }
  return unlocked;
}
