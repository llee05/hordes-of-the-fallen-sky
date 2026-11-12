import { availableFormations } from './clan';
import { applyCampEffects } from './camp';
import { isCharacterProfile, normalizeCharacterProfile } from '../../shared/characterProfile';
import {
  isExpeditionSave,
  isRecord,
  MAX_EXPEDITION_SUMMARY_ELAPSED,
  MAX_EXPEDITION_SUMMARY_LEVEL,
  type ExpeditionSave,
} from '../../shared/expeditionSave';
import { isNomadicCamp } from '../../shared/nomadicCamp.js';
import type { MotionArchive } from '../animation/CharacterMotion';
import { GAME } from '../config';
import { BUILDINGS, LOCATIONS, ROUTES, STARTING_TRADITIONS } from '../data/clan';
import { ALL_ENEMIES } from '../data/enemies';
import { FIELD_OBJECTIVES } from '../data/fieldObjectives';
import { NOMADIC_BUILDINGS } from '../data/nomadicCamp';
import { ORKHON_VALLEY } from '../data/orkhonValley';
import { SUCCESSORS } from '../data/successors';
import type { Enemy } from '../entities/actors';
import type { RunState } from '../types';
import {
  boolean,
  dictionary,
  integer,
  list,
  number,
  object,
  oneOf,
  positive,
  string,
  type Rule,
} from './archiveRules';
import type { AreaEncounterState } from './areaEncounters';
import type { AreaThreatState } from './areaThreats';
import { createCampEstate } from './campEstate';
import { EXPEDITION_MILESTONES } from './expeditionMetrics';
import { currentLocation } from './journey';
import {
  applyNomadicBuildingEffects,
  nomadicBuildingLevel,
  syncNomadicBuildings,
} from './nomadicCamp';
import { migrateLegacyNomadicCamp } from './nomadicCampMigration';
import { migrateRetiredJourney } from './retiredJourney';
import { createRun } from './run';
import type { SpiritCallerCombatState } from './spiritCaller';

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
    | 'spiritSlow'
    | 'lastGallop'
    | 'dangerTimer'
    | 'tacticalSlot'
    | 'objectiveId'
    | 'preparingAttack'
    | 'tactics'
  > & { elite?: boolean };
  motion: MotionArchive;
}
export interface ProjectileArchive extends BodyArchive {
  source?: string;
  damage: number;
  remaining: number;
  fire: boolean;
  tempest: boolean;
  turn: number;
  pierces: number;
  pins: boolean;
  echoIndex?: number;
  precision?: boolean;
  ghost?: boolean;
  spiritSource?: 'wisp' | 'guardian' | 'veil';
  baseDamage?: number;
  dealtDamage?: number;
  rotation: number;
  tint: number;
  previous?: Point;
  hits: { slot: number; spawnId: number }[];
}
export interface WorldArchive {
  /** Present after Orkhon changed from the legacy 5200-square coordinate space. */
  orkhonLayout?: 2;
  player: BodyArchive & { motion: MotionArchive };
  camp: Point;
  facing: Point;
  zoom: number;
  timers: {
    spawnTimer: number;
    attackTimer: number;
    closeDefenseTimer?: number;
    abilityCooldowns?: { q: number; w: number; e: number; r: number };
    spiritCaller?: SpiritCallerCombatState;
    dashTimer: number;
    dashRemaining: number;
    invulnerable: number;
    supportTimer: number;
    wagonTimer: number;
    wardTimer: number;
  };
  generations: number[];
  enemies: EnemyArchive[];
  projectiles: ProjectileArchive[];
  hostileShots: ProjectileArchive[];
  gems: (BodyArchive & { value: number; attracted: boolean; secondary?: boolean })[];
  riders: (Point & { flip: boolean; motion: MotionArchive })[];
  hazards: (Point & {
    remaining: number;
    radius?: number;
    damage?: number;
    source?: 'seer';
    researchCrossed?: boolean;
    researchEntered?: boolean;
  })[];
  areaEncounter: AreaEncounterState;
  areaThreats: AreaThreatState;
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
const trait = oneOf(Object.keys(SUCCESSORS));
const khanRecord = object(
  {
    generation: integer,
    chosenAt: number,
    locationId: location,
    people: number,
    killsAtStart: integer,
  },
  {
    trait,
    fallenAt: number,
    fallenLocationId: location,
    killsAtFall: integer,
  },
);
const overrides: Record<string, Rule> = {
  phase: oneOf(['playing', 'paused']),
  'clan.stage': oneOf(['camp', 'migration']),
  'clan.locationId': location,
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
  'legacy.khans': list(khanRecord, GAME.legacy.khanRecordLimit),
  'legacy.memories': list(
    object({
      sequence: integer,
      elapsed: number,
      locationId: location,
      population: number,
      title: string,
      detail: string,
    }),
    GAME.legacy.memoryLimit,
  ),
  'legacy.crossings': list(
    object({
      route: oneOf(ROUTES.map((route) => route.id)),
      population: number,
      locationId: location,
    }),
    100,
  ),
};
const optional: Record<string, Record<string, Rule>> = {
  '': {
    metrics: object({
      stages: list(
        object({
          key: string,
          location: string,
          stage: oneOf(['camp', 'migration']),
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
    character: isCharacterProfile,
  },
  clan: { destinationId: location },
  khan: { candidate: trait, trait },
  encounters: { phase: oneOf(['probing', 'warning', 'assault', 'elite', 'recovery']) },
  combat: { previous: point, heading: point, riderFireAt: list(number, 16) },
  safety: {
    lastDamage: object(
      {
        cause: oneOf(['attack', 'starvation', 'seer', 'area']),
        at: number,
        amount: number,
        people: number,
      },
      { source: string },
    ),
    lastMajorLoss: object(
      {
        cause: oneOf(['attack', 'starvation', 'seer', 'area']),
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
  { objectiveId: integer, elite: boolean, spiritSlow: positive },
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
  {
    previous: point,
    source: string,
    echoIndex: integer,
    precision: boolean,
    ghost: boolean,
    spiritSource: oneOf(['wisp', 'guardian', 'veil']),
    baseDamage: positive,
    dealtDamage: positive,
  },
);
const threat = object(
  {
    id: integer,
    kind: oneOf(['frost', 'rockfall', 'mire', 'crosswind', 'cinder']),
    x: number,
    y: number,
    age: number,
    warning: number,
    impacted: boolean,
    nextTick: number,
  },
  { owner: string },
);
const worldShape = object(
  {
    player: object({ ...bodyFields, motion }),
    camp: point,
    facing: point,
    zoom: positive,
    timers: object(
      {
        spawnTimer: number,
        attackTimer: number,
        dashTimer: number,
        dashRemaining: number,
        invulnerable: number,
        supportTimer: number,
        wagonTimer: number,
        wardTimer: number,
      },
      {
        closeDefenseTimer: number,
        abilityCooldowns: object({ q: number, w: number, e: number, r: number }),
        spiritCaller: object(
          {
            energy: positive,
            veilRemaining: positive,
            echoTimer: number,
            drumWaves: list(
              object({ delay: number, range: positive, damage: positive, slowDuration: positive }),
              3,
            ),
          },
          {
            guardians: object({
              remaining: positive,
              attackTimer: number,
              count: integer,
              intercepts: integer,
            }),
            ovoo: object({ x: number, y: number, remaining: positive, pulseTimer: number }),
          },
        ),
      },
    ),
    generations: list(integer, GAME.maxEnemies),
    enemies: list(
      object({
        ...bodyFields,
        slot: integer,
        definition: oneOf(ALL_ENEMIES.map((e) => e.id)),
        state: enemyState,
        motion,
      }),
      GAME.maxEnemies,
    ),
    projectiles: list(projectile, GAME.maxProjectiles),
    hostileShots: list(projectile, 180),
    gems: list(
      object({ ...bodyFields, value: positive, attracted: boolean }, { secondary: boolean }),
      GAME.maxGems,
    ),
    riders: list(object({ x: number, y: number, flip: boolean, motion }), 16),
    hazards: list(
      object(
        { x: number, y: number, remaining: number },
        {
          radius: positive,
          damage: positive,
          source: oneOf(['seer']),
          researchCrossed: boolean,
          researchEntered: boolean,
        },
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
  },
  { orkhonLayout: integer },
);

/** Moves pre-overhaul Orkhon saves into the centred 6400-unit terrain exactly once. */
function migrateOrkhonLayout(value: unknown): void {
  if (!isRecord(value) || !isRecord(value.run) || !isRecord(value.world)) return;
  const clan = value.run.clan;
  if (!isRecord(clan) || clan.locationId !== 'orkhon-valley' || value.world.orkhonLayout === 2)
    return;
  const center = ORKHON_VALLEY.world.terrainSize / 2;
  const destination = {
    x: center + ORKHON_VALLEY.world.camp.x,
    y: center + ORKHON_VALLEY.world.camp.y,
  };
  const offset = { x: destination.x - 2600, y: destination.y - 2600 };
  const bounds = {
    minX: center + ORKHON_VALLEY.world.minX + 24,
    maxX: center + ORKHON_VALLEY.world.minX + ORKHON_VALLEY.world.width - 24,
    minY: center + ORKHON_VALLEY.world.minY + 24,
    maxY: center + ORKHON_VALLEY.world.minY + ORKHON_VALLEY.world.height - 24,
  };
  const translate = (point: unknown) => {
    if (!isRecord(point) || typeof point.x !== 'number' || typeof point.y !== 'number') return;
    point.x = Math.max(bounds.minX, Math.min(bounds.maxX, point.x + offset.x));
    point.y = Math.max(bounds.minY, Math.min(bounds.maxY, point.y + offset.y));
  };
  const run = value.run;
  if (isRecord(run.combat)) {
    translate(run.combat.previous);
    if (Array.isArray(run.combat.trails)) for (const trail of run.combat.trails) translate(trail);
  }
  if (isRecord(run.field)) translate(run.field.objective);
  const world = value.world;
  translate(world.player);
  translate(world.camp);
  for (const key of ['enemies', 'projectiles', 'hostileShots', 'gems', 'riders', 'hazards']) {
    const points = world[key];
    if (Array.isArray(points))
      for (const point of points) {
        translate(point);
        if (isRecord(point)) translate(point.previous);
        if (isRecord(point) && isRecord(point.state) && isRecord(point.state.tactics))
          translate(point.state.tactics.aim);
      }
  }
  if (isRecord(world.areaThreats) && Array.isArray(world.areaThreats.threats))
    for (const point of world.areaThreats.threats) translate(point);
  world.orkhonLayout = 2;
}

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
        elapsed: Math.min(run.elapsed, MAX_EXPEDITION_SUMMARY_ELAPSED),
        population: run.clan.population,
        level: Math.min(run.level, MAX_EXPEDITION_SUMMARY_LEVEL),
        stage: run.clan.stage,
      },
      run: { ...run, phase: 'paused' },
      world: currentLocation(run).id === 'orkhon-valley' ? { ...world, orkhonLayout: 2 } : world,
    }),
  ) as ExpeditionSave;
  decodeExpedition(snapshot);
  return snapshot;
}

/** No purchase, arrival, healing, or active-time simulation runs during loading. */
export function decodeExpedition(value: unknown): {
  summary: ExpeditionSave['summary'];
  run: RunState;
  world: WorldArchive;
} {
  // Retired research and story fields are deliberately ignored, including IDs and runtime fields
  // no longer known to this build. Validate the retained expedition below.
  value = structuredClone(value);
  let retiredProgression = false;
  let retiredStory = false;
  if (isRecord(value) && isRecord(value.run)) {
    const legacy = value.run;
    retiredProgression = [
      'upgrades',
      'patrons',
      'pendingUpgrades',
      'researchPurchases',
      'researchRuntime',
    ].some((key) => key in legacy);
    retiredStory = 'story' in legacy;
    if (isRecord(legacy.story)) {
      if (isRecord(legacy.legacy)) {
        if (legacy.legacy.crossings === undefined && 'crossings' in legacy.story)
          legacy.legacy.crossings = legacy.story.crossings;
        if (legacy.legacy.peopleLost === undefined && 'peopleLost' in legacy.story)
          legacy.legacy.peopleLost = legacy.story.peopleLost;
      }
      if (
        Array.isArray(legacy.story.records) &&
        isRecord(legacy.clan) &&
        isRecord(legacy.clan.identity)
      ) {
        for (const record of legacy.story.records) {
          if (
            isRecord(record) &&
            record.status === 'chosen' &&
            isRecord(record.choice) &&
            typeof record.choice.doctrine === 'string' &&
            record.choice.doctrine in legacy.clan.identity &&
            typeof legacy.clan.identity[record.choice.doctrine] === 'number'
          ) {
            legacy.clan.identity[record.choice.doctrine] = Math.max(
              0,
              (legacy.clan.identity[record.choice.doctrine] as number) - 1,
            );
          }
        }
      }
    }
    delete legacy.story;
    if (legacy.phase === 'story') legacy.phase = 'paused';
    if (isRecord(legacy.legacy)) {
      delete legacy.legacy.reactionUntil;
      if (Array.isArray(legacy.legacy.memories)) {
        for (const memory of legacy.legacy.memories) {
          if (isRecord(memory)) delete memory.line;
        }
      }
    }
    for (const key of [
      'upgrades',
      'patrons',
      'pendingUpgrades',
      'researchPurchases',
      'researchObservations',
      'researchRuntime',
    ])
      delete legacy[key];
    if (isRecord(legacy.stats) && legacy.stats.pierce === undefined) legacy.stats.pierce = 0;
    if (isRecord(value.world)) delete value.world.support;
  }
  const retiredJourney = isRecord(value) && migrateRetiredJourney(value);
  migrateOrkhonLayout(value);
  if (!isExpeditionSave(value) || !runShape(value.run) || !worldShape(value.world))
    throw new Error('This expedition is damaged or incompatible with the current game.');
  const run = value.run as unknown as RunState;
  const world = value.world as unknown as WorldArchive;
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
    !referencesValid ||
    run.elapsed < 0 ||
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
    run.xp < 0 ||
    run.nextLevelXp <= 0
  )
    throw new Error('This expedition contains invalid progression or actor references.');
  const restored = structuredClone({ summary: value.summary, run, world });
  restored.run.character = normalizeCharacterProfile(restored.run.character);
  migrateLegacyNomadicCamp(restored.run);
  syncNomadicBuildings(restored.run);
  if (retiredJourney)
    restored.run.clan.message = `The journey chapters have been retired. Your clan now camps at ${currentLocation(restored.run).name}.`;
  if (retiredStory) {
    restored.run.clan.message = '';
    const legacy = restored.run.legacy;
    legacy.totalMemories = Math.max(legacy.totalMemories, legacy.memories.length);
    const firstSequence = legacy.totalMemories - legacy.memories.length + 1;
    legacy.memories.forEach((memory, index) => {
      memory.sequence = firstSequence + index;
    });
  }
  if (retiredProgression || retiredStory) {
    // Rebuild persistent bonuses from buildings; old stat/effect totals included retired research or story choices.
    const retained = restored.run;
    const baseline = createRun(retained.startingTradition);
    retained.clan.campEffects = baseline.clan.campEffects;
    if (retiredProgression) retained.stats = baseline.stats;
    for (const definition of NOMADIC_BUILDINGS)
      for (const level of definition.levels.slice(
        definition.category === 'Core' ? 1 : 0,
        nomadicBuildingLevel(retained.clan.nomadicCamp!, definition.id),
      ))
        if (retiredProgression) applyNomadicBuildingEffects(retained, level.effects);
        else applyCampEffects(retained.clan.campEffects, level.effects.ongoing);
    if (retiredProgression) {
      if (!availableFormations(retained).includes(retained.clan.formation))
        retained.clan.formation = 'guard';
      retained.health = Math.min(retained.health, retained.stats.maxHealth);
      retained.combat.trails = [];
    }
  }
  return restored;
}
