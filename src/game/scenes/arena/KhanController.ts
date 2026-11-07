import Phaser from 'phaser';
import { effectAmount } from '../../../shared/visualSettings';
import { CharacterMotion } from '../../animation/CharacterMotion';
import { playerVisualConfig } from '../../assets/painterlyArt';
import { GAME } from '../../config';
import { classDefinition } from '../../data/classes';
import type { Enemy } from '../../entities/actors';
import { areaMovementMultiplier, type AreaThreatState } from '../../state/areaThreats';
import { gallopCooldown } from '../../state/campCombat';
import type { WorldArchive } from '../../state/expeditionArchive';
import { completeGuidance } from '../../state/guidance';
import { damageKhan, isKhanActive, khanSpeedMultiplier } from '../../state/khan';
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
  private dustTimer = 0;

  constructor(
    arena: ArenaContext,
    private readonly host: KhanHost,
  ) {
    super(arena);
  }

  reset(): void {
    this.playerMotion.reset('player');
    this.dustTimer = 0;
  }

  /** Creates the ground shadow and aura at the world centre. */
  createAttachments(): void {
    const center = GAME.worldSize / 2;
    this.shadow = this.add.image(center, center, 'shadow').setDisplaySize(64, 24).setAlpha(0.85);
    this.aura = this.add
      .circle(center, center, 24, 0x9bc9c3, 0.02)
      .setStrokeStyle(1, 0xe9dfaf, 0.45)
      .setScale(1, 0.5)
      .setDepth(2);
  }

  /** Moves the shadow and aura to the Khan's current position. */
  syncAttachments(): void {
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
    if (cls.id === 'spirit-caller') {
      // Spirit Ward (Tengri's Blessing): galloping restores Khan vitality and steadies clan resolve
      this.run.health = Math.min(this.run.stats.maxHealth, this.run.health + 8);
      this.run.clan.integrity = Math.min(GAME.clan.maxResolve, this.run.clan.integrity + 1.5);
    }
    this.effects.burst(this.player.x, this.player.y, cls.weapon.projectileTint, 7);
  }

  /** Rides along `movement` (the input intent, rotated here into world space). */
  move(dt: number, movement: Phaser.Math.Vector2): void {
    if (this.landscape.world3d) {
      const rotated = this.landscape.world3d.movement(movement.x, movement.y);
      movement.set(rotated.x, rotated.y);
    }
    const moving = movement.lengthSq() > 0.01;
    if (moving) {
      completeGuidance(this.run, 'ride');
      this.facing.copy(movement).normalize();
    }
    if (this.timers.dashRemaining > 0) movement.copy(this.facing).scale(GAME.dash.speed);
    else
      movement.scale(
        this.run.stats.speed *
          khanSpeedMultiplier(this.run) *
          areaMovementMultiplier(this.host.areaThreats, this.player),
      );
    this.player.setVelocity(movement.x, movement.y);
    const faceX = this.landscape.world3d?.screenX(this.facing.x, this.facing.y) ?? this.facing.x;
    if (Math.abs(faceX) > 0.01) this.player.setFlipX(faceX < 0);
    this.player.setAlpha(
      this.timers.invulnerable > 0 ? (Math.floor(this.run.elapsed * 20) % 2 ? 0.5 : 0.85) : 1,
    );
    this.player.setDepth(100 + this.player.y);
    this.shadow.setPosition(this.player.x + 9, this.player.y + 5).setDepth(99 + this.player.y);
    this.dustTimer -= dt;
    if (moving && effectAmount(this.visualSettings) > 0 && this.dustTimer <= 0) {
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
      this.timers.invulnerable > 0
    )
      return;
    enemy.motion.attack();
    this.takeDamage(enemy.definition.damage);
  }

  takeDamage(amount: number): void {
    if (this.run.phase !== 'playing' || this.timers.invulnerable > 0) return;
    if (import.meta.env.DEV && this.arena.developerTools?.invincible) return;
    const outcome = damageKhan(this.run, amount);
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
    this.shadow.setVisible(false);
    this.aura.setVisible(false);
    this.timers.dashRemaining = 0;
    this.run.clan.momentum = 0;
    this.host.clearTouch();
    this.cameras.main.startFollow(this.camp, true, 0.09, 0.09).setFollowOffset(0, 0);
    this.arena.hud.refresh();
  }

  renderPlayerVisual(): void {
    const visual = playerVisualConfig(this.run.character);
    const targetFrame = this.playerMotion.frame.replace(/^player-/, `${visual.framePrefix}-`);
    if (
      this.player.texture.key !== visual.textureKey &&
      this.arena.scene.textures.exists(visual.textureKey)
    ) {
      this.player.setTexture(visual.textureKey, targetFrame);
    } else if (this.player.frame.name !== targetFrame) {
      this.player.setFrame(targetFrame, false, false);
    }
    this.player.setTint(this.playerMotion.hurt ? 0xffd3b2 : visual.baseTint);
  }

  /** Brings an active successor back at camp with fresh motion and return protection. */
  returnKhan(): void {
    if (!isKhanActive(this.run)) return;
    const x = this.camp.x;
    const y = Phaser.Math.Clamp(this.camp.y + GAME.khan.campOffset, 24, GAME.worldSize - 24);
    this.player.enableBody(true, x, y, true, true);
    this.player
      .setVelocity(0, 0)
      .setAlpha(1)
      .clearTint()
      .setFlipX(false)
      .setDepth(100 + y);
    this.playerMotion.reset('player', 0);
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
    this.timers.dashRemaining = this.timers.dashTimer = 0;
    this.timers.attackTimer = this.dustTimer = 0;
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
      this.playerMotion.advance(
        dt,
        this.player.body!.velocity.length(),
        preparingVolley &&
          Boolean(
            this.spatial.nearest(
              this.player.x,
              this.player.y,
              GAME.projectile.range + this.run.clan.campEffects.bonuses.range,
            ),
          ),
      );
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
    this.renderPlayerVisual();
    this.player.setDepth(100 + this.player.y);
    this.shadow.setPosition(this.player.x + 9, this.player.y + 5).setDepth(99 + this.player.y);
    this.aura.setPosition(this.player.x, this.player.y);
  }
}
