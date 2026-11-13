import Phaser from 'phaser';
import {
  classDefinition,
  type ClassAbilityDefinition,
  type ClassBasicAttackDefinition,
  type ClassHeavyAttackDefinition,
} from '../../data/classes';
import type { Enemy, Projectile } from '../../entities/actors';
import { isKhanActive } from '../../state/khan';
import { startKhanManeuver } from '../../state/khanManeuvers';
import {
  createMountedArcherCombatState,
  type MountedArcherCombatState,
} from '../../state/mountedArcher';
import { applyStatusPayload, enemySize } from '../../state/statusEffects';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';

export type MountedProjectileKind = 'piercing-full' | 'splinter' | 'fragment';

export interface MountedShotOptions {
  exactCount?: boolean;
  pierces?: number;
  kind?: MountedProjectileKind;
  spread?: number;
  /** Enemy already struck by a splitting projectile; fragments must not hit it again. */
  origin?: Enemy;
}

export interface MountedArcherHost {
  shoot(
    x: number,
    y: number,
    target: { x: number; y: number },
    count: number,
    damage: number,
    range: number,
    width: number,
    options?: MountedShotOptions,
  ): boolean;
  damageEnemy(enemy: Enemy, amount: number): number;
}

/** Delayed volleys, ground attacks and special projectile reactions for the mounted kit. */
export class MountedArcherSystem extends ArenaSystem {
  constructor(
    arena: ArenaContext,
    private readonly host: MountedArcherHost,
  ) {
    super(arena);
  }

  reset(): void {
    this.timers.mountedArcher = createMountedArcherCombatState();
  }

  showCharge(charge: number, attack: ClassHeavyAttackDefinition): void {
    const tuning = attack.charge;
    if (tuning?.kind !== 'projectile') return;
    this.effects.charge(
      this.player.x,
      this.player.y - 10,
      Math.min(1, charge / tuning.maxDuration),
      classDefinition('mounted-archer').weapon.projectileTint,
    );
  }

  recordBasic(
    target: { x: number; y: number },
    attack: ClassBasicAttackDefinition,
    range: number,
  ): void {
    const every = attack.doubleEvery ?? 0;
    const state = this.state();
    state.basicShots++;
    if (!every || state.basicShots % every !== 0) return;
    state.pendingShot = {
      delay: attack.doubleDelay ?? 0.1,
      x: target.x,
      y: target.y,
      damage: attack.damage,
      range,
      width: attack.width,
    };
  }

  releasePiercing(
    target: { x: number; y: number },
    attack: ClassHeavyAttackDefinition,
    range: number,
    charge: number,
  ): boolean {
    const tuning = attack.charge;
    if (tuning?.kind !== 'projectile') return false;
    const ratio = Math.max(0, Math.min(1, charge / tuning.maxDuration));
    const fullyCharged = ratio >= 0.999;
    const damage =
      Phaser.Math.Linear(tuning.minimumDamage, tuning.maximumDamage, ratio) +
      (fullyCharged ? tuning.fullChargeBonus : 0);
    const pierces = Math.round(
      Phaser.Math.Linear(tuning.minimumPierce, tuning.maximumPierce, ratio),
    );
    return this.host.shoot(this.player.x, this.player.y, target, 1, damage, range, attack.width, {
      exactCount: true,
      pierces,
      kind: fullyCharged ? 'piercing-full' : undefined,
    });
  }

  cast(
    ability: ClassAbilityDefinition,
    aim: { x: number; y: number },
    movement: { x: number; y: number },
  ): boolean {
    if (ability.kind === 'parthian') {
      const backward = { x: -movement.x, y: -movement.y };
      this.state().parthian = {
        shots: ability.shots,
        timer: 0,
        x: backward.x,
        y: backward.y,
      };
      startKhanManeuver(this.timers, ability.duration, ability.speedMultiplier);
      this.tickParthian(ability, 0);
    } else if (ability.kind === 'rain') {
      const target = this.clampedTarget(aim, ability.range);
      this.state().rain = {
        ...target,
        warning: ability.delay,
        remaining: ability.duration,
        tickTimer: 0,
        visualTimer: 0,
      };
      this.effects.telegraph(target.x, target.y, ability.radius, 0xd9c17d, 0);
    } else if (ability.kind === 'splinter') {
      return this.host.shoot(
        this.player.x,
        this.player.y,
        aim,
        1,
        ability.damage,
        ability.range,
        13,
        { exactCount: true, pierces: 0, kind: 'splinter' },
      );
    } else if (ability.kind === 'windstep') {
      this.state().windstep = { remaining: ability.duration, shotTimer: 0 };
      startKhanManeuver(this.timers, ability.duration, ability.speedMultiplier, movement);
      this.timers.invulnerable = Math.max(this.timers.invulnerable, ability.duration);
      this.facing.set(movement.x, movement.y);
    } else return false;
    return true;
  }

  tick(dt: number): void {
    const cls = classDefinition(this.run.character?.classId);
    if (cls.id !== 'mounted-archer') return;
    const state = this.state();
    if (!isKhanActive(this.run)) {
      this.timers.mountedArcher = createMountedArcherCombatState();
      delete this.timers.khanManeuver;
      return;
    }

    if (state.pendingShot) {
      state.pendingShot.delay -= dt;
      if (state.pendingShot.delay <= 0) {
        const shot = state.pendingShot;
        delete state.pendingShot;
        this.host.shoot(
          this.player.x,
          this.player.y,
          shot,
          1,
          shot.damage,
          shot.range,
          shot.width,
          { exactCount: true },
        );
      }
    }

    const parthian = cls.abilities.find((ability) => ability.kind === 'parthian');
    if (parthian?.kind === 'parthian') this.tickParthian(parthian, dt);
    const rain = cls.abilities.find((ability) => ability.kind === 'rain');
    if (rain?.kind === 'rain') this.tickRain(rain, dt);
    const windstep = cls.abilities.find((ability) => ability.kind === 'windstep');
    if (windstep?.kind === 'windstep') this.tickWindstep(windstep, dt);
  }

  onProjectileHit(bolt: Projectile, enemy: Enemy): void {
    const kind = bolt.getData('mounted-kind') as MountedProjectileKind | undefined;
    if (kind === 'piercing-full' && enemySize(enemy.definition, enemy.elite) === 'small') {
      const charge = classDefinition('mounted-archer').heavyAttack.charge;
      if (charge?.kind === 'projectile') {
        applyStatusPayload(enemy.status, { knockback: charge.knockback }, enemy, this.player);
        enemy.setVelocity(0, 0);
      }
    }
    if (kind !== 'splinter') return;
    bolt.setData('mounted-kind', undefined);
    const ability = classDefinition('mounted-archer').abilities.find(
      (entry) => entry.kind === 'splinter',
    );
    if (ability?.kind !== 'splinter') return;
    const body = bolt.body as Phaser.Physics.Arcade.Body;
    const length = Math.max(1, Math.hypot(body.velocity.x, body.velocity.y));
    const target = {
      x: enemy.x + (body.velocity.x / length) * ability.range,
      y: enemy.y + (body.velocity.y / length) * ability.range,
    };
    this.host.shoot(
      enemy.x,
      enemy.y,
      target,
      ability.fragments,
      ability.fragmentDamage,
      ability.range,
      8,
      {
        exactCount: true,
        pierces: ability.fragmentPierce,
        kind: 'fragment',
        spread: ability.fragmentSpread,
        origin: enemy,
      },
    );
    this.effects.burst(enemy.x, enemy.y, 0xe2c586, ability.fragments + 2);
  }

  private tickParthian(
    ability: Extract<ClassAbilityDefinition, { kind: 'parthian' }>,
    dt: number,
  ): void {
    const volley = this.state().parthian;
    if (!volley) return;
    volley.timer -= dt;
    while (volley.shots > 0 && volley.timer <= 0) {
      const target = {
        x: this.player.x + volley.x * ability.range,
        y: this.player.y + volley.y * ability.range,
      };
      if (
        !this.host.shoot(
          this.player.x,
          this.player.y,
          target,
          1,
          ability.damage,
          ability.range,
          9,
          { exactCount: true },
        )
      )
        break;
      volley.shots--;
      volley.timer += ability.shotEvery;
    }
    if (volley.shots <= 0) delete this.state().parthian;
  }

  private tickRain(ability: Extract<ClassAbilityDefinition, { kind: 'rain' }>, dt: number): void {
    const rain = this.state().rain;
    if (!rain) return;
    rain.visualTimer -= dt;
    if (rain.warning > 0) {
      rain.warning = Math.max(0, rain.warning - dt);
      if (rain.visualTimer <= 0) {
        const progress = 1 - rain.warning / ability.delay;
        this.effects.telegraph(rain.x, rain.y, ability.radius, 0xd9c17d, progress);
        rain.visualTimer = 0.12;
      }
      if (rain.warning > 0) return;
    }
    rain.remaining = Math.max(0, rain.remaining - dt);
    rain.tickTimer -= dt;
    while (rain.tickTimer <= 0 && rain.remaining > 0) {
      this.spatial.forEachNearby(rain.x, rain.y, ability.radius, (enemy) => {
        this.host.damageEnemy(enemy, this.run.stats.damage * ability.damage);
      });
      this.effects.ring(rain.x, rain.y, ability.radius, 0xe2c586);
      rain.tickTimer += ability.tickEvery;
    }
    if (rain.remaining <= 0) delete this.state().rain;
  }

  private tickWindstep(
    ability: Extract<ClassAbilityDefinition, { kind: 'windstep' }>,
    dt: number,
  ): void {
    const windstep = this.state().windstep;
    if (!windstep) return;
    windstep.remaining = Math.max(0, windstep.remaining - dt);
    windstep.shotTimer -= dt;
    while (windstep.shotTimer <= 0 && windstep.remaining > 0) {
      const target = this.spatial.nearest(this.player.x, this.player.y, ability.range);
      if (!target) break;
      if (
        !this.host.shoot(
          this.player.x,
          this.player.y,
          target,
          1,
          ability.damage,
          ability.range,
          9,
          { exactCount: true },
        )
      )
        break;
      windstep.shotTimer += ability.shotEvery;
    }
    if (windstep.remaining <= 0) delete this.state().windstep;
  }

  private clampedTarget(aim: { x: number; y: number }, range: number) {
    const dx = aim.x - this.player.x;
    const dy = aim.y - this.player.y;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance < 0.001)
      return { x: this.player.x, y: this.player.y };
    const scale = Math.min(1, range / distance);
    return { x: this.player.x + dx * scale, y: this.player.y + dy * scale };
  }

  private state(): MountedArcherCombatState {
    return (this.timers.mountedArcher ??= createMountedArcherCombatState());
  }
}
