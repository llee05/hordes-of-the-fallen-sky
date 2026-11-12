import Phaser from 'phaser';
import { isCharacterKind } from '../../animation/CharacterMotion';
import { renderCharacter } from '../../animation/CharacterVisuals';
import { ART_WIDTH, artTexture, styleActor } from '../../assets/painterlyArt';
import { GAME } from '../../config';
import { AREA_ENCOUNTERS } from '../../data/areaEncounters';
import { ROUTES } from '../../data/clan';
import { ALL_ENEMIES, encounterSpawnDelay } from '../../data/enemies';
import { Enemy } from '../../entities/actors';
import { areaArrivalAngle, type AreaEncounterState } from '../../state/areaEncounters';
import { encounterEnemy, encounterPlan } from '../../state/encounters';
import type { EnemyArchive, WorldArchive } from '../../state/expeditionArchive';
import { completedMigrations, currentLocation } from '../../state/journey';
import { isKhanActive } from '../../state/khan';
import { createEnemyStatus } from '../../state/statusEffects';
import { areaRiverTangent, areaSurface, habitatPreference } from '../../systems/AreaHabitat';
import { enemySpawnPosition } from '../../systems/CameraView';
import { projectedEnemySpawnPosition } from '../../systems/EnemySpawning';
import { ambientArrivalAngle } from '../../systems/authoredSites';
import { createEnemyTactics } from '../../systems/enemyTactics';
import type { EnemyDefinition } from '../../types';
import type { ArenaContext } from './ArenaContext';
import { captureBody } from './bodyArchive';

/** Where and for whom a scripted spawn appears. */
export interface SpawnDirective {
  point?: { x: number; y: number };
  angle?: number;
  objectiveId?: number;
  campOnly?: boolean;
}

/** Scene state the director reads but does not own yet. */
export interface EnemyDirectorHost {
  /** Replaced on arrival and load; read it live. */
  readonly areaEncounter: AreaEncounterState;
}

/**
 * Spawns and initialises pooled enemies, keeps their ground shadows, and saves or restores the enemy pool. Pool slot order is
 * saved identity (hit records, area-threat owners and tactical slots use it), so
 * restore recreates the pool in saved slot order and must run before projectiles.
 * Created once; `reset` runs in each `create`.
 */
export class EnemyDirector {
  /** Ground shadows keyed by pooled enemy. */
  readonly shadows = new Map<Enemy, Phaser.GameObjects.Image>();

  constructor(
    private readonly arena: ArenaContext,
    private readonly host: EnemyDirectorHost,
  ) {}

  reset(): void {
    this.shadows.clear();
  }

  spawn(forced?: EnemyDefinition, directive?: SpawnDirective): boolean {
    const { scene, run, enemies, landscape, player, camp } = this.arena;
    if (enemies.countActive(true) >= GAME.maxEnemies) return false;
    const selection = encounterEnemy(run);
    const definition = forced ?? selection.definition;
    const plan = encounterPlan(run);
    const camera = scene.cameras.main;
    const anchor =
      directive?.campOnly || !isKhanActive(run) || Math.random() < 0.45 ? camp : player;
    const area = AREA_ENCOUNTERS[currentLocation(run).id];
    const base =
      area.pattern === 'banks'
        ? areaRiverTangent(
            landscape.navigation?.terrain,
            currentLocation(run).id,
            anchor,
            plan.angle,
          )
        : plan.angle;
    const angle =
      directive?.angle ??
      (['warning', 'assault', 'elite'].includes(plan.phase)
        ? areaArrivalAngle(this.host.areaEncounter, run, base) +
          Phaser.Math.FloatBetween(-0.35, 0.35)
        : ambientArrivalAngle(currentLocation(run).id, anchor));
    const viewWidth = camera.width / camera.zoom;
    const viewHeight = camera.height / camera.zoom;
    const view = {
      x: camera.midPoint.x - viewWidth / 2,
      y: camera.midPoint.y - viewHeight / 2,
      width: viewWidth,
      height: viewHeight,
    };
    const navigation = landscape.navigation;
    const world = landscape.world3d;
    let point;
    if (directive?.point) {
      point = directive.point;
      if (navigation && !navigation.isWalkable(point.x, point.y, GAME.terrain.actorClearance, true))
        return false;
    } else if (world?.spawnView && navigation) {
      point = projectedEnemySpawnPosition(
        world.spawnView,
        anchor,
        isKhanActive(run) ? player : undefined,
        angle,
        {
          heightAt: (x, y) =>
            world.terrain.actorHeight(x, y) * world.terrain.region.biome.heightScale,
          walkable: (x, y) => navigation.isWalkable(x, y, GAME.terrain.actorClearance, true),
          preference:
            definition.home && definition.habitat
              ? (x, y) =>
                  habitatPreference(
                    areaSurface(navigation.terrain, currentLocation(run).id, x, y),
                    definition.habitat!,
                  )
              : undefined,
        },
        landscape.playBounds,
      );
      if (!point) return false;
    } else {
      point = enemySpawnPosition(view, anchor, angle, landscape.playBounds);
      if (navigation) {
        let safe = navigation.nearestWalkable(point);
        // Prefer connected ground beyond the view; never start a pooled actor inside a cliff.
        for (let attempt = 0; attempt < 12; attempt++) {
          const candidate = enemySpawnPosition(
            view,
            anchor,
            angle + (attempt * Math.PI) / 6,
            landscape.playBounds,
          );
          if (navigation.isWalkable(candidate.x, candidate.y, GAME.terrain.actorClearance, true)) {
            safe = candidate;
            break;
          }
        }
        if (!safe) return false;
        point = safe;
      }
    }
    const { x, y } = point;
    if (
      isKhanActive(run) &&
      Phaser.Math.Distance.Between(x, y, player.x, player.y) < GAME.spawning.minimumPlayerDistance
    )
      return false;
    const enemy = enemies.get(x, y, ...artTexture(definition.texture)) as Enemy | null;
    if (!enemy) return false;
    this.initialize(enemy, definition, x, y);
    enemy.elite ||= !forced && !!selection.elite;
    enemy.objectiveId = directive?.objectiveId;
    if (!forced && selection.elite) run.encounters.eliteSpawned = true;
    if (!directive?.point) this.host.areaEncounter.arrivals++;
    return true;
  }

  initialize(enemy: Enemy, definition: EnemyDefinition, x: number, y: number): void {
    const { scene, run, enemies } = this.arena;
    enemy.enableBody(true, x, y, true, true);
    const width = (ART_WIDTH[definition.texture] ?? 50) * (definition.scale / 2);
    styleActor(enemy, definition.texture, width, 5 * definition.scale);
    enemy.setTint(definition.tint ?? 0xffffff);
    if (!this.shadows.has(enemy)) this.shadows.set(enemy, scene.add.image(x, y, 'shadow'));
    this.shadows
      .get(enemy)!
      .setDisplaySize(width * 0.9, width * 0.3)
      .setVisible(true);
    enemy.definition = definition;
    enemy.elite = !!definition.elite;
    enemy.health = definition.health * (1 + run.elapsed / 1200);
    enemy.maxHealth = enemy.health;
    enemy.spawnId += 1;
    enemy.setAlpha(1).setAngle(0).setVelocity(0, 0);
    enemy.attackTimer = 1.5;
    enemy.clanAttackTimer = 0;
    enemy.chargeTimer = 0;
    enemy.burning = 0;
    enemy.tactics = createEnemyTactics();
    enemy.tacticalSlot = enemies.getChildren().indexOf(enemy);
    enemy.route = undefined;
    enemy.pinned = 0;
    enemy.status = createEnemyStatus();
    enemy.spiritSlow = 0;
    enemy.status = createEnemyStatus();
    enemy.lastGallop = -1;
    enemy.dangerTimer = definition.ability
      ? GAME.areaCombat.abilityEvery + (enemy.tacticalSlot % 7) * 0.15
      : GAME.tactics.seerEvery;
    enemy.objectiveId = undefined;
    if (!isCharacterKind(definition.texture))
      throw new Error(`Missing character animation: ${definition.texture}`);
    enemy.motion.reset(definition.texture, Math.random());
    enemy.preparingAttack = false;
  }

  /** The encounter spawn timer: spawn when due, then schedule the next arrival. */
  tickSpawns(dt: number): void {
    const { run, timers } = this.arena;
    timers.spawnTimer -= dt;
    if (timers.spawnTimer <= 0) {
      const spawned = this.spawn();
      timers.spawnTimer =
        encounterSpawnDelay(
          run.clan.stageTime,
          completedMigrations(run) === 0,
          run.clan.stage === 'migration'
            ? (ROUTES.find((r) => r.id === run.clan.routeId)?.danger ?? 1)
            : 1,
          spawned,
        ) * (spawned ? encounterPlan(run).interval : 1);
    }
  }

  /** Each pool slot's generation and every active enemy, keyed by slot. */
  capturePool(): Pick<WorldArchive, 'generations' | 'enemies'> {
    const pool = this.arena.enemies.getChildren() as Enemy[];
    return {
      generations: pool.map((e) => e.spawnId),
      enemies: pool.flatMap((e, slot): EnemyArchive[] =>
        e.active
          ? [
              {
                ...captureBody(e),
                slot,
                definition: e.definition.id,
                state: {
                  health: e.health,
                  elite: e.elite,
                  maxHealth: e.maxHealth,
                  spawnId: e.spawnId,
                  attackTimer: e.attackTimer,
                  clanAttackTimer: e.clanAttackTimer,
                  chargeTimer: e.chargeTimer,
                  burning: e.burning,
                  pinned: e.pinned,
                  status: { ...e.status },
                  spiritSlow: e.spiritSlow,
                  status: { ...e.status },
                  lastGallop: e.lastGallop,
                  dangerTimer: e.dangerTimer,
                  tacticalSlot: e.tacticalSlot,
                  objectiveId: e.objectiveId,
                  preparingAttack: e.preparingAttack,
                  tactics: e.tactics,
                },
                motion: e.motion.capture(),
              },
            ]
          : [],
      ),
    };
  }

  /** Recreates the pool in saved slot order and returns it for projectile hit records. */
  restorePool(world: WorldArchive): Enemy[] {
    return world.generations.map((spawnId, slot) => {
      const enemy = this.arena.enemies.create(0, 0, ...artTexture('wolf')) as Enemy;
      const saved = world.enemies.find((e) => e.slot === slot);
      if (!saved) {
        enemy.spawnId = spawnId;
        enemy.disableBody(true, true);
        return enemy;
      }
      const definition = ALL_ENEMIES.find((e) => e.id === saved.definition)!;
      this.initialize(enemy, definition, saved.x, saved.y);
      Object.assign(enemy, saved.state);
      enemy.setVelocity(saved.vx, saved.vy).setFlipX(saved.flip);
      enemy.motion.restore(saved.motion);
      renderCharacter(enemy, enemy.motion);
      enemy.setDepth(100 + enemy.y);
      this.shadows
        .get(enemy)!
        .setPosition(enemy.x + 6, enemy.y + 4)
        .setDepth(99 + enemy.y);
      return enemy;
    });
  }
}
