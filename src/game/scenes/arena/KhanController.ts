import Phaser from 'phaser';
import { effectAmount } from '../../../shared/visualSettings';
import { CharacterMotion } from '../../animation/CharacterMotion';
import { renderCharacter, renderCharacterLayers } from '../../animation/CharacterVisuals';
import { GAME } from '../../config';
import { classDefinition, khanGallopSpeed } from '../../data/classes';
import type { Enemy } from '../../entities/actors';
import { areaMovementMultiplier, type AreaThreatState } from '../../state/areaThreats';
import { gallopCooldown } from '../../state/campCombat';
import type { WorldArchive } from '../../state/expeditionArchive';
import { completeGuidance } from '../../state/guidance';
import { damageKhan, isKhanActive, khanSpeedMultiplier } from '../../state/khan';
import { activeKhanManeuver } from '../../state/khanManeuvers';
import {
  createKhanStatus,
  isKhanGuarded,
  isKhanUnstoppable,
  khanStatusOf,
  khanStatusSpeed,
  mitigateKhanDamage,
} from '../../state/statusEffects';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import { captureBody } from './bodyArchive';

/** Scene parts the Khan uses that other systems own. */
export interface KhanHost {
  /** Replaced on arrival and load; read it live. */
  readonly areaThreats: AreaThreatState;
  clearTouch(): void;
}

/**
 * The Khan on the battlefield: riding, the gallop, taking damage, falling and a
 * successor's return to camp, the ground shadow and aura, animation, and the
 * saved body. Succession rules stay in `state/khan.ts`. Created once; `reset`
 * and `createAttachments` run in each `create`.
 */
export class KhanController extends ArenaSystem {
  readonly playerMotion = new CharacterMotion('player');
  shadow!: Phaser.GameObjects.Image;
  private aura!: Phaser.GameObjects.Arc;
  private upper?: Phaser.GameObjects.Image;
  private dustTimer = 0;

  constructor(
    arena: ArenaContext,
    private readonly host: KhanHost,
  ) {
    super(arena);
  }

  reset(): void {
    this.playerMotion.reset('player');
    this.playerMotion.setPlayerClass(this.run.character?.classId ?? 'mounted-archer');
    this.playerMotion.setPlayerGender(this.run.character?.gender ?? 'man');
    this.upper?.destroy();
    this.upper = undefined;
    this.dustTimer = 0;
  }

  /** Creates the ground shadow and aura at the world centre. */
  createAttachments(): void {
    const center = this.landscape.campPosition;
    this.shadow = this.add
      .image(center.x, center.y, 'shadow')
      .setDisplaySize(64, 24)
      .setAlpha(0.85);
    this.aura = this.add
      .circle(center.x, center.y, 24, 0x9bc9c3, 0.02)
      .setStrokeStyle(1, 0xe9dfaf, 0.45)
      .setScale(1, 0.5)
      .setDepth(2);
  }

  /** Moves the shadow and aura to the Khan's current position. */
  syncAttachments(): void {
    this.renderPlayerVisual();
    this.shadow.setPosition(this.player.x + 9, this.player.y + 5).setDepth(99 + this.player.y);
    this.aura.setPosition(this.player.x, this.player.y);
  }

  dash(): void {
    if (this.run.phase !== 'playing' || !isKhanActive(this.run) || this.timers.dashTimer > 0)
      return;
    this.run.combat.gallopSerial++;

    this.timers.dashRemaining = GAME.dash.duration;
    this.timers.dashTimer = gallopCooldown(this.run);
    this.timers.invulnerable = Math.max(this.timers.invulnerable, GAME.dash.duration);
    this.audio.play('dash');
    const cls = classDefinition(this.run.character?.classId);
    this.effects.burst(this.player.x, this.player.y, cls.weapon.projectileTint, 7);
  }

  /** Rides along `movement` (the input intent, rotated here into world space). */
  move(dt: number, movement: Phaser.Math.Vector2): void {
    const inputMoving = movement.lengthSq() > 0.01;
    if (inputMoving) this.playerMotion.face(movement.x, movement.y);
    if (this.landscape.world3d) {
      const rotated = this.landscape.world3d.movement(movement.x, movement.y);
      movement.set(rotated.x, rotated.y);
    }
    const maneuver = activeKhanManeuver(this.timers);
    if (maneuver?.direction) movement.set(maneuver.direction.x, maneuver.direction.y);
    const moving = movement.lengthSq() > 0.01;
    const status = khanStatusOf(this.timers);
    const classAction = this.timers.classAction;
    if (moving) {
      completeGuidance(this.run, 'ride');
      this.facing.copy(movement).normalize();
    }
    if (!moving && classAction?.kind === 'unstoppable') movement.copy(this.facing);
    if (classAction?.kind === 'dash')
      movement
        .set(classAction.directionX, classAction.directionY)
        .normalize()
        .scale(classAction.speed);
    else if (this.timers.dashRemaining > 0)
      movement.copy(this.facing).scale(khanGallopSpeed(this.run));
    else {
      // Unstoppable stances shrug off slowing terrain as well as knockback.
      movement.scale(
        this.run.stats.speed *
          khanSpeedMultiplier(this.run) *
          khanStatusSpeed(status) *
          (classAction?.kind === 'unstoppable' ? classAction.speed : 1) *
          (isKhanUnstoppable(status)
            ? 1
            : areaMovementMultiplier(this.host.areaThreats, this.player)) *
          (maneuver?.speedMultiplier ?? 1),
      );
    }
    this.player.setVelocity(movement.x, movement.y);
    const faceX = this.landscape.world3d?.screenX(this.facing.x, this.facing.y) ?? this.facing.x;
    if (this.playerMotion.directional) this.player.setFlipX(false);
    else if (Math.abs(faceX) > 0.01) this.player.setFlipX(faceX < 0);
    this.player.setAlpha(
      this.timers.invulnerable > 0 ? (Math.floor(this.run.elapsed * 20) % 2 ? 0.5 : 0.85) : 1,
    );
    this.player.setDepth(100 + this.player.y);
    this.shadow.setPosition(this.player.x + 9, this.player.y + 5).setDepth(99 + this.player.y);
    this.dustTimer -= dt;
    if ((moving || !!classAction) && effectAmount(this.visualSettings) > 0 && this.dustTimer <= 0) {
      this.effects.dust(this.player.x, this.player.y, this.facing.x, this.timers.dashRemaining > 0);
      this.dustTimer = 0.12 / Math.max(0.1, effectAmount(this.visualSettings));
    }
    this.aura.setPosition(this.player.x, this.player.y);
  }

  hurtPlayer(enemy: Enemy): void {
    if (
      this.run.phase !== 'playing' ||
      !isKhanActive(this.run) ||
      !enemy.active ||
      enemy.status.stun > 0 ||
      this.timers.invulnerable > 0
    )
      return;
    enemy.motion.attack();
    this.takeDamage(enemy.definition.damage);
  }

  takeDamage(amount: number): void {
    if (this.run.phase !== 'playing' || this.timers.invulnerable > 0) return;
    if (import.meta.env.DEV && this.arena.developerTools?.invincible) return;
    // Guards and the stance shield absorb damage before the class multiplier applies.
    const outcome = damageKhan(this.run, mitigateKhanDamage(khanStatusOf(this.timers), amount));
    if (!outcome) return;
    this.playerMotion.hit();
    this.timers.invulnerable = GAME.invulnerability;
    if (effectAmount(this.visualSettings) > 0) this.cameras.main.shake(90, 0.003);
    this.audio.play(outcome === 'fallen' ? 'fall' : 'hit');
    this.effects.burst(this.player.x, this.player.y, 0xdd967c, 8);
    if (outcome === 'fallen') this.hideFallenKhan();
  }

  /** Disables the fallen Khan's body and attachments; the camera follows the camp. */
  hideFallenKhan(): void {
    this.player.setVelocity(0, 0).disableBody(true, true);
    this.upper?.setVisible(false);
    this.shadow.setVisible(false);
    this.aura.setVisible(false);
    this.timers.dashRemaining = 0;
    this.timers.classAction = undefined;
    this.timers.khanStatus = createKhanStatus();
    this.run.clan.momentum = 0;
    this.host.clearTouch();
    this.cameras.main.startFollow(this.camp, true, 0.09, 0.09).setFollowOffset(0, 0);
    this.arena.hud.refresh();
  }

  renderPlayerVisual(): void {
    this.playerMotion.setPlayerClass(this.run.character?.classId ?? 'mounted-archer');
    this.playerMotion.setPlayerGender(this.run.character?.gender ?? 'man');
    const tint = this.playerMotion.hurt
      ? 0xffd3b2
      : isKhanGuarded(khanStatusOf(this.timers))
        ? 0xcfd9ea
        : 0xffffff;
    this.player.setTint(tint);
    if (this.playerMotion.upperFrame && !this.upper) {
      this.upper = this.add
        .image(
          this.player.x,
          this.player.y,
          this.playerMotion.texture,
          this.playerMotion.upperFrame,
        )
        .setName('khan-upper')
        .setData('billboardLayer', 0.1);
    }
    if (this.upper) renderCharacterLayers(this.player, this.upper, this.playerMotion);
    else renderCharacter(this.player, this.playerMotion);
    this.upper?.setTint(tint);
  }

  /** Turns presentation toward an attack target without changing movement or targeting rules. */
  faceTarget(x: number, y: number): void {
    let dx = x - this.player.x;
    let dy = y - this.player.y;
    if (this.landscape.world3d) {
      const from = this.landscape.world3d.screenPoint(this.player);
      const to = this.landscape.world3d.screenPoint({ x, y });
      dx = to.x - from.x;
      dy = to.y - from.y;
    }
    this.playerMotion.face(dx, dy);
    if (this.playerMotion.directional) this.player.setFlipX(false);
    else if (Math.abs(dx) > 0.01) this.player.setFlipX(dx < 0);
  }

  /** Brings an active successor back at camp with fresh motion and return protection. */
  returnKhan(): void {
    if (!isKhanActive(this.run)) return;
    const x = this.camp.x;
    const bounds = this.landscape.playBounds;
    const y = Phaser.Math.Clamp(
      this.camp.y + GAME.khan.campOffset,
      bounds.y + 24,
      bounds.y + bounds.height - 24,
    );
    this.player.enableBody(true, x, y, true, true);
    this.player
      .setVelocity(0, 0)
      .setAlpha(1)
      .clearTint()
      .setFlipX(false)
      .setDepth(100 + y);
    this.playerMotion.reset('player', 0);
    this.playerMotion.setPlayerClass(this.run.character?.classId ?? 'mounted-archer');
    this.playerMotion.setPlayerGender(this.run.character?.gender ?? 'man');
    this.run.combat.previous = undefined;
    this.run.combat.heading = undefined;
    this.run.combat.rideSeconds = 0;
    this.run.combat.ready = false;
    this.renderPlayerVisual();
    this.shadow
      .setPosition(x + 9, y + 5)
      .setDepth(99 + y)
      .setVisible(true);
    this.aura.setPosition(x, y).setVisible(true);
    this.facing.set(1, 0);
    this.playerMotion.face(1, 0);
    this.timers.dashRemaining = this.timers.dashTimer = 0;
    this.timers.classAction = undefined;
    this.timers.attackTimer = this.dustTimer = 0;
    this.timers.khanStatus = createKhanStatus();
    this.timers.invulnerable = GAME.khan.returnProtection;
    this.host.clearTouch();
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09).setFollowOffset(0, 0);
    this.effects.burst(x, y, 0xf1c27b, 12);
    this.audio.play('succession');
    this.arena.hud.refresh();
  }

  /** Advances and draws the Khan's motion while he is active. */
  animate(dt: number, preparingVolley: boolean): void {
    if (isKhanActive(this.run)) {
      this.playerMotion.setPlayerClass(this.run.character?.classId ?? 'mounted-archer');
      this.playerMotion.setPlayerGender(this.run.character?.gender ?? 'man');
      this.playerMotion.advance(dt, this.player.body!.velocity.length(), preparingVolley);
      this.renderPlayerVisual();
    }
  }

  capture(): WorldArchive['player'] {
    return { ...captureBody(this.player), motion: this.playerMotion.capture() };
  }

  /** Restores the Khan's body, facing and motion; the caller hides a fallen Khan. */
  restore(world: WorldArchive): void {
    this.player.enableBody(true, world.player.x, world.player.y, true, true);
    this.player.setVelocity(world.player.vx, world.player.vy).setFlipX(world.player.flip);
    this.facing.set(world.facing.x, world.facing.y);
    this.playerMotion.restore(world.player.motion);
    this.faceTarget(this.player.x + this.facing.x, this.player.y + this.facing.y);
    this.renderPlayerVisual();
    this.player.setDepth(100 + this.player.y);
    this.shadow.setPosition(this.player.x + 9, this.player.y + 5).setDepth(99 + this.player.y);
    this.aura.setPosition(this.player.x, this.player.y);
  }
}
