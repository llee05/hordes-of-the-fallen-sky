import Phaser from 'phaser';
import type { CampBarrier } from '../../assets/CampBarrier';
import { GAME } from '../../config';
import type { AreaThreatKind } from '../../data/areaEncounters';
import type { Enemy } from '../../entities/actors';
import { barrierContact, campBoundary } from '../../state/campBarrier';
import type { FinalStandState } from '../../state/finalStand';
import { currentLocation } from '../../state/journey';
import { isKhanActive } from '../../state/khan';
import { areaSurface, habitatPreference } from '../../systems/AreaHabitat';
import {
  advanceCharge,
  createEnemyTactics,
  seerDangerRadius,
  tacticalGoal,
} from '../../systems/enemyTactics';
import type { FieldMarkers } from '../../systems/FieldMarkers';
import type { EnemyDefinition } from '../../types';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { ClanDamage } from './ClanDamage';
import type { CombatSystem } from './CombatSystem';
import type { EnemyDirector } from './EnemyDirector';

type CampBoundary = ReturnType<typeof campBoundary>;

/** A seer's delayed danger circle, drawn and resolved by the scene's hazard step. */
export interface SeerHazard {
  x: number;
  y: number;
  remaining: number;
  warning: Phaser.GameObjects.Graphics;
  radius?: number;
  damage?: number;
  source?: 'seer';
}

/** Scene parts enemy behaviour uses that other systems own. */
export interface EnemyBehaviourHost {
  readonly campBarrier: CampBarrier;
  readonly fieldMarkers: FieldMarkers;
  /** Replaced on arrival and load; read it live. */
  readonly hazards: SeerHazard[];
  queueAreaThreat(kind: AreaThreatKind, point: { x: number; y: number }, owner?: string): boolean;
}

/** What one enemy is going for this frame, worked out once and shared by its steps. */
interface EnemyAim {
  campDistance: number;
  playerDistance: number;
  attackingCamp: boolean;
  target: { x: number; y: number };
  finale: FinalStandState | undefined;
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
      this.drawFinaleWarning(enemy, warnings);
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
      this.trample(enemy, aim, dt);
    }
  }

  /** Rings guards of the current gathering or crossing. */
  private markObjectiveGuard(enemy: Enemy, warnings: Phaser.GameObjects.Graphics): void {
    const objective = this.run.field.objective;
    if (
      (objective?.kind === 'gathering' &&
        objective.status === 'available' &&
        enemy.objectiveId === objective.id) ||
      (this.run.clan.stage === 'migration' &&
        this.run.crossing &&
        enemy.crossingId === this.run.crossing.key)
    )
      warnings.lineStyle(2, 0xdfbc74, 0.8).strokeCircle(enemy.x, enemy.y, 22);
  }

  /** Draws the Skybreaker's aimed line or its vulnerable ring. */
  private drawFinaleWarning(enemy: Enemy, warnings: Phaser.GameObjects.Graphics): void {
    const finaleWarning = enemy === this.enemyDirector.boss ? this.run.finalStand : undefined;
    if (finaleWarning?.phase === 'warning' && finaleWarning.aim)
      warnings
        .lineStyle(4, 0xdc976a, 0.85)
        .lineBetween(enemy.x, enemy.y, finaleWarning.aim.x, finaleWarning.aim.y)
        .strokeCircle(finaleWarning.aim.x, finaleWarning.aim.y, 70);
    if (finaleWarning?.phase === 'recovery')
      warnings.lineStyle(3, 0xf0d194, 0.8).strokeCircle(enemy.x, enemy.y, 52);
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
    enemy.dangerTimer -= dt;
  }

  /** Releases ordinary enemies far from the Khan, the camp and the view. */
  private despawnIfFar(enemy: Enemy, playerDistance: number, campDistance: number): boolean {
    if (
      playerDistance > GAME.spawning.despawnDistance &&
      campDistance > GAME.spawning.despawnDistance &&
      enemy !== this.enemyDirector.boss &&
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
    const attackingCamp = campDistance <= boundary.attackRange;
    let target: { x: number; y: number } =
      attackingCamp || campDistance < playerDistance * 1.25 ? this.camp : this.player;
    const finale = enemy.definition.behavior === 'boss' ? this.run.finalStand : undefined;
    if (finale) {
      const angle = (finale.approach * Math.PI) / 2;
      const desired = {
        x: this.camp.x + Math.cos(angle) * (boundary.attackRange + 180),
        y: this.camp.y + Math.sin(angle) * (boundary.attackRange + 180),
      };
      target = this.landscape.navigation?.nearestWalkable(desired) ?? desired;
    }
    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
    const behavior = enemy.definition.behavior;
    const ranged = behavior === 'ranged' || behavior === 'boss';
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
      finale,
      distance,
      behavior,
      ranged,
      clearShot,
    };
  }

  /** Base speed over this terrain, with habitat speed and concealment. */
  private terrainSpeed(enemy: Enemy, aim: EnemyAim): number {
    const clan = this.run.clan;
    const { campDistance, playerDistance } = aim;
    let speed =
      enemy.definition.speed *
      (1 + clan.region * 0.1) *
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

  /** Stops pinned, held or aiming enemies and slows them in trails. */
  private adjustSpeed(enemy: Enemy, aim: EnemyAim, speed: number): number {
    const { finale, distance, ranged, clearShot } = aim;
    speed *= 1;
    if (enemy.pinned > 0 || (finale && finale.phase !== 'advance')) speed = 0;
    if (
      this.run.combat.trails.some(
        (t) => Math.hypot(enemy.x - t.x, enemy.y - t.y) < GAME.mounted.trailRadius,
      )
    )
      speed *= 1 - GAME.mounted.trailSlow;
    if (ranged && !finale && distance < 260 && clearShot) speed = 0;
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
    const { attackingCamp, target, finale, distance, behavior, ranged, clearShot } = aim;
    if (finale && finale.phase !== 'advance') {
      enemy.setVelocity(0, 0);
    } else if (attackingCamp) {
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
      if (behavior === 'charger') {
        const state = enemy.tactics;
        const aim = state.aim ?? target;
        const angle = state.direction
          ? Math.atan2(state.direction.y, state.direction.x)
          : Math.atan2(aim.y - enemy.y, aim.x - enemy.x);
        const ahead = { x: enemy.x + Math.cos(angle) * 90, y: enemy.y + Math.sin(angle) * 90 };
        const blocked =
          !!this.landscape.navigation && !this.landscape.navigation.lineClear(enemy, ahead);
        advanceCharge(state, dt, enemy, target, blocked, enemy.pinned > 0);
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
          const waypoint =
            this.landscape.navigation?.waypoint(enemy, target, enemy.definition.navigation) ??
            target;
          this.physics.moveTo(
            enemy,
            waypoint.x,
            waypoint.y,
            speed * (state.phase === 'recover' ? 0.45 : 1),
          );
        }
      } else {
        const navigation = this.landscape.navigation;
        const waypoint =
          tactical !== target && (!navigation || navigation.lineClear(enemy, tactical))
            ? tactical
            : (navigation?.waypoint(enemy, target, enemy.definition.navigation) ?? target);
        const hold =
          !finale && ranged && clearShot && Math.abs(distance - GAME.tactics.seerRange) < 55;
        if (hold || speed === 0) enemy.setVelocity(0, 0);
        else this.physics.moveTo(enemy, waypoint.x, waypoint.y, speed);
      }
    }
  }

  /** Faces the target and shows an attack wind-up. */
  private showIntent(enemy: Enemy, aim: EnemyAim): void {
    const { attackingCamp, target, finale, distance, behavior } = aim;
    enemy.setFlipX(
      (this.landscape.world3d?.screenX(enemy.x - target.x, enemy.y - target.y) ??
        enemy.x - target.x) > 0,
    );
    enemy.preparingAttack =
      finale?.phase === 'warning' ||
      ((behavior === 'ranged' || behavior === 'boss') &&
        distance < 650 &&
        enemy.attackTimer > 0 &&
        enemy.attackTimer < 0.25) ||
      (attackingCamp && enemy.clanAttackTimer > 0 && enemy.clanAttackTimer < 0.2) ||
      (behavior === 'charger' && enemy.tactics.phase === 'windup') ||
      (!!enemy.definition.ability &&
        enemy.dangerTimer > 0 &&
        enemy.dangerTimer < 0.4 &&
        distance < GAME.areaCombat.abilityRange);
  }

  /** Strikes the camp barrier when in range and ready. */
  private attackCamp(enemy: Enemy, aim: EnemyAim): void {
    const { attackingCamp, finale } = aim;
    if (attackingCamp && !finale && enemy.clanAttackTimer <= 0) {
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

  /** Fires a ranged volley or the Skybreaker's ring. */
  private shootRanged(enemy: Enemy, aim: EnemyAim): void {
    const { target, finale, distance, behavior, clearShot } = aim;
    if (
      (behavior === 'ranged' || (behavior === 'boss' && !finale)) &&
      clearShot &&
      enemy.pinned <= 0 &&
      enemy.attackTimer <= 0 &&
      distance < 650
    ) {
      const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
      const count = behavior === 'boss' ? 12 : (enemy.definition.volley?.shots ?? 1);
      enemy.motion.attack();
      for (let i = 0; i < count; i += 1)
        this.combat.fireHostile(
          enemy,
          angle +
            (behavior === 'boss'
              ? (i * Math.PI * 2) / count
              : (i - (count - 1) / 2) * (enemy.definition.volley?.spread ?? 0)),
        );
      enemy.attackTimer = behavior === 'boss' ? 2.5 : (enemy.definition.volley?.interval ?? 3.5);
    }
  }

  /** Places the enemy's area-threat ability around the target. */
  private castAbility(enemy: Enemy, aim: EnemyAim): void {
    const { target, distance } = aim;
    if (
      enemy.definition.ability &&
      distance < GAME.areaCombat.abilityRange &&
      enemy.dangerTimer <= 0 &&
      enemy.pinned <= 0 &&
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
      enemy.pinned <= 0
    ) {
      this.host.hazards.push({
        x: target.x,
        y: target.y,
        remaining: GAME.tactics.seerDangerWarning,
        warning: this.add.graphics().setDepth(5),
        radius: seerDangerRadius(enemy.definition),
        damage: GAME.tactics.seerDangerDamage,
        source: 'seer',
      });
      enemy.dangerTimer = GAME.tactics.seerEvery;
    }
  }

  /** Pushes the enemy aside once per gallop. */
  private breakthrough(enemy: Enemy, aim: EnemyAim, khanActive: boolean): void {
    const { playerDistance } = aim;
    if (
      enemy.active &&
      khanActive &&
      this.timers.dashRemaining > 0 &&
      playerDistance < 68 &&
      enemy.lastGallop !== this.run.combat.gallopSerial
    ) {
      enemy.lastGallop = this.run.combat.gallopSerial;
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

  /** A wedge-formation gallop tramples enemies it passes. */
  private trample(enemy: Enemy, aim: EnemyAim, dt: number): void {
    const clan = this.run.clan;
    const { playerDistance } = aim;
    if (
      enemy.active &&
      this.timers.dashRemaining > 0 &&
      clan.formation === 'wedge' &&
      playerDistance < 64
    )
      this.combat.damageEnemy(enemy, dt * this.run.stats.damage * 18);
  }
}
