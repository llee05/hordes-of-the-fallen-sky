/**
 * Development-only game-control contracts: plain JSON state snapshots and argument
 * validation for the scenario, camera and capture hooks in `scenes/arena/testHooks.ts`.
 * Kept renderer-independent so unit tests cover the shapes without Phaser.
 */
import { LOCATIONS } from '../data/clan';
import { isKhanActive } from '../state/khan';
import type { LocationId, PlayerStats, RunPhase, RunState } from '../types';

export interface ScenarioOptions {
  /** Real place ID, as in `LOCATIONS` and the `place:<id>` developer checkpoints. */
  place: LocationId;
  /** Seeds `Math.random` for the scene start and the crowd; default 1. */
  seed?: number;
  /** Sets run.elapsed (active seconds); later times scale enemy health and unlocks. Default keeps the checkpoint's. */
  elapsed?: number;
  /** Seeded crowd of the place's enemies around the Khan; default 0. */
  enemies?: number;
  /** Crowd ring around the Khan, in world units; defaults 240–1400. */
  minRadius?: number;
  maxRadius?: number;
  /** Keep the normal arrival timer; default false holds new arrivals. */
  arrivals?: boolean;
  /** Khan and clan invincibility; default true. */
  protect?: boolean;
  /** Fixed 60Hz simulated seconds to run after setup, before freezing; default 0. */
  settle?: number;
  /** Freeze the scene after setup; default true. */
  freeze?: boolean;
}

export type NormalizedScenario = Required<Omit<ScenarioOptions, 'elapsed'>> & { elapsed?: number };

export interface CameraOptions {
  /** Centre on this world point and stop following the Khan. Give both or neither. */
  x?: number;
  y?: number;
  /** Requested zoom; the scene clamps it to the allowed range for the view size. */
  zoom?: number;
  /** Follow the Khan again. Cannot be combined with x/y. */
  follow?: boolean;
}

export interface CameraState {
  /** World point at the centre of the view. */
  x: number;
  y: number;
  zoom: number;
  following: boolean;
  /** Angled-scene pitch in degrees; absent without the 3D world. */
  angle?: number;
}

export interface CaptureOptions {
  /** Consecutive unchanged rendered frames required; default 3. */
  frames?: number;
  /** Milliseconds before rejecting; default 15000. */
  timeout?: number;
}

export interface GameStateSnapshot {
  phase: RunPhase;
  place: { id: LocationId; name: string };
  stage: string;
  elapsed: number;
  kills: number;
  frozen: boolean;
  khan: {
    x: number;
    y: number;
    health: number;
    maxHealth: number;
    alive: boolean;
    classId?: string;
    name?: string;
    generation: number;
    successionRemaining: number;
  };
  clan: {
    food: number;
    materials: number;
    spirit: number;
    population: number;
    herd: number;
    integrity: number;
    pasture: number;
    threat: number;
    formation: string;
    camp?: { core: Record<string, number>; slots: ({ id: string; level: number } | null)[] };
  };
  upgrades: { level: number; xp: number; nextLevelXp: number; stats: PlayerStats };
  enemies: {
    total: number;
    /** Active enemies grouped by definition ID; positions are [x, y] world points. */
    byType: Record<string, { count: number; elites: number; positions: [number, number][] }>;
  };
  projectiles: {
    player: { count: number; positions: [number, number][] };
    hostile: { count: number; positions: [number, number][] };
  };
  gems: number;
  camera: CameraState;
}

/** The minimal actor surface the snapshot reads; Phaser sprites satisfy it. */
export interface ActorLike {
  active: boolean;
  x: number;
  y: number;
}

export interface EnemyLike extends ActorLike {
  elite: boolean;
  definition?: { id: string };
}

export interface GameStateInput {
  run: RunState;
  player: ActorLike;
  enemies: readonly EnemyLike[];
  projectiles: readonly ActorLike[];
  hostileShots: readonly ActorLike[];
  gems: readonly ActorLike[];
  camera: CameraState;
  frozen: boolean;
}

const round = (value: number, places = 1): number => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};
const point = (actor: ActorLike): [number, number] => [round(actor.x), round(actor.y)];

/** A plain, JSON-safe copy of the run and battlefield; nothing references live objects. */
export function snapshotGameState(input: GameStateInput): GameStateSnapshot {
  const { run, player } = input;
  const { clan } = run;
  const location = LOCATIONS.find((entry) => entry.id === clan.locationId);
  const byType: GameStateSnapshot['enemies']['byType'] = {};
  let total = 0;
  for (const enemy of input.enemies) {
    if (!enemy.active) continue;
    total += 1;
    const id = enemy.definition?.id ?? 'unknown';
    const entry = (byType[id] ??= { count: 0, elites: 0, positions: [] });
    entry.count += 1;
    if (enemy.elite) entry.elites += 1;
    entry.positions.push(point(enemy));
  }
  const shots = (actors: readonly ActorLike[]) => {
    const positions = actors.filter((actor) => actor.active).map(point);
    return { count: positions.length, positions };
  };
  const camp = clan.nomadicCamp;
  return {
    phase: run.phase,
    place: { id: clan.locationId, name: location?.name ?? clan.locationId },
    stage: clan.stage,
    elapsed: round(run.elapsed, 3),
    kills: run.kills,
    frozen: input.frozen,
    khan: {
      x: point(player)[0],
      y: point(player)[1],
      health: round(run.health, 2),
      maxHealth: run.stats.maxHealth,
      alive: isKhanActive(run),
      classId: run.character?.classId,
      name: run.character?.name,
      generation: run.khan.generation,
      successionRemaining: round(run.khan.successionRemaining, 3),
    },
    clan: {
      food: round(clan.food, 2),
      materials: round(clan.materials, 2),
      spirit: round(clan.spirit, 2),
      population: clan.population,
      herd: clan.herd,
      integrity: round(clan.integrity, 2),
      pasture: round(clan.pasture, 2),
      threat: round(clan.threat, 2),
      formation: clan.formation,
      camp: camp
        ? {
            core: { ...camp.core },
            slots: camp.slots.map((slot) => (slot ? { id: slot.id, level: slot.level } : null)),
          }
        : undefined,
    },
    upgrades: {
      level: run.level,
      xp: round(run.xp, 2),
      nextLevelXp: run.nextLevelXp,
      stats: { ...run.stats },
    },
    enemies: { total, byType },
    projectiles: { player: shots(input.projectiles), hostile: shots(input.hostileShots) },
    gems: input.gems.filter((gem) => gem.active).length,
    camera: { ...input.camera },
  };
}

const finite = (value: unknown, name: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`${name} must be a finite number`);
  return value;
};
const whole = (value: unknown, name: string, max = Number.MAX_SAFE_INTEGER): number => {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > max)
    throw new Error(`${name} must be a whole number from 0 to ${max}`);
  return value as number;
};
const flag = (value: unknown, name: string, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new Error(`${name} must be true or false`);
  return value;
};
const known = (value: object, keys: readonly string[], what: string): void => {
  for (const key of Reflect.ownKeys(value))
    if (typeof key !== 'string' || !keys.includes(key))
      throw new Error(`Unknown ${what} option: ${String(key)}`);
};

const SCENARIO_KEYS = [
  'place',
  'seed',
  'elapsed',
  'enemies',
  'minRadius',
  'maxRadius',
  'arrivals',
  'protect',
  'settle',
  'freeze',
] as const;

/** Validates every option before the scene changes; `maxEnemies` is the pool size. */
export function normalizeScenario(options: unknown, maxEnemies: number): NormalizedScenario {
  if (!options || typeof options !== 'object') throw new Error('Scenario options are required');
  known(options, SCENARIO_KEYS, 'scenario');
  const value = options as Record<string, unknown>;
  const place = value.place;
  if (!LOCATIONS.some((location) => location.id === place))
    throw new Error(`Unknown place: ${String(place)}`);
  const seed = value.seed === undefined ? 1 : whole(value.seed, 'seed', 0xffffffff);
  const elapsed = value.elapsed === undefined ? undefined : finite(value.elapsed, 'elapsed');
  if (elapsed !== undefined && elapsed < 0) throw new Error('elapsed must not be negative');
  const minRadius = value.minRadius === undefined ? 240 : finite(value.minRadius, 'minRadius');
  const maxRadius = value.maxRadius === undefined ? 1400 : finite(value.maxRadius, 'maxRadius');
  if (minRadius < 0 || maxRadius < minRadius)
    throw new Error('Crowd radii must satisfy 0 <= minRadius <= maxRadius');
  const settle = value.settle === undefined ? 0 : finite(value.settle, 'settle');
  if (settle < 0 || settle > 60) throw new Error('settle must be from 0 to 60 seconds');
  return {
    place: place as LocationId,
    seed,
    ...(elapsed === undefined ? {} : { elapsed }),
    enemies: value.enemies === undefined ? 0 : whole(value.enemies, 'enemies', maxEnemies),
    minRadius,
    maxRadius,
    arrivals: flag(value.arrivals, 'arrivals', false),
    protect: flag(value.protect, 'protect', true),
    settle,
    freeze: flag(value.freeze, 'freeze', true),
  };
}

/** Rejects mixed or partial targets so a typo never silently leaves the camera following. */
export function validateCamera(options: unknown): CameraOptions {
  if (!options || typeof options !== 'object') throw new Error('Camera options are required');
  known(options, ['x', 'y', 'zoom', 'follow'], 'camera');
  const value = options as Record<string, unknown>;
  const hasX = value.x !== undefined;
  const hasY = value.y !== undefined;
  if (hasX !== hasY) throw new Error('Camera x and y must be given together');
  const follow = flag(value.follow, 'follow', false);
  if (follow && hasX) throw new Error('Camera follow cannot be combined with x/y');
  const result: CameraOptions = {};
  if (hasX) {
    result.x = finite(value.x, 'x');
    result.y = finite(value.y, 'y');
  }
  if (value.zoom !== undefined) {
    result.zoom = finite(value.zoom, 'zoom');
    if (result.zoom <= 0) throw new Error('zoom must be positive');
  }
  if (follow) result.follow = true;
  return result;
}

export function normalizeCapture(options: unknown = {}): Required<CaptureOptions> {
  if (!options || typeof options !== 'object') throw new Error('Capture options must be an object');
  known(options, ['frames', 'timeout'], 'capture');
  const value = options as Record<string, unknown>;
  const frames = value.frames === undefined ? 3 : whole(value.frames, 'frames', 600);
  const timeout = value.timeout === undefined ? 15000 : finite(value.timeout, 'timeout');
  if (frames < 1) throw new Error('frames must be a whole number from 1 to 600');
  if (timeout <= 0) throw new Error('timeout must be positive');
  return { frames, timeout };
}

/** True once two consecutive rendered views match within a sub-pixel tolerance. */
export function sameView(
  a: { x: number; y: number; zoom: number; focus?: number; scale: number; pending: number },
  b: { x: number; y: number; zoom: number; focus?: number; scale: number; pending: number },
): boolean {
  const near = (p: number | undefined, q: number | undefined) =>
    p === q || (p !== undefined && q !== undefined && Math.abs(p - q) < 0.01);
  return (
    b.pending === 0 &&
    a.pending === 0 &&
    near(a.x, b.x) &&
    near(a.y, b.y) &&
    near(a.zoom, b.zoom) &&
    near(a.focus, b.focus) &&
    a.scale === b.scale
  );
}
