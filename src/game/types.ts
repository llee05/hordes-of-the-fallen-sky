import type { CharacterProfile } from '../shared/characterProfile.js';
import type { NomadicCamp } from '../shared/nomadicCamp.js';
import type { DeveloperConsoleSnapshot } from './dev/commands';
import type { GuidanceState } from './state/guidance';
import type { ClanLegacy } from './state/legacy';

export type RunPhase =
  | 'ready'
  | 'traditions'
  | 'character'
  | 'playing'
  | 'paused'
  | 'saves'
  | 'building'
  | 'route'
  | 'journal'
  | 'settings'
  | 'help'
  | 'developer'
  | 'console'
  | 'dead';
export type JourneyStage = 'camp' | 'migration';
export type BuildingId =
  'ger' | 'archery' | 'herd' | 'sanctuary' | 'wagon' | 'felt' | 'provisions' | 'relay';
export type Formation = 'guard' | 'encircle' | 'wedge' | 'retreat';
export type Doctrine = 'iron' | 'sky' | 'wander';
export type LocationId =
  | 'otgontenger'
  | 'bogd-khan-uul'
  | 'altai-tavan-bogd'
  | 'khan-tengri'
  | 'belukha'
  | 'altan-ovoo'
  | 'eej-khairkhan'
  | 'orkhon-valley';

export interface CampEstate {
  tier: number;
  slots: (BuildingId | null)[];
  internals: Record<string, number>;
}

export interface ClanState {
  /** Versioned five-core/five-choice camp; legacy snapshots migrate at load. */
  nomadicCamp?: NomadicCamp;
  /** Portable infrastructure; optional only for legacy snapshots. */
  estate?: CampEstate;
  campEffects: CampEffects;
  stage: JourneyStage;
  /** The real place the clan is camped at, or departing from during a migration. */
  locationId: LocationId;
  destinationId?: LocationId;
  stageTime: number;
  pasture: number;
  threat: number;
  food: number;
  materials: number;
  spirit: number;
  population: number;
  herd: number;
  integrity: number;
  migrationProgress: number;
  routeId: string;
  buildings: Record<BuildingId, number>;
  paths: Partial<Record<BuildingId, string[]>>;
  identity: Record<Doctrine, number>;
  formation: Formation;
  momentum: number;
  rescuedRiders: number;
  message: string;
}

export interface CampEffects {
  multipliers: {
    foodProduction: number;
    materialProduction: number;
    consumption: number;
    pastureUse: number;
    mobility: number;
    clanProtection: number;
    riderDamage: number;
    hostInterval: number;
    burnDamage: number;
    gallopCooldown: number;
    sanctuaryInterval: number;
    spiritGain: number;
    wagonDamage: number;
  };
  bonuses: {
    range: number;
    resolveRecovery: number;
    commanderRecovery: number;
    arrivalFood: number;
    arrivalMaterials: number;
    arrivalHerd: number;
    arrivalResolve: number;
    arrivalHealth: number;
    refugePeople: number;
  };
}

export interface CampEffectDefinition {
  multipliers?: Partial<CampEffects['multipliers']>;
  bonuses?: Partial<CampEffects['bonuses']>;
}

export interface PlayerStats {
  maxHealth: number;
  speed: number;
  damage: number;
  attackInterval: number;
  pickupRadius: number;
  projectiles: number;
  pierce: number;
}

/** A completed migration; retained under the original `legacy.crossings` save key. */
export interface CrossingRecord {
  route: string;
  population: number;
  locationId: LocationId;
}

export interface RunState {
  metrics?: import('./state/expeditionMetrics').ExpeditionMetrics;
  /** Missing only in expeditions saved before starting arrangements were introduced. */
  startingTradition?: keyof typeof import('./config').GAME.clan.starts;
  /** Missing only in expeditions saved before character creation was introduced. */
  character?: CharacterProfile;
  safety: import('./state/clanSafety').ClanSafety;
  combat: import('./state/mountedCombat').MountedCombatState;
  encounters: import('./state/encounters').EncounterState;
  field: import('./state/fieldObjectives').FieldState;
  legacy: ClanLegacy;
  guidance: GuidanceState;
  khan: {
    generation: number;
    successionRemaining: number;
    candidate?: import('./data/successors').SuccessorTrait;
    trait?: import('./data/successors').SuccessorTrait;
  };
  phase: RunPhase;
  elapsed: number;
  health: number;
  kills: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  stats: PlayerStats;
  clan: ClanState;
}

export interface EnemyDefinition {
  /** Intrinsic elite status, also applied to forced spawns and reset on pool reuse. */
  elite?: boolean;
  title?: string;
  home?: LocationId;
  localUnlockAt?: number;
  tint?: number;
  habitat?: import('./data/areaEncounters').AreaHabitat;
  concealed?: boolean;
  tacticalRole?: 'pack' | 'skirmisher' | 'bulwark';
  armor?: number;
  ability?: { kind: import('./data/areaEncounters').AreaThreatKind; count: number };
  volley?: { shots: number; spread: number; interval: number };
  id: string;
  texture: string;
  health: number;
  speed: number;
  damage: number;
  xp: number;
  unlockAt: number;
  weight: number;
  scale: number;
  navigation?: 'ground' | 'pack' | 'heavy';
  behavior?: 'ranged' | 'charger';
}

export interface HudSnapshot {
  combatReadability?: {
    warnings: import('./systems/combatReadability').EdgeWarning[];
    elites: import('./systems/combatReadability').EliteMarker[];
  };
  saves?: {
    entries: import('../shared/expeditionSave').SaveListing[];
    canSave: boolean;
    busy: boolean;
    message: string;
  };
  developerRun: boolean;
  developerConsole?: DeveloperConsoleSnapshot;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  run: RunState;
  dashReady: number;
  dashCooldown: number;
  abilities: {
    slot: import('./data/classes').ClassAbilitySlot;
    slotLabel: string;
    name: string;
    description: string;
    cooldown: number;
    remaining: number;
  }[];
  best: number;
  clanBearing: string;
  fieldBearing?: string;
  campPressure?: string;
}
