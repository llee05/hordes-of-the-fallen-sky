import Phaser from 'phaser';
import { CharacterMotion } from '../../animation/CharacterMotion';
import { renderCharacter } from '../../animation/CharacterVisuals';
import { paintedImage } from '../../assets/painterlyArt';
import { GAME } from '../../config';
import type { Enemy } from '../../entities/actors';
import { hasDevelopment, riderCount } from '../../state/clan';
import type { WorldArchive } from '../../state/expeditionArchive';
import { isKhanActive } from '../../state/khan';
import { riderCooldowns } from '../../state/mountedCombat';
import type { TerrainNavigation } from '../../terrain/TerrainNavigation';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import type { CombatSystem } from './CombatSystem';

/** Riders the camp can field; slots past the clan's rider count stay hidden. */
const RIDER_SLOTS = 16;

/**
 * The clan's mounted riders: their fixed slots, formation movement, volleys,
 * animation, terrain reconciliation and saved positions. Created once;
 * `reset` and `createSlots` run in each `create`.
 */
export class RiderHost extends ArenaSystem {
  riders: Phaser.GameObjects.Image[] = [];
  private riderShadows: Phaser.GameObjects.Image[] = [];
  private riderMotions: CharacterMotion[] = [];
  private riderSpeeds: number[] = [];

  constructor(
    arena: ArenaContext,
    private readonly combat: CombatSystem,
  ) {
    super(arena);
  }

  reset(): void {
    this.riders = [];
    this.riderShadows = [];
    this.riderMotions = [];
    this.riderSpeeds = [];
  }

  /** Builds the hidden rider slots at the world centre. */
  createSlots(): void {
    const center = this.landscape.campPosition;
    for (let i = 0; i < RIDER_SLOTS; i += 1) {
      this.riders.push(
        paintedImage(this.arena.scene, center.x, center.y, 'rider').setVisible(false),
      );
      this.riderMotions.push(new CharacterMotion('rider', i * 0.137));
      this.riderSpeeds.push(0);
      this.riderShadows.push(
        this.add.image(center.x, center.y, 'shadow').setDisplaySize(48, 18).setVisible(false),
      );
    }
  }

  /** Moves visible riders toward their formation positions. */
  update(dt: number): void {
    const clan = this.run.clan;
    const count = riderCount(this.run);
    for (let i = 0; i < this.riders.length; i += 1) {
      const rider = this.riders[i]!;
      if (!rider.visible && i < count) this.riderMotions[i]!.reset('rider', i * 0.137);
      rider.setVisible(i < count);
      this.riderShadows[i]!.setVisible(i < count);
      if (i >= count) continue;
      const formation = isKhanActive(this.run) ? clan.formation : 'guard';
      const angle =
        (i / count) * Math.PI * 2 + (formation === 'encircle' ? this.run.elapsed * 0.65 : 0);
      const enemyGroup =
        formation === 'encircle'
          ? this.spatial.nearest(this.player.x, this.player.y, 280)
          : undefined;
      const anchor = formation === 'guard' ? this.camp : (enemyGroup ?? this.player);
      let x = anchor.x + Math.cos(angle) * (formation === 'retreat' ? 145 : 95);
      let y = anchor.y + Math.sin(angle) * 65;
      if (formation === 'wedge') {
        x =
          this.player.x -
          this.facing.x * (45 + Math.floor(i / 2) * 28) +
          this.facing.y * (i % 2 ? 26 : -26);
        y =
          this.player.y -
          this.facing.y * (45 + Math.floor(i / 2) * 28) -
          this.facing.x * (i % 2 ? 26 : -26);
      }
      const previousX = rider.x;
      const previousY = rider.y;
      const navigation = this.landscape.navigation;
      const desired =
        navigation && !navigation.lineClear(rider, { x, y }, 18)
          ? navigation.waypoint(rider, anchor)
          : { x, y };
      const next = {
        x: Phaser.Math.Linear(rider.x, desired.x, Math.min(1, dt * 5)),
        y: Phaser.Math.Linear(rider.y, desired.y, Math.min(1, dt * 5)),
      };
      const position = navigation?.slide(rider, next) ?? next;
      rider.setPosition(position.x, position.y);
      const dx = rider.x - previousX;
      const dy = rider.y - previousY;
      this.riderSpeeds[i] = dt > 0 ? Math.hypot(dx, dy) / dt : 0;
      const screenDx = this.landscape.world3d?.screenX(dx, dy) ?? dx;
      if (Math.abs(screenDx) > 0.1) rider.setFlipX(screenDx < 0);
      rider.setDepth(100 + rider.y);
      this.riderShadows[i]!.setPosition(rider.x + 7, rider.y + 4).setDepth(99 + rider.y);
    }
  }

  /** Each rider shoots its nearest visible enemy when its own cooldown allows. */
  fire(): void {
    const count = riderCount(this.run);
    const cooldowns = riderCooldowns(this.run.combat, count);
    for (let i = 0; i < count; i += 1) {
      const rider = this.riders[i]!;
      const range = GAME.projectile.range + this.run.clan.campEffects.bonuses.range;
      const clear = (e: Enemy) =>
        !this.landscape.navigation || this.landscape.navigation.lineClear(rider, e, 0);
      const riderTarget = this.spatial.nearest(rider.x, rider.y, range, clear);
      if (
        riderTarget &&
        cooldowns[i]! <= this.run.elapsed &&
        this.combat.shootVolley(
          rider.x,
          rider.y,
          riderTarget,
          1,
          (0.6 + (hasDevelopment(this.run, 'archery', 'veteran-riders') ? 0.3 : 0)) *
            this.run.clan.campEffects.multipliers.riderDamage,
        )
      ) {
        cooldowns[i] =
          this.run.elapsed +
          this.run.stats.attackInterval *
            this.run.clan.campEffects.multipliers.hostInterval *
            (this.run.clan.formation === 'retreat' && this.run.clan.momentum > 0.4 ? 0.7 : 1);
        this.riderMotions[i]!.attack();
        if (this.riderSpeeds[i]! < 2)
          rider.setFlipX(
            (this.landscape.world3d?.screenX(riderTarget.x - rider.x, riderTarget.y - rider.y) ??
              riderTarget.x - rider.x) < 0,
          );
      }
    }
  }

  /** Advances and draws each visible rider's motion. */
  animate(dt: number, preparingVolley: boolean): void {
    for (let i = 0; i < this.riders.length; i++) {
      const rider = this.riders[i]!;
      if (!rider.visible) continue;
      const motion = this.riderMotions[i]!;
      motion.advance(
        dt,
        this.riderSpeeds[i]!,
        preparingVolley &&
          Boolean(
            this.spatial.nearest(
              rider.x,
              rider.y,
              GAME.projectile.range + this.run.clan.campEffects.bonuses.range,
            ),
          ),
      );
      renderCharacter(rider, motion);
    }
  }

  /** Moves visible riders onto walkable ground after the terrain changes. */
  reconcile(navigation: TerrainNavigation): void {
    this.riders.forEach((rider, index) => {
      if (!rider.visible) return;
      const safe = navigation.nearestWalkable(rider);
      if (!safe) return;
      rider.setPosition(safe.x, safe.y).setDepth(100 + safe.y);
      this.riderShadows[index]!.setPosition(safe.x + 7, safe.y + 4).setDepth(99 + safe.y);
    });
  }

  capture(): WorldArchive['riders'] {
    return this.riders.map((r, i) => ({
      x: r.x,
      y: r.y,
      flip: r.flipX,
      motion: this.riderMotions[i]!.capture(),
    }));
  }

  restore(saved: WorldArchive['riders']): void {
    saved.forEach((r, i) => {
      this.riders[i]!.setPosition(r.x, r.y)
        .setFlipX(r.flip)
        .setVisible(i < riderCount(this.run))
        .setDepth(100 + r.y);
      this.riderShadows[i]!.setPosition(r.x + 7, r.y + 4)
        .setVisible(i < riderCount(this.run))
        .setDepth(99 + r.y);
      this.riderMotions[i]!.restore(r.motion);
      renderCharacter(this.riders[i]!, this.riderMotions[i]!);
    });
  }
}
