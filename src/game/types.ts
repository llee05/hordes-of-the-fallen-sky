import type { StoryState } from './story/types';

export type RunPhase =
  | 'intro'
  | 'story'
  | 'epilogue'
  | 'story-log'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'upgrade'
  | 'building'
  | 'route'
  | 'journal'
  | 'settings'
  | 'help'
  | 'dead'
  | 'won';
export type JourneyStage = 'camp' | 'migration' | 'final';
export type BuildingId = 'ger' | 'archery' | 'herd' | 'sanctuary' | 'wagon';
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

export interface ClanState {
  stage: JourneyStage;
  region: number;
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
  bow: { range: number; pierce: number };
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
  category: string;
  requires?: readonly { id: string; rank: number }[];
  apply: (run: RunState) => void;
}

export interface EnemyDefinition {
  id: string;
  texture: string;
  health: number;
  speed: number;
  damage: number;
  xp: number;
  unlockAt: number;
  weight: number;
  scale: number;
  behavior?: 'ranged' | 'charger' | 'boss';
}

export interface HudSnapshot {
  run: RunState;
  introSlide: number;
  dashReady: number;
  dashCooldown: number;
  best: number;
  bossHealth?: number;
  clanBearing: string;
}
