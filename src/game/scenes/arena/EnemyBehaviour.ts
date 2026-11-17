import Phaser from 'phaser';
import type { CampBarrier } from '../../assets/CampBarrier';
import { GAME } from '../../config';
import { classDefinition } from '../../data/classes';
import type { AreaThreatKind } from '../../data/areaEncounters';
import type { Enemy } from '../../entities/actors';
import { barrierContact, campBoundary } from '../../state/campBarrier';
import { currentLocation } from '../../state/journey';
import { isKhanActive } from '../../state/khan';
import { khanResourcesOf } from '../../state/khanResources';
import { isEnemyDisabled, statusSpeedMultiplier, tickEnemyStatus } from '../../state/statusEffects';
import { areaSurface, habitatPreference } from '../../systems/AreaHabitat';
import { routeDue } from '../../systems/enemyRoutes';
import { advanceCharge, createEnemyTactics, tacticalGoal } from '../../systems/enemyTactics';
import {
  advanceAlmas,
  advanceDeathWorm,
  advanceMuuShuuvuu,
  muuShuuvuuOrbit,
  type FolkloreAttack,
} from '../../systems/folkloreEnemies';
import type { FieldMarkers } from '../../systems/FieldMarkers';
import type { EnemyDefinition } from '../../types';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { ClanDamage } from './ClanDamage';
import type { CombatSystem } from './CombatSystem';
import type { EnemyDirector } from './EnemyDirector';

type CampBoundary = ReturnType<typeof campBoundary>;

/** Scene parts enemy behaviour uses that other systems own. */
export interface EnemyBehaviourHost {
  readonly campBarrier: CampBarrier;
  readonly fieldMarkers: FieldMarkers;
  /** Marks a seer's delayed danger circle, which the hazard step draws and resolves. */
  addSeerHazard(target: { x: number; y: number }, definition: EnemyDefinition): void;
  queueAreaThreat(kind: AreaThreatKind, point: { x: number; y: number }, owner?: string): boolean;
  /** Applies a committed folklore attack to the living Khan. */
  takeDamage(amount: number): void;
}

/** What one enemy is going for this frame, worked out once and shared by its steps. */
interface EnemyAim {
  campDistance: number;
  playerDistance: number;
  attackingCamp: boolean;
  target: { x: number; y: number };
  distance: number;
  behavior: EnemyDefinition['behavior'];
  ranged: boolean;
  clearShot: boolean;
}

/**
 * Per-frame enemy behaviour: warnings, barrier contact, timers, despawning,
 * targeting, movement and charges, camp attacks, ranged volleys, abilities, seer
 * hazards, gallop and fire effects. `update` runs each step in a fixed order;
 * steps share one `EnemyAim`, and reordering them changes play.
 */
export class EnemyBehaviour extends ArenaSystem {
  /** Counts updates; staggers route refreshes across the crowd. */
  private frame = 0;

  constructor(
    arena: ArenaContext,
    private readonly host: EnemyBehaviourHost,
    private readonly combat: CombatSystem,
    private readonly enemyDirector: EnemyDirector,
    private readonly clanDamage: ClanDamage,
  ) {
    super(arena);
  }

  /** Runs every active enemy's steps in order; the order is behaviour. */
  update(dt: number): void {
    this.frame += 1;
    const boundary = campBoundary(this.run);
    const khanActive = isKhanActive(this.run);
    const warnings = this.host.fieldMarkers.warnings.clear();
    for (const trail of this.run.combat.trails)
      warnings
        .lineStyle(1, 0x78b6ae, (0.3 * trail.remaining) / GAME.mounted.trailSeconds)
        .strokeCircle(trail.x, trail.y, GAME.mounted.trailRadius);
    for (const enemy of this.enemies.getChildren() as Enemy[]) {
      const shadow = this.enemyDirector.shadows.get(enemy);
      shadow?.setVisible(enemy.active);
      if (!enemy.active) continue;
      this.markObjectiveGuard(enemy, warnings);
      let campDistance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.camp.x, this.camp.y);
      campDistance = this.keepOutsideCamp(enemy, campDistance, boundary);
      this.advanceTimers(enemy, shadow, dt);
      const playerDistance = khanActive
        ? Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y)
        : Infinity;
      if (this.despawnIfFar(enemy, playerDistance, campDistance)) continue;
      const aim = this.aim(enemy, campDistance, playerDistance, boundary);
      let speed = this.terrainSpeed(enemy, aim);
      this.markElite(enemy, warnings);
      speed = this.adjustSpeed(enemy, aim, speed);
      this.steer(enemy, aim, speed, dt, warnings);
      this.showIntent(enemy, aim);
      this.attackCamp(enemy, aim);
      this.shootRanged(enemy, aim);
      this.castAbility(enemy, aim);
      this.castSeer(enemy, aim);
      this.breakthrough(enemy, aim, khanActive);
      this.burn(enemy, dt);
    }
  }

  /** Rings guards of the current gathering. */
  private markObjectiveGuard(enemy: Enemy, warnings: Phaser.GameObjects.Graphics): void {
    const objective = this.run.field.objective;
    if (
      objective?.kind === 'gathering' &&
      objective.status === 'available' &&
      enemy.objectiveId === objective.id
    )
      warnings.lineStyle(2, 0xdfbc74, 0.8).strokeCircle(enemy.x, enemy.y, 22);
  }

  /** Pushes an attacker out of the camp's barrier; returns its distance from camp. */
  private keepOutsideCamp(enemy: Enemy, campDistance: number, boundary: CampBoundary): number {
    const clearance = boundary.attackRange - 1;
    if (campDistance < clearance) {
      // Moving or expanding hurdles push attackers out instead of covering them.
      const contact = barrierContact(this.camp, enemy, clearance);
      enemy.setPosition(contact.x, contact.y);
      enemy.body!.updateFromGameObject();
      campDistance = clearance;
    }
    return campDistance;
  }

  /** Updates depth and shadow, then counts down the enemy's own timers. */
  private advanceTimers(
    enemy: Enemy,
    shadow: Phaser.GameObjects.Image | undefined,
    dt: number,
  ): void {
    enemy.setDepth(100 + enemy.y);
    shadow?.setPosition(enemy.x + 8, enemy.y + 5).setDepth(99 + enemy.y);
    enemy.attackTimer -= dt;
    enemy.clanAttackTimer -= dt;
    enemy.chargeTimer -= dt;
    enemy.pinned = Math.max(0, enemy.pinned - dt);
    tickEnemyStatus(enemy.status, dt);
    enemy.spiritSlow = Math.max(0, enemy.spiritSlow - dt);
    enemy.dangerTimer -= dt;
  }

  /** Releases ordinary enemies far from the Khan, the camp and the view. */
  private despawnIfFar(enemy: Enemy, playerDistance: number, campDistance: number): boolean {
    if (
      playerDistance > GAME.spawning.despawnDistance &&
      campDistance > GAME.spawning.despawnDistance &&
      !this.landscape.world3d?.nearView(enemy, GAME.spawning.viewRetentionMargin)
    ) {
      enemy.disableBody(true, true);
      return true;
    }
    return false;
  }

  /** Chooses what the enemy moves toward and whether it has a clear shot. */
  private aim(
    enemy: Enemy,
    campDistance: number,
    playerDistance: number,
    boundary: CampBoundary,
  ): EnemyAim {
    const behavior = enemy.definition.behavior;
    const khanTargeted = behavior === 'muu-shuuvuu' && Number.isFinite(playerDistance);
    const attackingCamp = !khanTargeted && campDistance <= boundary.attackRange;
    const target: { x: number; y: number } = khanTargeted
      ? this.player
      : attackingCamp || campDistance < playerDistance * 1.25
        ? this.camp
        : this.player;
    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
    const ranged = behavior === 'ranged';
    const clearShot =
      !this.landscape.world3d ||
      !ranged ||
      distance >= 650 ||
      this.landscape.navigation!.lineClear(enemy, target, 0);
    return {
      campDistance,
      playerDistance,
      attackingCamp,
      target,
      distance,
      behavior,
      ranged,
      clearShot,
    };
  }

  /** Base speed over this terrain, with habitat speed and concealment. */
  private terrainSpeed(enemy: Enemy, aim: EnemyAim): number {
    const { campDistance, playerDistance } = aim;
    let speed =
      enemy.definition.speed *
      Math.max(
        0.65,
        1 /
          Math.sqrt(this.landscape.navigation?.travelCost(enemy, enemy.definition.navigation) ?? 1),
      );
    if (enemy.definition.home && enemy.definition.habitat) {
      const surface = areaSurface(
        this.landscape.navigation?.terrain,
        currentLocation(this.run).id,
        enemy.x,
        enemy.y,
      );
      const suited = habitatPreference(surface, enemy.definition.habitat) > 0.5;
      if (suited) speed *= GAME.areaEnemies.habitatSpeed;
      enemy.setAlpha(
        enemy.definition.concealed &&
          suited &&
          Math.min(playerDistance, campDistance) > GAME.areaEnemies.revealRange
          ? GAME.areaEnemies.concealedAlpha
          : 1,
      );
    }
    return speed;
  }

  /** Rings elite enemies. */
  private markElite(enemy: Enemy, warnings: Phaser.GameObjects.Graphics): void {
    if (enemy.elite) warnings.lineStyle(3, 0xe0bc76, 0.85).strokeCircle(enemy.x, enemy.y, 30);
  }

  /** Stops pinned, stunned, held or aiming enemies; slows them in trails and by status. */
  private adjustSpeed(enemy: Enemy, aim: EnemyAim, speed: number): number {
    const { distance, ranged, clearShot } = aim;
    if (isEnemyDisabled(enemy)) speed = 0;
    else if (enemy.spiritSlow > 0) speed *= GAME.classes['spirit-caller'].spirit.slowMultiplier;
    speed *= statusSpeedMultiplier(enemy.status);
    if (
      this.run.combat.trails.some(
        (t) => Math.hypot(enemy.x - t.x, enemy.y - t.y) < GAME.mounted.trailRadius,
      )
    )
      speed *= 1 - GAME.mounted.trailSlow;
    if (ranged && distance < 260 && clearShot) speed = 0;
    return speed;
  }

  /** Holds at the barrier, charges, or follows terrain and tactics toward the target. */
  private steer(
    enemy: Enemy,
    aim: EnemyAim,
    speed: number,
    dt: number,
    warnings: Phaser.GameObjects.Graphics,
  ): void {
    const { attackingCamp, target, distance, behavior, ranged, clearShot } = aim;
    if (enemy.status.forced > 0) {
      // Pulls and knockbacks override steering; an interrupted charge has to recover.
      enemy.setVelocity(enemy.status.forcedVx, enemy.status.forcedVy);
      if (behavior === 'charger' && enemy.tactics.phase !== 'approach') {
        enemy.tactics.phase = 'recover';
        enemy.tactics.remaining = GAME.tactics.chargeRecovery;
      }
      this.interruptFolklore(enemy);
      enemy.preparingAttack = false;
    } else if (attackingCamp && !['almas', 'death-worm', 'muu-shuuvuu'].includes(behavior ?? '')) {
      // Hold outside the tents instead of walking (or charging) into their centre.
      enemy.setVelocity(0, 0);
      enemy.chargeTimer = 0;
      enemy.tactics = createEnemyTactics();
    } else {
      const tactical = tacticalGoal(
        enemy.definition,
        enemy,
        target,
        enemy.tacticalSlot,
        this.run.elapsed,
      );
      if (behavior === 'almas') {
        this.steerAlmas(enemy, aim, speed, dt, warnings);
      } else if (behavior === 'death-worm') {
        this.steerDeathWorm(enemy, aim, speed, dt, warnings);
      } else if (behavior === 'muu-shuuvuu') {
        this.steerMuuShuuvuu(enemy, aim, speed, dt, warnings);
      } else if (behavior === 'charger') {
        const state = enemy.tactics;
        const facing = state.aim ?? target;
        const angle = state.direction
          ? Math.atan2(state.direction.y, state.direction.x)
          : Math.atan2(facing.y - enemy.y, facing.x - enemy.x);
        const ahead = { x: enemy.x + Math.cos(angle) * 90, y: enemy.y + Math.sin(angle) * 90 };
        const blocked =
          !!this.landscape.navigation && !this.landscape.navigation.lineClear(enemy, ahead);
        advanceCharge(state, dt, enemy, target, blocked, isEnemyDisabled(enemy));
        enemy.chargeTimer =
          state.phase === 'charge'
            ? state.remaining + 2.3
            : state.phase === 'windup'
              ? state.remaining
              : 0;
        if (state.phase === 'windup') {
          enemy.setVelocity(0, 0);
          enemy.preparingAttack = true;
          warnings
            .lineStyle(3, 0xc97b62, 0.65)
            .lineBetween(enemy.x, enemy.y, state.aim!.x, state.aim!.y);
        } else if (state.phase === 'charge') {
          const chargeAngle = Math.atan2(state.direction!.y, state.direction!.x);
          enemy.setVelocity(
            Math.cos(chargeAngle) * speed * 2.2,
            Math.sin(chargeAngle) * speed * 2.2,
          );
        } else {
          const waypoint = this.routeTo(
            enemy,
            aim,
            () =>
              this.landscape.navigation?.waypoint(enemy, target, enemy.definition.navigation) ??
              target,
          );
          this.physics.moveTo(
            enemy,
            waypoint.x,
            waypoint.y,
            speed * (state.phase === 'recover' ? 0.45 : 1),
          );
        }
      } else {
        const navigation = this.landscape.navigation;
        const waypoint = this.routeTo(enemy, aim, () =>
          tactical !== target && (!navigation || navigation.lineClear(enemy, tactical))
            ? tactical
            : (navigation?.waypoint(enemy, target, enemy.definition.navigation) ?? target),
        );
        const hold = ranged && clearShot && Math.abs(distance - GAME.tactics.seerRange) < 55;
        if (hold || speed === 0) enemy.setVelocity(0, 0);
        else this.physics.moveTo(enemy, waypoint.x, waypoint.y, speed);
      }
    }
  }

  /** Burrows to a marked point, spits a poison-coloured hostile shot, or bites up close. */
  private steerDeathWorm(
    enemy: Enemy,
    aim: EnemyAim,
    speed: number,
    dt: number,
    warnings: Phaser.GameObjects.Graphics,
  ): void {
    const tuning = GAME.tactics.deathWorm;
    const step = advanceDeathWorm(enemy.folklore, dt, enemy, aim.target, isEnemyDisabled(enemy));
    const state = enemy.folklore;
    const underground = state.phase === 'attack' && state.attack === 'burrow';
    enemy.setAlpha(underground ? 0.16 : 1);
    this.enemyDirector.shadows.get(enemy)?.setAlpha(underground ? 0.08 : 1);
    if (state.phase === 'windup') {
      enemy.setVelocity(0, 0);
      enemy.preparingAttack = true;
      if (state.attack === 'burrow')
        warnings
          .fillStyle(0x655544, 0.12)
          .fillCircle(enemy.x, enemy.y, 48)
          .lineStyle(3, 0xb8875d, 0.85)
          .strokeCircle(enemy.x, enemy.y, 48);
      else if (state.aim)
        warnings
          .lineStyle(3, state.attack === 'poison' ? 0x91a56c : 0xc58265, 0.8)
          .lineBetween(enemy.x, enemy.y, state.aim.x, state.aim.y);
    } else if (underground) {
      enemy.setVelocity(0, 0);
      if (state.aim)
        warnings
          .fillStyle(0x755846, 0.14)
          .fillCircle(state.aim.x, state.aim.y, tuning.emergenceRadius)
          .lineStyle(3, 0xd09a66, 0.9)
          .strokeCircle(state.aim.x, state.aim.y, tuning.emergenceRadius);
    } else {
      const waypoint = this.routeTo(
        enemy,
        aim,
        () => this.landscape.navigation?.waypoint(enemy, aim.target, 'ground') ?? aim.target,
      );
      this.physics.moveTo(
        enemy,
        waypoint.x,
        waypoint.y,
        speed * (state.phase === 'recover' ? 0.55 : 1),
      );
    }
    if (step.released === 'bite') {
      this.strikeDeathWorm(enemy, aim, tuning.biteDamage, tuning.biteRange);
      enemy.motion.attack();
    } else if (step.released === 'poison') {
      const angle = Math.atan2(aim.target.y - enemy.y, aim.target.x - enemy.x);
      const shot = this.combat.fireHostile(enemy, angle);
      shot?.setVelocity(Math.cos(angle) * tuning.poisonSpeed, Math.sin(angle) * tuning.poisonSpeed);
      if (shot) shot.damage *= tuning.poisonDamage;
      enemy.motion.attack();
    } else if (step.emerged && state.aim) {
      const direction = state.direction ?? { x: 1, y: 0 };
      const desired = {
        x: state.aim.x - direction.x * 42,
        y: state.aim.y - direction.y * 42,
      };
      const point = this.landscape.navigation?.nearestWalkable(desired) ?? desired;
      if (point) {
        enemy.setPosition(point.x, point.y);
        enemy.body?.updateFromGameObject();
      }
      const emergedAim = {
        ...aim,
        playerDistance: Phaser.Math.Distance.Between(
          enemy.x,
          enemy.y,
          this.player.x,
          this.player.y,
        ),
      };
      this.strikeDeathWorm(enemy, emergedAim, tuning.emergenceDamage, tuning.emergenceRadius);
      enemy.motion.attack();
      this.effects.ring(enemy.x, enemy.y, tuning.emergenceRadius, 0xa97555);
    }
  }

  private strikeDeathWorm(enemy: Enemy, aim: EnemyAim, multiplier: number, radius: number): void {
    const damage = enemy.definition.damage * multiplier;
    if (aim.attackingCamp) {
      this.clanDamage.damage(
        damage * GAME.camp.enemyAttack.damageMultiplier,
        'attack',
        enemy.definition.title,
        enemy,
      );
      const impact = this.host.campBarrier.hit(this.camp, enemy);
      this.effects.burst(impact.x, impact.y - 8, 0x718c58, 4);
    } else if (aim.playerDistance <= radius) this.host.takeDamage(damage);
  }

  /** Orbits its target between alternating dive strikes and radius-marked shrieks. */
  private steerMuuShuuvuu(
    enemy: Enemy,
    aim: EnemyAim,
    speed: number,
    dt: number,
    warnings: Phaser.GameObjects.Graphics,
  ): void {
    const tuning = GAME.tactics.muuShuuvuu;
    const step = advanceMuuShuuvuu(enemy.folklore, dt, enemy, aim.target, isEnemyDisabled(enemy));
    const state = enemy.folklore;
    if (state.phase === 'windup') {
      enemy.setVelocity(0, 0);
      enemy.preparingAttack = true;
      if (state.attack === 'dive' && state.aim)
        warnings
          .lineStyle(4, 0xb76063, 0.85)
          .lineBetween(enemy.x, enemy.y, state.aim.x, state.aim.y);
      else
        warnings
          .fillStyle(0x66517e, 0.13)
          .fillCircle(enemy.x, enemy.y, tuning.shriekRadius)
          .lineStyle(3, 0xb8a0cc, 0.9)
          .strokeCircle(enemy.x, enemy.y, tuning.shriekRadius);
    } else if (state.phase === 'attack' && state.attack === 'dive' && state.direction) {
      enemy.setVelocity(
        state.direction.x * speed * tuning.diveSpeed,
        state.direction.y * speed * tuning.diveSpeed,
      );
      if (!state.hit && (aim.attackingCamp || aim.playerDistance <= 54)) {
        this.strikeMuuShuuvuu(enemy, aim, tuning.diveDamage, 54);
        state.hit = true;
        state.phase = 'recover';
        state.remaining = tuning.recovery;
      }
    } else {
      const orbit = muuShuuvuuOrbit(aim.target, this.run.elapsed, enemy.tacticalSlot);
      this.physics.moveTo(enemy, orbit.x, orbit.y, speed * (state.phase === 'recover' ? 0.65 : 1));
    }
    if (step.released === 'shriek') {
      this.strikeMuuShuuvuu(enemy, aim, tuning.shriekDamage, tuning.shriekRadius);
      enemy.motion.attack();
      this.effects.ring(enemy.x, enemy.y, tuning.shriekRadius, 0x806b9a);
      this.audio.play('spell', enemy);
    } else if (step.released === 'dive') enemy.motion.attack();
  }

  private strikeMuuShuuvuu(enemy: Enemy, aim: EnemyAim, multiplier: number, radius: number): void {
    const damage = enemy.definition.damage * multiplier;
    if (aim.attackingCamp)
      this.clanDamage.damage(
        damage * GAME.camp.enemyAttack.damageMultiplier,
        'attack',
        enemy.definition.title,
        enemy,
      );
    else if (aim.playerDistance <= radius) this.host.takeDamage(damage);
  }

  /** Runs the Almas' claw, slam and charge cycle with static, ground-readable warnings. */
  private steerAlmas(
    enemy: Enemy,
    aim: EnemyAim,
    speed: number,
    dt: number,
    warnings: Phaser.GameObjects.Graphics,
  ): void {
    const tuning = GAME.tactics.almas;
    const { target, attackingCamp } = aim;
    const step = advanceAlmas(enemy.folklore, dt, enemy, target, isEnemyDisabled(enemy));
    const state = enemy.folklore;
    if (state.phase === 'windup') {
      enemy.setVelocity(0, 0);
      enemy.preparingAttack = true;
      const progress = 1 - state.remaining / Math.max(0.01, this.almasWarning(state.attack));
      if (state.attack === 'charge' && state.aim)
        warnings
          .lineStyle(4, 0xc66f55, 0.65 + progress * 0.2)
          .lineBetween(enemy.x, enemy.y, state.aim.x, state.aim.y);
      else
        warnings
          .fillStyle(0x8d503f, 0.1)
          .fillCircle(enemy.x, enemy.y, state.attack === 'slam' ? tuning.slamRadius : 52)
          .lineStyle(3, 0xd18a68, 0.8)
          .strokeCircle(enemy.x, enemy.y, state.attack === 'slam' ? tuning.slamRadius : 52);
    } else if (state.phase === 'attack' && state.attack === 'charge' && state.direction) {
      enemy.setVelocity(
        state.direction.x * speed * tuning.chargeSpeed,
        state.direction.y * speed * tuning.chargeSpeed,
      );
      if (!state.hit && (attackingCamp || aim.playerDistance <= 58)) {
        this.strikeAlmas(enemy, aim, tuning.chargeDamage, 58);
        state.hit = true;
        state.phase = 'recover';
        state.remaining = tuning.recovery;
      }
    } else {
      const waypoint = this.routeTo(
        enemy,
        aim,
        () => this.landscape.navigation?.waypoint(enemy, target, 'heavy') ?? target,
      );
      this.physics.moveTo(
        enemy,
        waypoint.x,
        waypoint.y,
        speed * (state.phase === 'recover' ? 0.42 : 1),
      );
    }
    if (step.released === 'claw') this.strikeAlmas(enemy, aim, tuning.clawDamage, 72);
    if (step.released === 'slam') {
      this.strikeAlmas(enemy, aim, tuning.slamDamage, tuning.slamRadius);
      this.effects.ring(enemy.x, enemy.y, tuning.slamRadius, 0xb56f54);
      this.effects.shake(120, 0.004);
    }
    if (step.released) enemy.motion.attack();
  }

  private almasWarning(attack?: FolkloreAttack): number {
    const tuning = GAME.tactics.almas;
    return attack === 'slam'
      ? tuning.slamWarning
      : attack === 'charge'
        ? tuning.chargeWarning
        : tuning.clawWarning;
  }

  /** Applies one committed Almas hit either to the Khan or the camp barrier. */
  private strikeAlmas(enemy: Enemy, aim: EnemyAim, multiplier: number, radius: number): void {
    const damage = enemy.definition.damage * multiplier;
    if (aim.attackingCamp) {
      this.clanDamage.damage(
        damage * GAME.camp.enemyAttack.damageMultiplier,
        'attack',
        enemy.definition.title,
        enemy,
      );
      const impact = this.host.campBarrier.hit(this.camp, enemy);
      this.effects.burst(impact.x, impact.y - 12, 0xb56f54, 5);
    } else if (aim.playerDistance <= radius) this.host.takeDamage(damage);
  }

  /**
   * The waypoint the enemy steers toward. Terrain routes are re-planned when
   * `routeDue` says so; between refreshes the enemy keeps heading for the last one.
   */
  private routeTo(
    enemy: Enemy,
    aim: EnemyAim,
    plan: () => { x: number; y: number },
  ): { x: number; y: number } {
    const { target, distance, playerDistance } = aim;
    if (
      !this.landscape.navigation ||
      routeDue(
        enemy.route,
        this.frame,
        enemy.tacticalSlot,
        Math.min(distance, playerDistance),
        target,
        enemy,
      )
    ) {
      const point = plan();
      enemy.route = { x: point.x, y: point.y, target };
      return point;
    }
    return enemy.route!;
  }

  /** Faces the target and shows an attack wind-up. */
  private showIntent(enemy: Enemy, aim: EnemyAim): void {
    const { attackingCamp, target, distance, behavior } = aim;
    enemy.setFlipX(
      (this.landscape.world3d?.screenX(enemy.x - target.x, enemy.y - target.y) ??
        enemy.x - target.x) > 0,
    );
    enemy.preparingAttack =
      (behavior === 'ranged' &&
        distance < 650 &&
        enemy.attackTimer > 0 &&
        enemy.attackTimer < 0.25) ||
      (attackingCamp && enemy.clanAttackTimer > 0 && enemy.clanAttackTimer < 0.2) ||
      (behavior === 'charger' && enemy.tactics.phase === 'windup') ||
      (behavior === 'almas' && enemy.folklore.phase === 'windup') ||
      (behavior === 'death-worm' && enemy.folklore.phase === 'windup') ||
      (behavior === 'muu-shuuvuu' && enemy.folklore.phase === 'windup') ||
      (!!enemy.definition.ability &&
        enemy.dangerTimer > 0 &&
        enemy.dangerTimer < 0.4 &&
        distance < GAME.areaCombat.abilityRange);
  }

  /** Strikes the camp barrier when in range and ready. */
  private attackCamp(enemy: Enemy, aim: EnemyAim): void {
    const { attackingCamp } = aim;
    if (['almas', 'death-worm', 'muu-shuuvuu'].includes(enemy.definition.behavior ?? '')) return;
    if (attackingCamp && enemy.clanAttackTimer <= 0 && enemy.status.stun <= 0) {
      enemy.motion.attack();
      this.clanDamage.damage(
        enemy.definition.damage * GAME.camp.enemyAttack.damageMultiplier,
        'attack',
        enemy.definition.title ?? enemy.definition.id,
        enemy,
      );
      enemy.clanAttackTimer = GAME.camp.enemyAttack.interval;
      const impact = this.host.campBarrier.hit(this.camp, enemy);
      this.audio.play('barrier', impact);
      this.effects.burst(impact.x, impact.y - 12, 0xc9a26a, 3);
    }
  }

  /** Fires a ranged volley. */
  private shootRanged(enemy: Enemy, aim: EnemyAim): void {
    const { target, distance, behavior, clearShot } = aim;
    if (
      behavior === 'ranged' &&
      clearShot &&
      !isEnemyDisabled(enemy) &&
      enemy.attackTimer <= 0 &&
      distance < 650
    ) {
      const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
      const count = enemy.definition.volley?.shots ?? 1;
      enemy.motion.attack();
      for (let i = 0; i < count; i += 1)
        this.combat.fireHostile(
          enemy,
          angle + (i - (count - 1) / 2) * (enemy.definition.volley?.spread ?? 0),
        );
      enemy.attackTimer = enemy.definition.volley?.interval ?? 3.5;
    }
  }

  /** Places the enemy's area-threat ability around the target. */
  private castAbility(enemy: Enemy, aim: EnemyAim): void {
    const { target, distance } = aim;
    if (
      enemy.definition.ability &&
      distance < GAME.areaCombat.abilityRange &&
      enemy.dangerTimer <= 0 &&
      !isEnemyDisabled(enemy) &&
      (!this.landscape.navigation || this.landscape.navigation.lineClear(enemy, target, 0))
    ) {
      const ability = enemy.definition.ability,
        owner = `${enemy.tacticalSlot}:${enemy.spawnId}`;
      let placed = 0;
      for (let i = 0; i < ability.count; i++) {
        const offset = (i - (ability.count - 1) / 2) * GAME.areaCombat.spread;
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        const point = {
          x: target.x - Math.sin(angle) * offset,
          y: target.y + Math.cos(angle) * offset,
        };
        if (this.host.queueAreaThreat(ability.kind, point, owner)) placed++;
      }
      enemy.dangerTimer = placed ? GAME.areaCombat.abilityEvery : GAME.areaCombat.abilityRetry;
      if (placed) {
        enemy.motion.attack();
        this.audio.play('spell', enemy);
      }
    }
  }

  /** Marks a hollow seer's delayed danger circle. */
  private castSeer(enemy: Enemy, aim: EnemyAim): void {
    const { target, distance, clearShot } = aim;
    if (
      enemy.definition.id === 'hollow-seer' &&
      distance < 650 &&
      clearShot &&
      enemy.dangerTimer <= 0 &&
      !isEnemyDisabled(enemy)
    ) {
      this.host.addSeerHazard(target, enemy.definition);
      enemy.dangerTimer = GAME.tactics.seerEvery;
    }
  }

  /** Pushes the enemy aside once per gallop. */
  private breakthrough(enemy: Enemy, aim: EnemyAim, khanActive: boolean): void {
    const { playerDistance } = aim;
    if (
      enemy.active &&
      khanActive &&
      (this.timers.dashRemaining > 0 || khanResourcesOf(this.timers).sprinting) &&
      playerDistance < 68 &&
      enemy.lastGallop !== this.run.combat.gallopSerial
    ) {
      enemy.lastGallop = this.run.combat.gallopSerial;
      const cls = classDefinition(this.run.character?.classId);
      if (cls.id === 'lancer' || cls.id === 'iron-pagoda') {
        enemy.pinned = Math.max(enemy.pinned, GAME.mounted.pinSeconds);
        enemy.setVelocity(0, 0);
        this.interruptFolklore(enemy);
        enemy.preparingAttack = false;
      }
      const d = Math.max(1, playerDistance),
        push = GAME.mounted.breakthroughPush;
      if (push > 0) {
        const desired = {
          x: enemy.x + ((enemy.x - this.player.x) / d) * push,
          y: enemy.y + ((enemy.y - this.player.y) / d) * push,
        };
        const point =
          this.landscape.navigation?.slide(enemy, desired, GAME.terrain.actorClearance) ?? desired;
        enemy.setPosition(point.x, point.y);
      }
    }
  }

  private interruptFolklore(enemy: Enemy): void {
    const behavior = enemy.definition.behavior;
    if (
      ['almas', 'death-worm', 'muu-shuuvuu'].includes(behavior ?? '') &&
      enemy.folklore.phase !== 'approach'
    ) {
      enemy.folklore.phase = 'recover';
      enemy.folklore.remaining =
        behavior === 'almas'
          ? GAME.tactics.almas.recovery
          : behavior === 'death-worm'
            ? GAME.tactics.deathWorm.recovery
            : GAME.tactics.muuShuuvuu.recovery;
      enemy.folklore.hit = false;
      enemy.setAlpha(1);
      this.enemyDirector.shadows.get(enemy)?.setAlpha(1);
    }
  }

  /** Burns the enemy while fire arrows keep it alight. */
  private burn(enemy: Enemy, dt: number): void {
    if (enemy.burning > 0) {
      enemy.burning -= dt;
      this.combat.damageEnemy(
        enemy,
        dt * this.run.stats.damage * 0.45 * this.run.clan.campEffects.multipliers.burnDamage,
      );
    }
  }
}
