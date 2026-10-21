export type RunPhase =
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
  paths: Partial<Record<BuildingId, number>>;
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
  clan: ClanState;
}

export interface UpgradeDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  maxStacks: number;
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
  dashReady: number;
  best: number;
  bossHealth?: number;
  clanBearing: string;
}
