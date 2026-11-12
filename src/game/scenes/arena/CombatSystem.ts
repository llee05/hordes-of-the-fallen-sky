import Phaser from 'phaser';
import type { DefeatSprites } from '../../animation/CharacterVisuals';
import type { CharacterMotion } from '../../animation/CharacterMotion';
import type { CampBarrier } from '../../assets/CampBarrier';
import { effectAmount } from '../../../shared/visualSettings';
import { GAME } from '../../config';
import {
  classDefinition,
  khanBasicRange,
  khanHeavyRange,
  type ClassAbilityDefinition,
  type ClassAbilitySlot,
  type ClassBasicAttackDefinition,
} from '../../data/classes';
import { Enemy, Gem, Projectile } from '../../entities/actors';
import { campBoundary } from '../../state/campBarrier';
import { hasDevelopment } from '../../state/clan';
import type { ProjectileArchive, WorldArchive } from '../../state/expeditionArchive';
import { markExpedition } from '../../state/expeditionMetrics';
import { isKhanActive } from '../../state/khan';
import {
  createKhanStatus,
  isShredded,
  khanStatusOf,
  statusDamageMultiplier,
  tickKhanStatus,
} from '../../state/statusEffects';
import { aimedDirection, insideAttackArc, insideAttackLine } from '../../state/khanControls';
import { gainExperience } from '../../state/run';
import {
  addShield,
  applyStatusPayload,
  controlResistance,
  createKhanStatus,
  enemySize,
  guardKhan,
  isShredded,
  khanStatusOf,
  statusDamageMultiplier,
  tickKhanStatus,
  type StatusPayload,
} from '../../state/statusEffects';
import { khanVolleyFactors, volleyFactors } from '../../state/volley';
import type { EnemyDefinition } from '../../types';
import { projectileTerrainClear } from '../../world3d/projectileTerrain';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import { captureBody } from './bodyArchive';
import type { ClanDamage } from './ClanDamage';
import type { EnemyDirector } from './EnemyDirector';
import { SpiritCallerSystem, type SpiritProjectileSource } from './SpiritCallerSystem';
import { MountedArcherSystem, type MountedShotOptions } from './MountedArcherSystem';

/**
 * What a hostile shot reads from its shooter. Browser tests fire from plain
 * objects, so this stays narrower than `Enemy`.
 */
export type HostileShooter = Pick<Enemy, 'x' | 'y'> & {
  definition: Pick<EnemyDefinition, 'id' | 'title' | 'damage'>;
};

/** Scene parts combat uses that other systems own. */
export interface CombatHost {
  readonly playerMotion: CharacterMotion;
  readonly defeats: DefeatSprites;
  readonly campBarrier: CampBarrier;
  takeDamage(amount: number): void;
  hurtPlayer(enemy: Enemy): void;
  faceTarget(x: number, y: number): void;
}

/**
 * Khan volleys, every friendly and hostile projectile, hits and enemy damage,
 * defeat rewards, gem collection, the three physics overlaps, and the saved
 * projectiles. Method names and positional signatures match the scene's old
 * private methods, which browser tests still call through scene forwarders.
 */
export class CombatSystem extends ArenaSystem {
  private attackWindup?: {
    kind: 'light' | 'heavy';
    remaining: number;
    charge?: number;
    aimUsable: boolean;
  };
  private readonly spiritCaller: SpiritCallerSystem;
  /** Slashes landed in the current chain, and seconds left to land the next one. */
  private combo = { count: 0, remaining: 0 };
  private readonly mountedArcher: MountedArcherSystem;

  constructor(
    arena: ArenaContext,
    private readonly host: CombatHost,
    private readonly enemyDirector: EnemyDirector,
    private readonly clanDamage: ClanDamage,
  ) {
    super(arena);
    this.spiritCaller = new SpiritCallerSystem(arena, {
      damageEnemy: (enemy, amount) => this.damageEnemy(enemy, amount),
      shootSpiritVolley: (target, count, damage, range, width, source) =>
        this.shootVolley(
          this.player.x,
          this.player.y,
          target,
          count,
          damage,
          true,
          false,
          'khan',
          source === 'guardian' ? 1 : 2,
          true,
          undefined,
          range,
          width,
          source,
        ),
    });
    this.mountedArcher = new MountedArcherSystem(arena, {
      shoot: (x, y, target, count, damage, range, width, options) =>
        this.shootVolley(
          x,
          y,
          target,
          count,
          damage,
          false,
          false,
          'khan',
          undefined,
          false,
          options?.origin,
          range,
          width,
          undefined,
          options,
        ),
      damageEnemy: (enemy, amount) => this.damageEnemy(enemy, amount),
    });
  }

  /** Registers the shot, bolt and contact overlaps; call once per `create`. */
  registerOverlaps(): void {
    // Phaser reports the individual sprite first when overlapping it with a group.
    this.physics.add.overlap(this.player, this.hostileShots, (_player, shot) => {
      if (
        this.run.phase !== 'playing' ||
        !(shot as Projectile).active ||
        !this.projectileReaches(shot as Projectile)
      )
        return;
      if (this.spiritCaller.intercepts(shot as Projectile)) return;
      const damage = (shot as Projectile).damage;
      (shot as Projectile).disableBody(true, true);
      this.host.takeDamage(damage);
    });
    // Collision callbacks only deactivate bodies; Phaser retains pooled objects.
    this.physics.add.overlap(this.projectiles, this.enemies, (bolt, enemy) =>
      this.hitEnemy(bolt as Projectile, enemy as Enemy),
    );
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) =>
      this.host.hurtPlayer(enemy as Enemy),
    );
  }

  reset(): void {
    this.attackWindup = undefined;
    this.combo = { count: 0, remaining: 0 };
    this.timers.abilityCooldowns = { q: 0, w: 0, e: 0, r: 0 };
    this.mountedArcher.reset();
    this.spiritCaller.reset();
    this.timers.khanStatus = createKhanStatus();
  }

  /** Current slash number in the Khan's combo chain (0 when no chain is running). */
  comboCount(): number {
    return this.combo.count;
  }

  /** Advances manual Khan combat. No attack occurs unless a mouse button or trigger is held. */
  tickKhanCombat(
    dt: number,
    lightHeld: boolean,
    heavyHeld: boolean,
    aim: { x: number; y: number },
    aimUsable = true,
  ): void {
    if (this.run.phase !== 'playing') return;
    this.timers.attackTimer = Math.max(0, this.timers.attackTimer - dt);
    const cooldowns = this.cooldowns();
    for (const slot of Object.keys(cooldowns) as ClassAbilitySlot[])
      cooldowns[slot] = Math.max(0, cooldowns[slot] - dt);
    this.mountedArcher.tick(dt);
    this.spiritCaller.tick(dt);
    this.tickComboAndStance(dt);
    if (this.attackWindup) {
      const held = this.attackWindup.kind === 'light' ? lightHeld : heavyHeld;
      const cls = classDefinition(this.run.character?.classId);
      const heavyCharge = this.attackWindup.kind === 'heavy' ? cls.heavyAttack.charge : undefined;
      if (!isKhanActive(this.run)) {
        this.attackWindup = undefined;
        return;
      }
      if (heavyCharge) {
        if (!held) {
          const charge = this.attackWindup.charge ?? 0;
          const usable = this.attackWindup.aimUsable;
          this.attackWindup = undefined;
          if (charge >= cls.heavyAttack.windup) this.fireAttack('heavy', aim, charge, usable);
          return;
        }
        this.faceAim(aim, false);
        this.attackWindup.charge = Math.min(
          heavyCharge.maxDuration,
          (this.attackWindup.charge ?? 0) + dt,
        );
        if (heavyCharge.kind === 'projectile') {
          this.mountedArcher.showCharge(this.attackWindup.charge, cls.heavyAttack);
          return;
        }
        if (this.attackWindup.charge >= heavyCharge.maxDuration) {
          const charge = this.attackWindup.charge;
          this.attackWindup = undefined;
          this.fireAttack('heavy', aim, charge, aimUsable);
        }
        return;
      }
      if (!held) {
        this.attackWindup = undefined;
        return;
      }
      this.faceAim(aim, false);
      this.attackWindup.remaining = Math.max(0, this.attackWindup.remaining - dt);
      if (this.attackWindup.remaining <= 0) {
        const kind = this.attackWindup.kind;
        const usable = this.attackWindup.aimUsable;
        this.attackWindup = undefined;
        this.fireAttack(kind, aim, 0, usable);
      }
    } else if ((lightHeld || heavyHeld) && this.timers.attackTimer <= 0 && isKhanActive(this.run)) {
      const kind = heavyHeld ? 'heavy' : 'light';
      const cls = classDefinition(this.run.character?.classId);
      this.attackWindup = {
        kind,
        remaining: kind === 'heavy' ? cls.heavyAttack.windup : (cls.basicAttack.windup ?? 0.12),
        charge: kind === 'heavy' && cls.heavyAttack.charge ? 0 : undefined,
        aimUsable,
      };
      this.faceAim(aim, false);
    }
  }

  /** Counts down the combo window and the Khan's guards, and fires fortress sweeps. */
  private tickComboAndStance(dt: number): void {
    if (!isKhanActive(this.run)) {
      this.combo = { count: 0, remaining: 0 };
      this.timers.khanStatus = createKhanStatus();
      return;
    }
    if (this.combo.remaining > 0) {
      this.combo.remaining = Math.max(0, this.combo.remaining - dt);
      if (this.combo.remaining <= 0) this.combo.count = 0;
    }
    const status = khanStatusOf(this.timers);
    tickKhanStatus(status, dt);
    if (status.fortress <= 0) return;
    const fortress = classDefinition(this.run.character?.classId).abilities.find(
      (ability) => ability.kind === 'fortress',
    );
    if (fortress?.kind !== 'fortress') return;
    status.fortressTimer -= dt;
    if (status.fortressTimer > 0) return;
    status.fortressTimer += fortress.interval;
    const struck = this.strikePulse(fortress.range, fortress.damage, false, fortress.payload);
    addShield(status, struck * fortress.shield.perHit);
    this.effects.ring(this.player.x, this.player.y, fortress.range, 0xd8dee9);
  }

  isWindingUp(): boolean {
    return !!this.attackWindup;
  }

  fireBasic(aim: { x: number; y: number }): boolean {
    return this.fireAttack('light', aim, 0, true);
  }

  fireHeavy(aim: { x: number; y: number }, charge = 0): boolean {
    return this.fireAttack('heavy', aim, charge, true);
  }

  private fireAttack(
    kind: 'light' | 'heavy',
    aim: { x: number; y: number },
    charge = 0,
    aimUsable = true,
  ): boolean {
    if (this.run.phase !== 'playing' || !isKhanActive(this.run) || this.timers.attackTimer > 0)
      return false;
    const cls = classDefinition(this.run.character?.classId);
    const attack: ClassBasicAttackDefinition = kind === 'heavy' ? cls.heavyAttack : cls.basicAttack;
    const range = kind === 'heavy' ? khanHeavyRange(this.run) : khanBasicRange(this.run);
    const target =
      cls.id === 'mounted-archer' && kind === 'light' && !aimUsable
        ? (this.spatial.nearest(this.player.x, this.player.y, range) ?? aim)
        : aim;
    const direction = this.faceAim(target);
    if (
      kind === 'heavy' &&
      cls.id === 'spirit-caller' &&
      cls.heavyAttack.charge?.kind === 'waves'
    ) {
      const released = this.spiritCaller.releaseDrum(cls.heavyAttack, charge);
      this.timers.attackTimer =
        cls.heavyAttack.cooldown * this.run.clan.campEffects.multipliers.hostInterval;
      if (released) this.run.combat.volleys++;
      return released;
    }
    if (
      kind === 'heavy' &&
      cls.id === 'mounted-archer' &&
      cls.heavyAttack.charge?.kind === 'projectile'
    ) {
      const released = this.mountedArcher.releasePiercing(target, cls.heavyAttack, range, charge);
      this.timers.attackTimer =
        cls.heavyAttack.cooldown * this.run.clan.campEffects.multipliers.hostInterval;
      if (released) this.run.combat.volleys++;
      return released;
    }
    const extraProjectiles = Math.max(0, this.run.stats.projectiles - cls.stats.projectiles);
    const scaledDamage = attack.damage * (1 + extraProjectiles * 0.3);
    let released = false;
    if (attack.shape === 'projectile') {
      const count = attack.projectiles + extraProjectiles;
      released = this.shootVolley(
        this.player.x,
        this.player.y,
        target,
        count,
        attack.damage,
        false,
        false,
        'khan',
        undefined,
        false,
        undefined,
        range,
        attack.width,
        cls.id === 'spirit-caller' && kind === 'light' ? 'wisp' : undefined,
      );
    } else if (attack.shape === 'line') {
      released = this.strikeLine(direction, range, attack.width, scaledDamage);
    } else if (attack.shape === 'arc') {
      const combo = attack.combo;
      const comboScale = combo ? 1 + combo.damagePerStep * this.combo.count : 1;
      const struck = this.strikeArc(
        direction,
        range,
        attack.width,
        scaledDamage * comboScale,
        attack.payload,
      );
      released = true;
      if (attack.combo || attack.payload) {
        this.effects.sweep(
          this.player.x,
          this.player.y,
          direction,
          range,
          attack.width,
          kind === 'heavy' ? 0xe0bc76 : cls.weapon.projectileTint,
        );
        if (kind === 'heavy') this.effects.shake(110, 0.004);
      }
      if (combo && struck > 0) this.advanceCombo(combo, range);
    } else {
      this.strikePulse(range, scaledDamage, false);
      released = true;
    }
    this.timers.attackTimer =
      (kind === 'heavy' ? cls.heavyAttack.cooldown : this.run.stats.attackInterval) *
      this.run.clan.campEffects.multipliers.hostInterval;
    if (released) this.run.combat.volleys++;
    if (released && cls.id === 'mounted-archer' && kind === 'light')
      this.mountedArcher.recordBasic(target, attack, range);
    return released;
  }

  /** Counts a landed slash; the last slash of the chain finishes it with a heavier ring. */
  private advanceCombo(
    combo: NonNullable<ClassBasicAttackDefinition['combo']>,
    range: number,
  ): void {
    this.combo.count += 1;
    this.combo.remaining = combo.window;
    if (this.combo.count >= combo.steps) {
      this.combo = { count: 0, remaining: 0 };
      this.effects.ring(this.player.x, this.player.y, range, 0xe0bc76);
      this.effects.shake(90, 0.003);
    }
  }

  /** Compatibility hook for tests and developer tools: manually fires along current facing. */
  fire(): boolean {
    const cls = classDefinition(this.run.character?.classId);
    return this.fireBasic({
      x: this.player.x + this.facing.x * cls.basicAttack.range,
      y: this.player.y + this.facing.y * cls.basicAttack.range,
    });
  }

  useAbility(slot: ClassAbilitySlot, aim: { x: number; y: number }): boolean {
    if (this.run.phase !== 'playing' || !isKhanActive(this.run) || this.cooldowns()[slot] > 0)
      return false;
    const cls = classDefinition(this.run.character?.classId);
    const ability = cls.abilities.find((entry) => entry.slot === slot)!;
    this.attackWindup = undefined;
    const effect = ability;
    let released = true;
    if (
      cls.id === 'mounted-archer' &&
      ['parthian', 'rain', 'splinter', 'windstep'].includes(effect.kind)
    ) {
      released = this.mountedArcher.cast(effect, aim, this.movementDirection(aim));
      if (released) this.host.playerMotion.attack();
    } else if (effect.kind === 'volley') {
      this.faceAim(aim);
      released = this.shootVolley(
        this.player.x,
        this.player.y,
        aim,
        effect.projectiles,
        effect.damage,
        cls.id === 'spirit-caller',
        false,
        'khan',
        cls.id === 'spirit-caller' ? 1 : undefined,
        cls.id === 'spirit-caller',
        undefined,
        cls.stats.range + this.run.clan.campEffects.bonuses.range,
      );
    } else if (effect.kind === 'arc') {
      const direction = this.faceAim(aim);
      this.strikeArc(direction, effect.range, effect.angle, effect.damage);
    } else if (effect.kind === 'line') {
      const direction = this.faceAim(aim);
      this.strikeLine(direction, effect.range, effect.width, effect.damage, true);
    } else if (effect.kind === 'pulse') {
      this.strikePulse(effect.range, effect.damage, cls.id === 'spirit-caller');
    } else if (effect.kind === 'charge') {
      const direction = this.faceAim(aim);
      this.strikeLine(direction, effect.range, effect.width, effect.damage, true);
      this.run.combat.gallopSerial++;
      this.timers.dashRemaining = Math.max(this.timers.dashRemaining, GAME.dash.duration);
      this.timers.invulnerable = Math.max(this.timers.invulnerable, GAME.dash.duration);
    } else if (
      effect.kind === 'guardians' ||
      effect.kind === 'gust' ||
      effect.kind === 'ovoo' ||
      effect.kind === 'veil'
    ) {
      const direction = this.faceAim(aim);
      released = this.spiritCaller.cast(effect, direction);
    } else if (effect.kind === 'brace') {
      guardKhan(khanStatusOf(this.timers), {
        duration: effect.duration,
        reduction: effect.damageReduction,
        speedMultiplier: effect.speedMultiplier,
        unstoppable: true,
      });
      this.effects.ring(this.player.x, this.player.y, 80, 0xd8dee9, true);
      this.audio.play('barrier', this.player);
    } else if (effect.kind === 'shockwave') {
      this.strikePulse(effect.range, effect.damage, false, effect.payload);
      this.effects.ring(this.player.x, this.player.y, effect.range, 0xc9a26a);
      this.effects.shake(140, 0.006);
      this.effects.dust(this.player.x, this.player.y, this.facing.x, true);
    } else if (effect.kind === 'snare') {
      this.strikeSnare(effect);
      this.effects.ring(this.player.x, this.player.y, effect.range, 0x9fc3ff, true);
    } else if (effect.kind === 'fortress') {
      const status = khanStatusOf(this.timers);
      guardKhan(status, {
        duration: effect.duration,
        reduction: effect.damageReduction,
        speedMultiplier: effect.speedMultiplier,
        unstoppable: true,
      });
      status.fortress = effect.duration;
      // The first blow lands almost at once; later ones follow every `interval`.
      status.fortressTimer = 0.15;
      status.shieldMax = effect.shield.max;
      status.shieldPerSecond = effect.shield.perSecond;
      status.shield = Math.min(effect.shield.max, effect.shield.start);
      this.effects.ring(this.player.x, this.player.y, effect.range, 0xe0bc76);
      this.audio.play('barrier', this.player);
    } else if (effect.kind === 'guard') {
      this.run.health = Math.min(this.run.stats.maxHealth, this.run.health + effect.heal);
      this.timers.invulnerable = Math.max(this.timers.invulnerable, effect.duration);
    } else if (effect.kind === 'ward') {
      this.run.health = Math.min(this.run.stats.maxHealth, this.run.health + effect.heal);
      this.run.clan.integrity = Math.min(
        GAME.clan.maxResolve,
        this.run.clan.integrity + effect.resolve,
      );
      this.timers.invulnerable = Math.max(this.timers.invulnerable, effect.duration);
    }
    if (!released) return false;
    this.cooldowns()[slot] = ability.cooldown;
    this.effects.burst(this.player.x, this.player.y, cls.weapon.projectileTint, 7);
    if (['guard', 'ward', 'guardians', 'gust', 'ovoo', 'veil'].includes(effect.kind))
      this.audio.play('spell', this.player);
    markExpedition(this.run, 'fight');
    this.arena.hud.refresh();
    return true;
  }

  abilityStates(): (ClassAbilityDefinition & { remaining: number })[] {
    return classDefinition(this.run.character?.classId).abilities.map((ability) => ({
      ...ability,
      remaining: this.cooldowns()[ability.slot],
    }));
  }

  spiritStatus(): { energy: number; maximum: number; activeSpirits: number } | undefined {
    return this.spiritCaller.status();
  }

  private cooldowns(): Record<ClassAbilitySlot, number> {
    return (this.timers.abilityCooldowns ??= { q: 0, w: 0, e: 0, r: 0 });
  }

  private faceAim(aim: { x: number; y: number }, release = true): { x: number; y: number } {
    const direction = aimedDirection(this.player, aim, this.facing);
    this.facing.x = direction.x;
    this.facing.y = direction.y;
    this.host.faceTarget(aim.x, aim.y);
    if (release) this.host.playerMotion.attack();
    return direction;
  }

  /** Current ride direction, falling back to cursor aim while standing still. */
  private movementDirection(aim: { x: number; y: number }): { x: number; y: number } {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    return speed > 1
      ? { x: body.velocity.x / speed, y: body.velocity.y / speed }
      : aimedDirection(this.player, aim, this.facing);
  }

  private strikeLine(
    direction: { x: number; y: number },
    range: number,
    width: number,
    damageMultiplier: number,
    pin = false,
  ): boolean {
    let struck = false;
    this.spatial.forEachNearby(this.player.x, this.player.y, range + width / 2, (enemy) => {
      if (
        !insideAttackLine(this.player, direction, enemy, range, width) ||
        (this.landscape.navigation && !this.landscape.navigation.lineClear(this.player, enemy, 0))
      )
        return;
      if (pin) {
        enemy.pinned = Math.max(enemy.pinned, GAME.mounted.pinSeconds);
        enemy.setVelocity(0, 0);
      }
      this.damageEnemy(enemy, this.run.stats.damage * damageMultiplier);
      struck = true;
    });
    this.finishMeleeAttack(struck);
    return true;
  }

  /** Strikes every enemy inside the arc; returns how many were struck. */
  private strikeArc(
    direction: { x: number; y: number },
    range: number,
    angle: number,
    damageMultiplier: number,
    payload?: StatusPayload,
  ): number {
    let struck = 0;
    this.spatial.forEachNearby(this.player.x, this.player.y, range, (enemy) => {
      if (
        !insideAttackArc(this.player, direction, enemy, range, angle) ||
        (this.landscape.navigation && !this.landscape.navigation.lineClear(this.player, enemy, 0))
      )
        return;
      this.applyPayload(enemy, payload);
      this.damageEnemy(enemy, this.run.stats.damage * damageMultiplier);
      struck++;
    });
    this.finishMeleeAttack(struck > 0);
    return struck;
  }

  /** Strikes every enemy within `range` of the Khan; returns how many were struck. */
  private strikePulse(
    range: number,
    damageMultiplier: number,
    pin: boolean,
    payload?: StatusPayload,
  ): number {
    let struck = 0;
    this.spatial.forEachNearby(this.player.x, this.player.y, range, (enemy) => {
      if (this.landscape.navigation && !this.landscape.navigation.lineClear(this.player, enemy, 0))
        return;
      if (pin) {
        enemy.pinned = Math.max(enemy.pinned, GAME.mounted.pinSeconds);
        enemy.setVelocity(0, 0);
      }
      this.applyPayload(enemy, payload);
      this.damageEnemy(enemy, this.run.stats.damage * damageMultiplier);
      struck++;
    });
    this.finishMeleeAttack(struck > 0);
    return struck;
  }

  /** A circular sweep: small enemies get `small`, large ones and elites get `large`. */
  private strikeSnare(effect: Extract<ClassAbilityDefinition, { kind: 'snare' }>): number {
    let struck = 0;
    this.spatial.forEachNearby(this.player.x, this.player.y, effect.range, (enemy) => {
      if (this.landscape.navigation && !this.landscape.navigation.lineClear(this.player, enemy, 0))
        return;
      const large = enemySize(enemy.definition, enemy.elite) === 'large';
      this.applyPayload(enemy, large ? effect.large : effect.small);
      this.damageEnemy(enemy, this.run.stats.damage * effect.damage);
      struck++;
    });
    this.finishMeleeAttack(struck > 0);
    return struck;
  }

  /** Applies stun, slow, shred and forced movement; elites and large enemies resist control. */
  private applyPayload(enemy: Enemy, payload: StatusPayload | undefined): void {
    if (!payload || !enemy.active) return;
    applyStatusPayload(
      enemy.status,
      payload,
      enemy,
      this.player,
      controlResistance(enemy.definition, enemy.elite),
    );
    if (enemy.status.stun > 0 || enemy.status.forced > 0) enemy.setVelocity(0, 0);
  }

  private finishMeleeAttack(struck: boolean): void {
    const cls = classDefinition(this.run.character?.classId);
    this.effects.burst(this.player.x, this.player.y, cls.weapon.projectileTint, 5);
    this.audio.play(struck ? 'impact' : 'shoot', this.player);
    markExpedition(this.run, 'fight');
  }

  shootVolley(
    x: number,
    y: number,
    target: { x: number; y: number },
    count: number,
    damageOrMultiplier: number,
    ancestral = false,
    charged = false,
    owner: 'khan' | 'rider' | 'wagon' | 'wagon-ricochet' = 'rider',
    echoIndex?: number,
    ghost = false,
    origin?: Enemy,
    range?: number,
    collisionWidth?: number,
    spiritSource?: SpiritProjectileSource,
    mountedOptions?: MountedShotOptions,
  ): boolean {
    const cls = classDefinition(this.run.character?.classId);
    const volley =
      owner === 'wagon-ricochet'
        ? { tempest: false, count: 1, spacing: 0, damage: 1, speed: 1 }
        : (owner === 'khan' ? khanVolleyFactors : volleyFactors)(
            this.run,
            count +
              (owner === 'khan' && charged && cls.id === 'mounted-archer'
                ? GAME.classes['mounted-archer'].chargedExtraProjectiles
                : 0),
          );
    const direction = Math.atan2(target.y - y, target.x - x);
    const tempest = volley.tempest;
    const first = this.projectiles.get(x, y, 'bolt') as Projectile | null;
    if (!first) return false;
    const arrowCount = mountedOptions?.exactCount ? count : volley.count;
    const spacing = mountedOptions?.spread ?? volley.spacing;
    const chargedPierce = owner === 'khan' ? cls.weapon.chargedExtraPierce : 1;
    const basePierces = this.run.stats.pierce + (charged ? chargedPierce : 0);
    const baseSpeed = owner === 'khan' ? cls.stats.projectileSpeed : GAME.projectile.speed;
    for (let i = 0; i < arrowCount; i += 1) {
      const bolt = i === 0 ? first : (this.projectiles.get(x, y, 'bolt') as Projectile | null);
      if (!bolt) break;
      const angle = direction + (i - (arrowCount - 1) / 2) * spacing;
      bolt.enableBody(true, x, y, true, true);
      bolt.echoIndex = ancestral ? echoIndex : undefined;
      bolt.source =
        owner === 'khan' || owner === 'wagon' || owner === 'wagon-ricochet' ? owner : undefined;
      bolt.setData('terrain-previous', { x, y });
      const radius = (collisionWidth ?? 9) / 2;
      bolt
        .setTexture('bolt')
        .setScale(Math.min(1.6, Math.max(1, radius / 4.5)))
        .setDepth(9200)
        .setRotation(angle + Math.PI / 4)
        .setAlpha(1)
        .clearTint();
      bolt.setCircle(radius, bolt.width / 2 - radius, bolt.height / 2 - radius);
      bolt.fire = hasDevelopment(this.run, 'archery', 'fire-arrows');
      bolt.tempest = tempest;
      bolt.pierces = mountedOptions?.pierces ?? basePierces;
      bolt.pins = owner === 'khan' && charged && cls.weapon.pinsOnCharged;
      if (owner === 'khan' && cls.id !== 'mounted-archer') {
        bolt.setTint(cls.weapon.projectileTint);
      }
      if (charged) bolt.setTint(0xe2c586);
      bolt.hitTargets.clear();
      if (origin) bolt.hitTargets.set(origin, origin.spawnId);
      bolt.turn =
        owner === 'khan' && cls.weapon.homingTurnRate > 0
          ? 0
          : tempest
            ? (i % 2 ? 1 : -1) * 0.65
            : 0;
      if (bolt.fire) bolt.setTint(0xffa04e);
      if (ancestral) bolt.setTint(0x91ded6);
      bolt.damage =
        owner === 'wagon-ricochet'
          ? damageOrMultiplier
          : this.run.stats.damage *
            (charged
              ? owner === 'khan'
                ? cls.weapon.chargedDamage
                : GAME.mounted.chargedDamage
              : 1) *
            damageOrMultiplier *
            volley.damage;
      bolt.setData('base-damage', bolt.damage);
      bolt.setData('dealt-damage', 0);
      bolt.setData('precision', false);
      bolt.setData('ghost', ghost);
      bolt.setData('spirit-source', spiritSource);
      bolt.setData('mounted-kind', mountedOptions?.kind);
      bolt.remaining = range
        ? range / Math.max(1, baseSpeed * volley.speed)
        : GAME.projectile.lifetime;
      bolt.setVelocity(
        Math.cos(angle) * baseSpeed * volley.speed,
        Math.sin(angle) * baseSpeed * volley.speed,
      );
    }
    markExpedition(this.run, 'fight');
    this.audio.play('shoot', { x, y });
    return true;
  }

  fireHostile(enemy: HostileShooter, angle: number): Projectile | undefined {
    const shot = this.hostileShots.get(enemy.x, enemy.y, 'gem') as Projectile | null;
    if (!shot) return;
    shot.enableBody(true, enemy.x, enemy.y, true, true);
    if (this.run.phase === 'playing') markExpedition(this.run, 'fight');
    shot.source = enemy.definition.title ?? enemy.definition.id;
    shot.setData('terrain-previous', { x: enemy.x, y: enemy.y });
    shot
      .setTexture('gem')
      .setScale(1.1)
      .setDepth(9200)
      .setTint(0xb94948)
      .setAlpha(1)
      .setRotation(0);
    const radius = 5.4 / shot.scaleX;
    shot.setCircle(radius, shot.width / 2 - radius, shot.height / 2 - radius);
    shot.remaining = 5;
    shot.damage = enemy.definition.damage;
    shot.fire = false;
    shot.tempest = false;
    shot.turn = 0;
    shot.pierces = 0;
    shot.pins = false;
    shot.hitTargets.clear();
    shot.setVelocity(Math.cos(angle) * 125, Math.sin(angle) * 125);
    this.styleHostileProjectile(shot);
    this.audio.play('spell', enemy);
    return shot;
  }

  updateProjectiles(dt: number): void {
    const terrain = this.landscape.world3d?.terrain;
    if (terrain)
      for (const projectile of [
        ...this.projectiles.getChildren(),
        ...this.hostileShots.getChildren(),
      ] as Projectile[]) {
        if (!projectile.active) continue;
        const previous = projectile.getData('terrain-previous') as
          { x: number; y: number } | undefined;
        if (previous && !projectileTerrainClear(terrain, previous, projectile))
          projectile.disableBody(true, true);
        projectile.setData('terrain-previous', { x: projectile.x, y: projectile.y });
      }
    const boundary = campBoundary(this.run);
    for (const bolt of this.projectiles.getChildren() as Projectile[]) {
      if (!bolt.active) continue;
      bolt.remaining -= dt;
      const homing =
        bolt.source === 'khan'
          ? classDefinition(this.run.character?.classId).weapon.homingTurnRate
          : 0;
      if (homing > 0 || bolt.turn) {
        const body = bolt.body as Phaser.Physics.Arcade.Body;
        const speed = Math.hypot(body.velocity.x, body.velocity.y);
        let angle = Math.atan2(body.velocity.y, body.velocity.x);
        if (homing > 0) {
          const target = this.spatial.nearest(
            bolt.x,
            bolt.y,
            speed * Math.max(0, bolt.remaining),
            (enemy) =>
              bolt.hitTargets.get(enemy) !== enemy.spawnId &&
              (!this.landscape.navigation || this.landscape.navigation.lineClear(bolt, enemy, 0)),
          );
          if (target) {
            const desired = Math.atan2(target.y - bolt.y, target.x - bolt.x);
            const difference = Math.atan2(Math.sin(desired - angle), Math.cos(desired - angle));
            angle += Math.max(-homing * dt, Math.min(homing * dt, difference));
          }
        } else angle += bolt.turn * dt;
        bolt.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        bolt.setRotation(angle + Math.PI / 4);
      }
      if (bolt.remaining <= 0) bolt.disableBody(true, true);
    }
    for (const shot of this.hostileShots.getChildren() as Projectile[]) {
      if (!shot.active) continue;
      shot.remaining -= dt;
      if (shot.remaining <= 0) shot.disableBody(true, true);
      else if (
        Phaser.Math.Distance.Between(shot.x, shot.y, this.camp.x, this.camp.y) <= boundary.radius
      ) {
        this.clanDamage.damage(shot.damage * 0.5, 'attack', shot.source, shot);
        const impact = this.host.campBarrier.hit(this.camp, shot);
        this.audio.play('barrier', impact);
        this.effects.burst(impact.x, impact.y - 12, 0xc9a26a, 3);
        shot.disableBody(true, true);
      }
    }
  }

  hitEnemy(bolt: Projectile, enemy: Enemy): void {
    if (
      this.run.phase !== 'playing' ||
      !bolt.active ||
      !enemy.active ||
      !this.projectileReaches(bolt)
    )
      return;
    if (bolt.hitTargets.get(enemy) === enemy.spawnId) return;
    bolt.hitTargets.set(enemy, enemy.spawnId);
    const hitDamage = bolt.damage;
    this.mountedArcher.onProjectileHit(bolt, enemy);
    if (bolt.getData('spirit-source') === 'wisp') {
      if (this.spiritCaller.gainWispEnergy()) this.arena.hud.refresh();
    }

    if (bolt.pierces > 0) {
      bolt.pierces -= 1;
    } else bolt.disableBody(true, true);
    if (bolt.fire) enemy.burning = 2;
    if (bolt.pins) enemy.pinned = Math.max(enemy.pinned, GAME.mounted.pinSeconds);
    this.damageEnemy(enemy, hitDamage);
  }

  private projectileReaches(projectile: Projectile): boolean {
    const terrain = this.landscape.world3d?.terrain;
    const previous = projectile.getData('terrain-previous') as { x: number; y: number } | undefined;
    if (terrain && previous && !projectileTerrainClear(terrain, previous, projectile)) {
      projectile.disableBody(true, true);
      return false;
    }
    return true;
  }

  damageEnemy(enemy: Enemy, amount: number): number {
    if (!enemy.active) return 0;
    // Pinned and shredded enemies lose their armour reduction; shred also adds damage taken.
    const hasArmor =
      (enemy.definition.armor !== undefined || enemy.definition.id === 'brute') &&
      enemy.pinned <= 0 &&
      !isShredded(enemy.status);
    const baseArmor = hasArmor ? (enemy.definition.armor ?? GAME.tactics.heavyArmor) : 1;
    amount *= baseArmor * statusDamageMultiplier(enemy.status);
    const actual = Math.min(Math.max(0, enemy.health), Math.max(0, amount));
    if (amount >= 1) enemy.motion.hit();
    enemy.health -= amount;
    if (enemy.health > 0) {
      if (amount >= 1)
        this.audio.play(enemy.definition.texture === 'earth' ? 'stoneImpact' : 'impact', enemy);
      return actual;
    }
    const { x, y } = enemy;
    const value = enemy.definition.xp;
    if (effectAmount(this.visualSettings) > 0) this.host.defeats.show(enemy);
    enemy.disableBody(true, true);
    this.audio.play('defeat', { x, y });
    this.enemyDirector.shadows.get(enemy)?.setVisible(false);
    this.run.kills += 1;
    const objective = this.run.field.objective;
    if (
      objective?.status === 'available' &&
      objective.kind === 'gathering' &&
      enemy.objectiveId === objective.id
    )
      objective.defeated++;
    this.run.clan.spirit += value * 0.4 * this.run.clan.campEffects.multipliers.spiritGain;
    this.effects.burst(x, y, 0xa58aad, 5);
    const gem = this.gems.get(x, y, 'gem') as Gem | null;
    if (gem) {
      gem.enableBody(true, x, y, true, true);
      gem.setTexture('gem').setScale(0.85).setDepth(3).setVelocity(0, 0);
      gem.value = value;
      gem.secondary = false;
      gem.attracted = false;
    } else {
      // Preserve experience even if the gem pool is full.
      const active = this.gems.getFirstAlive() as Gem | null;
      if (active) active.value += value;
    }
    return actual;
  }

  collectGems(dt: number): void {
    if (!isKhanActive(this.run)) return;
    let experience = 0;
    for (const gem of this.gems.getChildren() as Gem[]) {
      if (!gem.active) continue;
      const distance = Phaser.Math.Distance.Between(gem.x, gem.y, this.player.x, this.player.y);
      const retreat = this.run.clan.formation === 'retreat' && this.run.clan.momentum > 0.4;
      if (distance < Math.max(this.run.stats.pickupRadius * (retreat ? 1.7 : 1), 0))
        gem.attracted = true;
      if (!gem.attracted) continue;
      if (distance < 18) {
        experience += gem.value;
        gem.disableBody(true, true);
      } else {
        const step = Math.min(1, dt * (6 + 140 / distance));
        gem.setPosition(
          Phaser.Math.Linear(gem.x, this.player.x, step),
          Phaser.Math.Linear(gem.y, this.player.y, step),
        );
      }
    }
    if (experience > 0) {
      this.audio.play('gem');
      if (gainExperience(this.run, experience)) {
        this.audio.play('level');
        this.run.clan.message = `Level ${this.run.level} reached.`;
        this.arena.hud.refresh();
      }
    }
  }

  /** Restyles live hostile shots after the projectile-contrast setting changes. */
  restyleHostileShots(): void {
    for (const shot of this.hostileShots.getChildren() as Projectile[])
      if (shot.active) this.styleHostileProjectile(shot);
  }

  /** Active friendly and hostile shots; hit records name enemies by pool slot. */
  captureShots(pool: Enemy[]): Pick<WorldArchive, 'projectiles' | 'hostileShots'> {
    const shots = (group: Phaser.Physics.Arcade.Group): ProjectileArchive[] =>
      (group.getChildren() as Projectile[])
        .filter((p) => p.active)
        .map((p) => ({
          ...captureBody(p),
          damage: p.damage,
          remaining: p.remaining,
          fire: p.fire,
          tempest: p.tempest,
          turn: p.turn,
          pierces: p.pierces,
          pins: p.pins,
          echoIndex: p.echoIndex,
          precision: p.getData('precision') as boolean | undefined,
          ghost: p.getData('ghost') as boolean | undefined,
          spiritSource: p.getData('spirit-source') as ProjectileArchive['spiritSource'],
          mountedKind: p.getData('mounted-kind') as ProjectileArchive['mountedKind'],
          baseDamage: p.getData('base-damage') as number | undefined,
          dealtDamage: p.getData('dealt-damage') as number | undefined,
          rotation: p.rotation,
          tint: p.tintTopLeft,
          previous: p.getData('terrain-previous') as { x: number; y: number } | undefined,
          source: p.source,
          hits: [...p.hitTargets].map(([enemy, spawnId]) => ({
            slot: pool.indexOf(enemy),
            spawnId,
          })),
        }));
    return { projectiles: shots(this.projectiles), hostileShots: shots(this.hostileShots) };
  }

  /** Restores saved shots; `pool` must already be the restored enemy pool. */
  restoreShots(world: WorldArchive, pool: Enemy[]): void {
    const restoreShots = (
      group: Phaser.Physics.Arcade.Group,
      shots: ProjectileArchive[],
      hostile: boolean,
    ): void => {
      for (const saved of shots) {
        const p = group.get(saved.x, saved.y, hostile ? 'gem' : 'bolt') as Projectile;
        p.enableBody(true, saved.x, saved.y, true, true);
        const { x: _x, y: _y, vx, vy, flip, rotation, tint, previous, hits, ...state } = saved;
        p.echoIndex = undefined;
        Object.assign(p, state);
        p.setData('precision', saved.precision);
        p.setData('ghost', saved.ghost);
        p.setData('spirit-source', saved.spiritSource);
        p.setData('mounted-kind', saved.mountedKind);
        p.setData('base-damage', saved.baseDamage);
        p.setData('dealt-damage', saved.dealtDamage);
        p.setScale(hostile ? 1.1 : 1)
          .setDepth(9200)
          .setRotation(rotation)
          .setTint(tint)
          .setAlpha(1)
          .setFlipX(flip)
          .setVelocity(vx, vy);
        const radius = hostile ? 5.4 / p.scaleX : 4.5;
        p.setCircle(radius, p.width / 2 - radius, p.height / 2 - radius);
        p.setData('terrain-previous', previous ?? { x: saved.x, y: saved.y });
        if (hostile) this.styleHostileProjectile(p);
        p.hitTargets.clear();
        for (const hit of hits) p.hitTargets.set(pool[hit.slot]!, hit.spawnId);
      }
    };
    restoreShots(this.projectiles, world.projectiles, false);
    restoreShots(this.hostileShots, world.hostileShots, true);
  }

  private styleHostileProjectile(shot: Projectile): void {
    const high = this.visualSettings.projectileContrast === 'high';
    shot
      .setScale(high ? 1.45 : 1.1)
      .setTint(high ? 0xffc36b : 0xb94948)
      .setDepth(9200);
    const radius = 5.4 / shot.scaleX;
    shot.setCircle(radius, shot.width / 2 - radius, shot.height / 2 - radius);
  }
}
