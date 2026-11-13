import { GAME } from '../../config';
import {
  classDefinition,
  type ClassAbilityDefinition,
  type ClassHeavyAttackDefinition,
} from '../../data/classes';
import { Enemy, Projectile } from '../../entities/actors';
import { isKhanActive } from '../../state/khan';
import { insideAttackLine } from '../../state/khanControls';
import { markExpedition } from '../../state/expeditionMetrics';
import {
  activeSpiritCount,
  createSpiritCallerCombatState,
  gainSpiritualEnergy,
  type SpiritCallerCombatState,
} from '../../state/spiritCaller';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';

export type SpiritProjectileSource = 'wisp' | 'guardian' | 'veil';

export interface SpiritCallerHost {
  damageEnemy(enemy: Enemy, amount: number): number;
  shootSpiritVolley(
    target: { x: number; y: number },
    count: number,
    damage: number,
    range: number,
    width: number,
    source: Exclude<SpiritProjectileSource, 'wisp'>,
  ): boolean;
}

/** Spirit Caller resource, summons, charged waves and class-specific abilities. */
export class SpiritCallerSystem extends ArenaSystem {
  constructor(
    arena: ArenaContext,
    private readonly host: SpiritCallerHost,
  ) {
    super(arena);
  }

  reset(): void {
    this.timers.spiritCaller = createSpiritCallerCombatState();
  }

  status(): { energy: number; maximum: number; activeSpirits: number } | undefined {
    const cls = classDefinition(this.run.character?.classId);
    if (cls.id !== 'spirit-caller') return;
    const veil = cls.abilities.find((ability) => ability.kind === 'veil')!;
    const state = this.state();
    return {
      energy: state.energy,
      maximum: GAME.classes['spirit-caller'].spirit.maxEnergy,
      activeSpirits: activeSpiritCount(state, veil.spiritMultiplier, veil.spectralCopies),
    };
  }

  gainWispEnergy(): boolean {
    if (!isKhanActive(this.run)) return false;
    const tuning = GAME.classes['spirit-caller'].spirit;
    return gainSpiritualEnergy(this.state(), tuning.energyPerWispHit, tuning.maxEnergy) > 0;
  }

  releaseDrum(attack: ClassHeavyAttackDefinition, charge: number): boolean {
    const tuning = attack.charge;
    if (!tuning || tuning.kind !== 'waves') return false;
    const held = Math.max(attack.windup, Math.min(tuning.maxDuration, charge));
    const waves = Math.min(
      tuning.maxWaves,
      1 + Math.floor((held - attack.windup) / tuning.waveEvery),
    );
    this.state().drumWaves = Array.from({ length: waves }, (_, index) => ({
      delay: index * tuning.waveDelay,
      range: attack.range + index * tuning.rangeStep,
      damage: attack.damage * (1 - index * 0.1),
      slowDuration: tuning.slowDuration,
    }));
    this.audio.play('spell', this.player);
    markExpedition(this.run, 'fight');
    return true;
  }

  cast(effect: ClassAbilityDefinition, direction: { x: number; y: number }): boolean {
    if (effect.kind === 'guardians') {
      this.state().guardians = {
        remaining: effect.duration,
        attackTimer: 0,
        count: effect.count,
        intercepts: effect.intercepts,
      };
      this.effects.classAttack('spirit-caller:ongod-guardians', {
        x: this.player.x,
        y: this.player.y,
        radius: 32,
      });
    } else if (effect.kind === 'gust') {
      this.strikeWind(direction, effect);
    } else if (effect.kind === 'ovoo') {
      this.state().ovoo = {
        x: this.player.x,
        y: this.player.y,
        remaining: effect.duration,
        pulseTimer: 0,
      };
      this.effects.ring(this.player.x, this.player.y, effect.range, 0x72e0d1);
      this.effects.classAttack('spirit-caller:sacred-ovoo', {
        x: this.player.x,
        y: this.player.y,
        radius: effect.range,
      });
    } else if (effect.kind === 'veil') {
      const state = this.state();
      state.veilRemaining = effect.duration + state.energy * effect.energyDuration;
      state.energy = 0;
      state.echoTimer = 0;
      this.effects.classAttack('spirit-caller:veil-between-worlds', {
        x: this.player.x,
        y: this.player.y,
        radius: 38,
      });
    } else return false;
    return true;
  }

  tick(dt: number): void {
    const cls = classDefinition(this.run.character?.classId);
    if (cls.id !== 'spirit-caller') return;
    const state = this.state();
    if (!isKhanActive(this.run)) {
      delete state.guardians;
      delete state.ovoo;
      state.veilRemaining = 0;
      state.echoTimer = 0;
      state.drumWaves = [];
      return;
    }

    for (const wave of state.drumWaves) wave.delay -= dt;
    const readyWaves = state.drumWaves.filter((wave) => wave.delay <= 0);
    state.drumWaves = state.drumWaves.filter((wave) => wave.delay > 0);
    for (const wave of readyWaves) this.strikePulse(wave.range, wave.damage, wave.slowDuration);

    const ovoo = cls.abilities.find((ability) => ability.kind === 'ovoo');
    if (state.ovoo && ovoo?.kind === 'ovoo') {
      state.ovoo.remaining = Math.max(0, state.ovoo.remaining - dt);
      state.ovoo.pulseTimer -= dt;
      if (state.ovoo.remaining <= 0) delete state.ovoo;
      else {
        this.spatial.forEachNearby(state.ovoo.x, state.ovoo.y, ovoo.range, (enemy) => {
          enemy.spiritSlow = Math.max(enemy.spiritSlow, ovoo.slowDuration);
        });
        if (state.ovoo.pulseTimer <= 0) {
          state.ovoo.pulseTimer = 0.8;
          this.effects.ring(state.ovoo.x, state.ovoo.y, ovoo.range, 0x72e0d1);
          this.effects.classAttack('spirit-caller:sacred-ovoo', {
            x: state.ovoo.x,
            y: state.ovoo.y,
            radius: ovoo.range,
          });
        }
      }
    }

    const guardians = cls.abilities.find((ability) => ability.kind === 'guardians');
    if (state.guardians && guardians?.kind === 'guardians') {
      state.guardians.remaining = Math.max(0, state.guardians.remaining - dt);
      if (state.guardians.remaining <= 0) delete state.guardians;
      else {
        this.interceptNearbyShots(guardians.interceptRange);
        state.guardians.attackTimer -= dt;
        if (state.guardians.attackTimer <= 0) {
          const target = this.spatial.nearest(this.player.x, this.player.y, guardians.range);
          if (target) {
            const veil = cls.abilities.find((ability) => ability.kind === 'veil');
            const multiplier =
              state.veilRemaining > 0 && veil?.kind === 'veil' ? veil.spiritMultiplier : 1;
            const empowerment = this.empoweringOvoo(state, ovoo);
            this.host.shootSpiritVolley(
              target,
              state.guardians.count * multiplier,
              guardians.damage * (empowerment?.spiritDamage ?? 1),
              guardians.range,
              12,
              'guardian',
            );
            for (let index = 0; index < state.guardians.count * multiplier; index++) {
              const angle = (index / (state.guardians.count * multiplier)) * Math.PI * 2;
              this.effects.burst(
                this.player.x + Math.cos(angle) * 26,
                this.player.y + Math.sin(angle) * 18,
                0x72e0d1,
                2,
              );
            }
            this.effects.classAttack('spirit-caller:ongod-guardians', {
              x: this.player.x,
              y: this.player.y,
              direction: {
                x: target.x - this.player.x,
                y: target.y - this.player.y,
              },
              radius: 32,
            });
            state.guardians.attackTimer = guardians.attackEvery * (empowerment?.spiritRate ?? 1);
          } else state.guardians.attackTimer = 0.15;
        }
      }
    }

    const veil = cls.abilities.find((ability) => ability.kind === 'veil');
    state.veilRemaining = Math.max(0, state.veilRemaining - dt);
    if (state.veilRemaining > 0 && veil?.kind === 'veil') {
      state.echoTimer -= dt;
      if (state.echoTimer <= 0) {
        const target = this.spatial.nearest(this.player.x, this.player.y, cls.stats.range);
        if (target) {
          const empowerment = this.empoweringOvoo(state, ovoo);
          this.host.shootSpiritVolley(
            target,
            veil.spectralCopies,
            veil.echoDamage * (empowerment?.spiritDamage ?? 1),
            cls.stats.range,
            13,
            'veil',
          );
          this.effects.classAttack('spirit-caller:veil-between-worlds', {
            x: this.player.x,
            y: this.player.y,
            direction: {
              x: target.x - this.player.x,
              y: target.y - this.player.y,
            },
            radius: 38,
          });
          state.echoTimer = veil.echoEvery;
        } else state.echoTimer = 0.15;
      }
    }
  }

  intercepts(shot: Projectile): boolean {
    if (!isKhanActive(this.run)) return false;
    const guardians = this.state().guardians;
    if (!guardians?.remaining || guardians.intercepts <= 0) return false;
    guardians.intercepts--;
    shot.disableBody(true, true);
    this.effects.burst(shot.x, shot.y, 0x72e0d1, 4);
    return true;
  }

  private state(): SpiritCallerCombatState {
    return (this.timers.spiritCaller ??= createSpiritCallerCombatState());
  }

  private empoweringOvoo(
    state: SpiritCallerCombatState,
    ovoo: ClassAbilityDefinition | undefined,
  ): Extract<ClassAbilityDefinition, { kind: 'ovoo' }> | undefined {
    if (
      state.ovoo &&
      ovoo?.kind === 'ovoo' &&
      Math.hypot(this.player.x - state.ovoo.x, this.player.y - state.ovoo.y) <= ovoo.range
    )
      return ovoo;
  }

  private interceptNearbyShots(range: number): void {
    const guardians = this.state().guardians;
    if (!guardians?.intercepts) return;
    for (const shot of this.hostileShots.getChildren() as Projectile[]) {
      if (!shot.active || guardians.intercepts <= 0) continue;
      if (Math.hypot(shot.x - this.player.x, shot.y - this.player.y) <= range)
        this.intercepts(shot);
    }
  }

  private strikePulse(range: number, damage: number, slowDuration: number): void {
    this.spatial.forEachNearby(this.player.x, this.player.y, range, (enemy) => {
      if (this.landscape.navigation && !this.landscape.navigation.lineClear(this.player, enemy, 0))
        return;
      enemy.spiritSlow = Math.max(enemy.spiritSlow, slowDuration);
      this.host.damageEnemy(enemy, this.run.stats.damage * damage);
    });
    this.effects.ring(this.player.x, this.player.y, range, 0x72e0d1);
    this.effects.classAttack('spirit-caller:ancestral-drum', {
      x: this.player.x,
      y: this.player.y,
      radius: range,
    });
    this.audio.play('spell', this.player);
  }

  private strikeWind(
    direction: { x: number; y: number },
    effect: Extract<ClassAbilityDefinition, { kind: 'gust' }>,
  ): void {
    this.spatial.forEachNearby(
      this.player.x,
      this.player.y,
      effect.range + effect.width / 2,
      (enemy) => {
        if (!insideAttackLine(this.player, direction, enemy, effect.range, effect.width)) return;
        this.host.damageEnemy(enemy, this.run.stats.damage * effect.damage);
        const destination = {
          x: enemy.x + direction.x * effect.push,
          y: enemy.y + direction.y * effect.push,
        };
        const safe = this.landscape.navigation?.nearestWalkable(destination) ?? destination;
        enemy.setPosition(safe.x, safe.y);
        enemy.body?.updateFromGameObject();
      },
    );
    this.effects.burst(
      this.player.x + direction.x * effect.range * 0.5,
      this.player.y + direction.y * effect.range * 0.5,
      0x72e0d1,
      12,
    );
    this.effects.classAttack('spirit-caller:wind-of-tengri', {
      x: this.player.x,
      y: this.player.y,
      direction,
      range: effect.range,
    });
  }
}
