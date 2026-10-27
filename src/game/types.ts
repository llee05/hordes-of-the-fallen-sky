import type { ClanLegacy } from './state/legacy';
import type { GuidanceState } from './state/guidance';
import type { StoryState } from './story/types';
import type { DeveloperConsoleSnapshot } from './dev/commands';

export type RunPhase =
  | 'intro'
  | 'story'
  | 'epilogue'
  | 'story-log'
  | 'ready'
  | 'traditions'
  | 'playing'
  | 'paused'
  | 'saves'
  | 'upgrade'
  | 'building'
  | 'route'
  | 'journal'
  | 'settings'
  | 'help'
  | 'developer'
  | 'console'
  | 'dead'
  | 'won';
export type JourneyStage = 'camp' | 'migration' | 'final';
export type BuildingId =
  'ger' | 'archery' | 'herd' | 'sanctuary' | 'wagon' | 'felt' | 'provisions' | 'relay';
export type Formation = 'guard' | 'encircle' | 'wedge' | 'retreat';
export type PatronId =
  | 'borte-chino'
  | 'etugen-eke'
  | 'khukhedei-mergen'
  | 'golomt'
  | 'lus'
  | 'ongod'
  | 'sulde'
  | 'burkhan-guardian';
export type Doctrine = 'iron' | 'sky' | 'wander';
export type LocationId =
  | 'golden-pasture'
  | 'silent-river'
  | 'broken-pass'
  | 'heart-of-the-steppe'
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
  /** Portable infrastructure; optional only for legacy snapshots. */
  estate?: CampEstate;
  campEffects: CampEffects;
  stage: JourneyStage;
  region: number;
  /** Journey chapter and physical location are independent. Unset uses the original chapter camp. */
  locationId?: LocationId;
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
  finalBossSpawned: boolean;
  finalBossDefeated: boolean;
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
}

/** Neutral defaults keep every patron modifier opt-in and isolated to its expedition. */
export interface PatronEffects {
  hunt: { movingDamage: number; executeDamage: number; gallopCooldown: number; killHeal: number };
  land: {
    food: number;
    materials: number;
    consumption: number;
    pastureUse: number;
    pastureRecovery: number;
  };
  bow: { range: number; pierce: number; spread: number };
  hearth: { regeneration: number; damageTaken: number; revives: number };
  water: {
    slow: number;
    radius: number;
    hazardDamage: number;
    warning: number;
    pulseDamage: number;
  };
  ancestors: { count: number; damage: number; interval: number; spiritGain: number };
  banner: { riders: number; damage: number; mobility: number; resolveOnKill: number };
  guardian: { cost: number; protection: number; wagonInterval: number; wardDamage: number };
}

export interface RunState {
  researchPurchases?: import('./state/researchMetrics').ResearchPurchase[];
  researchObservations?: import('./state/researchMetrics').ResearchObservations;
  researchRuntime?: import('./state/researchRuntime').ResearchRuntime;
  finalStand?: import('./state/finalStand').FinalStandState;
  metrics?: import('./state/expeditionMetrics').ExpeditionMetrics;
  /** Missing only in expeditions saved before starting arrangements were introduced. */
  startingTradition?: keyof typeof import('./config').GAME.clan.starts;
  safety: import('./state/clanSafety').ClanSafety;
  crossing?: import('./state/crossingEncounters').CrossingEncounter;
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
  pendingUpgrades: number;
  upgrades: Record<string, number>;
  stats: PlayerStats;
  patrons: PatronEffects;
  clan: ClanState;
  story: StoryState;
}

export interface UpgradeDefinition {
  id: string;
  patron: PatronId;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  maxStacks: number;
  knowledgeCost?: number;
  exclusiveGroup?: string;
  kind?: 'foundation' | 'practice' | 'capstone';
  category: string;
  requires?: readonly { id: string; rank: number }[];
  apply: (run: RunState) => void;
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
  behavior?: 'ranged' | 'charger' | 'boss';
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
  introSlide: number;
  dashReady: number;
  dashCooldown: number;
  best: number;
  bossHealth?: number;
  clanBearing: string;
  fieldBearing?: string;
  campPressure?: string;
}
