import { syncNomadicBuildings } from './nomadicCamp';
import { isNomadicCamp } from '../../shared/nomadicCamp.js';
import { createCampEstate } from './campEstate';
import { migrateLegacyNomadicCamp } from './nomadicCampMigration';
import { isExpeditionSave, isRecord, type ExpeditionSave } from '../../shared/expeditionSave';
import { createRun } from './run';
import { ALL_ENEMIES, SKYBREAKER } from '../data/enemies';
import { UPGRADES } from '../data/upgrades';
import { BUILDINGS, ROUTES, LOCATIONS, STARTING_TRADITIONS } from '../data/clan';
import { FIELD_OBJECTIVES } from '../data/fieldObjectives';
import { STORY_ORDER, storyEncounter } from '../data/story';
import { FIRST_STOPS, SECOND_STOPS, firstStop, secondStop } from '../data/storyDestinations';
import { SUCCESSORS } from '../data/successors';
import { GAME } from '../config';
import { currentLocation } from './journey';
import { EXPEDITION_MILESTONES } from './expeditionMetrics';
import type { RunState } from '../types';
import type { Enemy } from '../entities/actors';
import type { MotionArchive } from '../animation/CharacterMotion';
import type { AreaEncounterState } from './areaEncounters';
import type { AreaThreatState } from './areaThreats';

interface Point {
  x: number;
  y: number;
}
export interface BodyArchive extends Point {
  vx: number;
  vy: number;
  flip: boolean;
}
export interface EnemyArchive extends BodyArchive {
  slot: number;
  definition: string;
  state: Pick<
    Enemy,
    | 'health'
    | 'maxHealth'
    | 'spawnId'
    | 'attackTimer'
    | 'clanAttackTimer'
    | 'chargeTimer'
    | 'burning'
    | 'pinned'
    | 'lastGallop'
    | 'dangerTimer'
    | 'tacticalSlot'
    | 'objectiveId'
    | 'crossingId'
    | 'preparingAttack'
    | 'tactics'
  > & { elite?: boolean };
  motion: MotionArchive;
}
export interface ProjectileArchive extends BodyArchive {
  source?: string;
  barrage?: number;
  damage: number;
  remaining: number;
  fire: boolean;
  tempest: boolean;
  turn: number;
  pierces: number;
  pins: boolean;
  rotation: number;
  tint: number;
  previous?: Point;
  hits: { slot: number; spawnId: number }[];
}
export interface SupportArchive {
  ancestorTimer: number;
  waterTimer: number;
  guardianTimer: number;
  spirits: (Point & { active: boolean; motion: MotionArchive })[];
}
export interface WorldArchive {
  player: BodyArchive & { motion: MotionArchive };
  camp: Point;
  facing: Point;
  zoom: number;
  timers: {
    spawnTimer: number;
    attackTimer: number;
    dashTimer: number;
    dashRemaining: number;
    invulnerable: number;
    supportTimer: number;
    wagonTimer: number;
    wardTimer: number;
    hazardTimer: number;
  };
  generations: number[];
  enemies: EnemyArchive[];
  projectiles: ProjectileArchive[];
  hostileShots: ProjectileArchive[];
  gems: (BodyArchive & { value: number; attracted: boolean })[];
  riders: (Point & { flip: boolean; motion: MotionArchive })[];
  support: SupportArchive;
  hazards: (Point & { remaining: number; radius?: number; damage?: number; source?: 'seer' })[];
  areaEncounter: AreaEncounterState;
  areaThreats: AreaThreatState;
}

type Rule = (value: unknown) => boolean;
const number: Rule = (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e9;
const positive: Rule = (v) => number(v) && (v as number) >= 0;
const integer: Rule = (v) => positive(v) && Number.isInteger(v);
const string: Rule = (v) => typeof v === 'string';
const boolean: Rule = (v) => typeof v === 'boolean';
const oneOf =
  (values: readonly unknown[]): Rule =>
  (v) =>
    values.includes(v);
const list =
  (rule: Rule, maximum = 2000): Rule =>
  (v) =>
    Array.isArray(v) && v.length <= maximum && v.every(rule);
const dictionary =
  (rule: Rule): Rule =>
  (v) =>
    isRecord(v) && Object.values(v).every(rule);
function object(required: Record<string, Rule>, optional: Record<string, Rule> = {}): Rule {
  return (v) =>
    isRecord(v) &&
    Object.entries(required).every(([key, rule]) => rule(v[key])) &&
    Object.keys(v).every((key) => key in required || (key in optional && optional[key]!(v[key])));
}
const point = object({ x: number, y: number });
const bodyFields = { x: number, y: number, vx: number, vy: number, flip: boolean };
const motion = object({
  cycle: number,
  releaseRemaining: number,
  hurtRemaining: number,
  moving: boolean,
  windingUp: boolean,
});
const location = oneOf(LOCATIONS.map((l) => l.id));
const region = oneOf([0, 1, 2, 3]);
const storyScenes = STORY_ORDER.map((id) => storyEncounter(createRun(), id));
// Include composed base scenes, all destination variants, and the fallback stops.
const storyImages = new Set([
  ...storyScenes.map((scene) => scene.image),
  ...Object.values(FIRST_STOPS).map((stop) => stop.image),
  ...Object.values(SECOND_STOPS).map((stop) => stop.image),
  firstStop(undefined).image,
  secondStop(undefined).image,
]);
const trait = oneOf(Object.keys(SUCCESSORS));
const line = object({
  speaker: oneOf(['saran', 'boro', 'erden', 'nara', 'newcomer', 'clan']),
  text: string,
});
const choice = object({
  id: oneOf(storyScenes.flatMap((scene) => scene.choices.map((option) => option.id))),
  label: string,
  description: string,
  response: string,
  benefit: oneOf(['food', 'materials', 'spirit', 'resolve']),
  doctrine: oneOf(['iron', 'sky', 'wander']),
});
const encounter = object({
  id: oneOf(['fire', 'departure', 'river', 'promise', 'earth', 'court', 'opening', 'road']),
  act: oneOf([1, 2]),
  title: string,
  image: oneOf([...storyImages]),
  setting: string,
  lines: list(line, 100),
  choices: list(choice, 20),
});
const khanRecord = object(
  {
    generation: integer,
    chosenAt: number,
    region,
    people: number,
    killsAtStart: integer,
  },
  {
    trait,
    locationId: location,
    fallenAt: number,
    fallenRegion: region,
    fallenLocationId: location,
    killsAtFall: integer,
  },
);
const overrides: Record<string, Rule> = {
  phase: oneOf(['playing', 'paused', 'story']),
  upgrades: dictionary(integer),
  'clan.stage': oneOf(['camp', 'migration', 'final']),
  'clan.region': oneOf([0, 1, 2, 3]),
  'clan.routeId': oneOf(['', ...ROUTES.map((r) => r.id)]),
  'clan.formation': oneOf(['guard', 'encircle', 'wedge', 'retreat']),
  'clan.paths': object(
    {},
    Object.fromEntries(BUILDINGS.map((b) => [b.id, list(oneOf(b.paths.map((p) => p.id)), 100)])),
  ),
  'clan.estate.slots': list(oneOf([null, ...BUILDINGS.map((b) => b.id)]), 32),
  'clan.estate.internals': dictionary(integer),
  'guidance.completed': list(string, 100),
  'combat.trails': list(
    object({ x: number, y: number, remaining: number }),
    GAME.mounted.maxTrails,
  ),
  'legacy.khans': list(
    (value) =>
      khanRecord(value) &&
      isRecord(value) &&
      (value.fallenAt === undefined || region(value.fallenRegion)),
    GAME.story.khanRecordLimit,
  ),
  'legacy.memories': list(
    object(
      {
        sequence: integer,
        elapsed: number,
        region,
        population: number,
        title: string,
        detail: string,
      },
      { locationId: location, line },
    ),
    GAME.story.memoryLimit,
  ),
  'story.records': list(
    object(
      {
        encounter,
        elapsed: number,
        population: number,
        status: oneOf(['chosen', 'skipped', 'passed']),
      },
      { choice },
    ),
    100,
  ),
  'story.crossings': list(
    object(
      {
        route: oneOf(ROUTES.map((route) => route.id)),
        region: oneOf([1, 2, 3]),
        population: number,
      },
      { locationId: location },
    ),
    100,
  ),
};
const optional: Record<string, Record<string, Rule>> = {
  '': {
    finalStand: object(
      {
        phase: oneOf(['advance', 'warning', 'recovery']),
        remaining: positive,
        cycle: integer,
        approach: oneOf([0, 1, 2, 3]),
        works: list(object({ progress: positive, done: boolean }, { x: number, y: number }), 2),
      },
      { aim: point, lastCampBarrage: integer },
    ),
    metrics: object({
      stages: list(
        object({
          key: string,
          location: string,
          stage: oneOf(['camp', 'migration', 'final']),
          startedAt: positive,
          marks: object({}, Object.fromEntries(EXPEDITION_MILESTONES.map((id) => [id, positive]))),
          damage: positive,
          casualties: integer,
          riding: positive,
          guarding: positive,
          travelling: positive,
        }),
        8,
      ),
    }),
    startingTradition: oneOf(STARTING_TRADITIONS.map((entry) => entry.id)),
    crossing: object(
      {
        key: string,
        route: oneOf(['river', 'ridge', 'refuge']),
        phase: oneOf(['waiting', 'warning', 'assault', 'cleared', 'ended']),
        remaining: number,
        spawnDelay: number,
        spawned: integer,
        defeated: integer,
        paid: boolean,
        lossesAtDeparture: number,
      },
      {
        escort: object({
          x: number,
          y: number,
          progress: number,
          exposure: number,
          joined: boolean,
          lost: boolean,
        }),
      },
    ),
  },
  clan: { locationId: location, destinationId: location },
  khan: { candidate: trait, trait },
  encounters: { phase: oneOf(['probing', 'warning', 'assault', 'elite', 'recovery']) },
  combat: { previous: point, heading: point },
  safety: {
    lastDamage: object(
      {
        cause: oneOf(['attack', 'starvation', 'eruption', 'seer', 'area']),
        at: number,
        amount: number,
        people: number,
      },
      { source: string },
    ),
    lastMajorLoss: object(
      {
        cause: oneOf(['attack', 'starvation', 'eruption', 'seer', 'area']),
        at: number,
        amount: number,
        people: number,
      },
      { source: string },
    ),
  },
  field: {
    objective: object({
      id: integer,
      kind: oneOf(Object.keys(FIELD_OBJECTIVES)),
      x: number,
      y: number,
      progress: number,
      status: oneOf(['available', 'returning', 'complete', 'abandoned']),
      guards: integer,
      defeated: integer,
    }),
  },
  story: { active: encounter },
};
/** Required fields follow the live state defaults; optional and variable-sized content is explicit. */
function shape(example: unknown, path = ''): Rule {
  if (overrides[path]) return overrides[path]!;
  if (typeof example === 'number') return number;
  if (typeof example === 'boolean') return boolean;
  if (typeof example === 'string') return string;
  if (Array.isArray(example)) return list(example.length ? shape(example[0], `${path}[]`) : string);
  if (!isRecord(example)) return (v) => v === example;
  return object(
    Object.fromEntries(
      Object.entries(example)
        .filter(([key]) => !optional[path]?.[key])
        .map(([key, value]) => [key, shape(value, path ? `${path}.${key}` : key)]),
    ),
    optional[path],
  );
}
optional.clan!.estate = shape(createCampEstate(), 'clan.estate');
optional.clan!.nomadicCamp = isNomadicCamp;
const runShape = shape(createRun());
const enemyState = object(
  {
    health: positive,
    maxHealth: positive,
    spawnId: integer,
    attackTimer: number,
    clanAttackTimer: number,
    chargeTimer: number,
    burning: number,
    pinned: number,
    lastGallop: number,
    dangerTimer: number,
    tacticalSlot: integer,
    preparingAttack: boolean,
    tactics: object(
      { phase: oneOf(['approach', 'windup', 'charge', 'recover']), remaining: number },
      { aim: point, direction: point },
    ),
  },
  { objectiveId: integer, crossingId: string, elite: boolean },
);
const projectile = object(
  {
    ...bodyFields,
    damage: positive,
    remaining: positive,
    fire: boolean,
    tempest: boolean,
    turn: number,
    pierces: integer,
    pins: boolean,
    rotation: number,
    tint: integer,
    hits: list(object({ slot: integer, spawnId: integer }), GAME.maxEnemies),
  },
  { previous: point, barrage: integer, source: string },
);
const threat = object(
  {
    id: integer,
    kind: oneOf(['frost', 'rockfall', 'mire', 'crosswind', 'cinder', 'rift']),
    x: number,
    y: number,
    age: number,
    warning: number,
    impacted: boolean,
    nextTick: number,
  },
  { owner: string },
);
const worldShape = object({
  player: object({ ...bodyFields, motion }),
  camp: point,
  facing: point,
  zoom: positive,
  timers: object({
    spawnTimer: number,
    attackTimer: number,
    dashTimer: number,
    dashRemaining: number,
    invulnerable: number,
    supportTimer: number,
    wagonTimer: number,
    wardTimer: number,
    hazardTimer: number,
  }),
  generations: list(integer, GAME.maxEnemies),
  enemies: list(
    object({
      ...bodyFields,
      slot: integer,
      definition: oneOf([...ALL_ENEMIES, SKYBREAKER].map((e) => e.id)),
      state: enemyState,
      motion,
    }),
    GAME.maxEnemies,
  ),
  projectiles: list(projectile, GAME.maxProjectiles),
  hostileShots: list(projectile, 180),
  gems: list(object({ ...bodyFields, value: positive, attracted: boolean }), GAME.maxGems),
  riders: list(object({ x: number, y: number, flip: boolean, motion }), 16),
  support: object({
    ancestorTimer: number,
    waterTimer: number,
    guardianTimer: number,
    spirits: list(
      object({ x: number, y: number, active: boolean, motion }),
      GAME.patrons.ancestors.maximum,
    ),
  }),
  hazards: list(
    object(
      { x: number, y: number, remaining: number },
      { radius: positive, damage: positive, source: oneOf(['seer']) },
    ),
    100,
  ),
  areaEncounter: object({
    key: string,
    clock: number,
    announced: boolean,
    nextThreat: number,
    sequence: integer,
    arrivals: integer,
  }),
  areaThreats: object({ nextId: integer, threats: list(threat, GAME.areaCombat.maxThreats) }),
});

export function captureExpedition(
  run: RunState,
  world: WorldArchive,
  savedAt = Date.now(),
): ExpeditionSave {
  const snapshot = JSON.parse(
    JSON.stringify({
      version: 1,
      savedAt,
      summary: {
        location: currentLocation(run).name,
        elapsed: run.elapsed,
        population: run.clan.population,
        level: run.level,
        stage: run.clan.stage,
      },
      run: { ...run, phase: run.story.active ? 'story' : 'paused' },
      world,
    }),
  ) as ExpeditionSave;
  decodeExpedition(snapshot);
  return snapshot;
}

/** No purchase, arrival, story resolution, healing, or active-time simulation runs during loading. */
export function decodeExpedition(value: unknown): { run: RunState; world: WorldArchive } {
  if (!isExpeditionSave(value) || !runShape(value.run) || !worldShape(value.world))
    throw new Error('This expedition is damaged or incompatible with the current game.');
  const run = value.run as unknown as RunState;
  const world = value.world as unknown as WorldArchive;
  const ranksValid = Object.entries(run.upgrades).every(([id, rank]) => {
    const definition = UPGRADES.find((entry) => entry.id === id);
    return definition && rank <= definition.maxStacks;
  });
  const slots = new Set(world.enemies.map((e) => e.slot));
  const referencesValid =
    slots.size === world.enemies.length &&
    world.enemies.every(
      (e) =>
        e.slot < world.generations.length &&
        e.state.spawnId === world.generations[e.slot] &&
        e.state.tacticalSlot === e.slot,
    ) &&
    [...world.projectiles, ...world.hostileShots].every((p) =>
      p.hits.every(
        (h) => h.slot < world.generations.length && h.spawnId <= world.generations[h.slot]!,
      ),
    );
  if (
    !ranksValid ||
    !referencesValid ||
    run.elapsed < 0 ||
    run.elapsed > 86400 ||
    run.health < 0 ||
    run.health > run.stats.maxHealth ||
    run.stats.maxHealth <= 0 ||
    run.stats.attackInterval <= 0 ||
    run.khan.successionRemaining < 0 ||
    (run.khan.successionRemaining > 0 && run.health !== 0) ||
    run.clan.population <= 0 ||
    run.clan.integrity <= 0 ||
    run.clan.integrity > GAME.clan.maxResolve ||
    !Number.isInteger(run.level) ||
    run.level < 1 ||
    !Number.isInteger(run.pendingUpgrades) ||
    run.pendingUpgrades < 0 ||
    run.xp < 0 ||
    run.nextLevelXp <= 0 ||
    !!run.story.active !== (run.phase === 'story')
  )
    throw new Error('This expedition contains invalid progression or actor references.');
  const restored = structuredClone({ run, world });
  migrateLegacyNomadicCamp(restored.run);
  syncNomadicBuildings(restored.run);
  return restored;
}
