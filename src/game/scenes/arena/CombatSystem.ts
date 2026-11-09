import Phaser from 'phaser';
import type { DefeatSprites } from '../../animation/CharacterVisuals';
import type { CharacterMotion } from '../../animation/CharacterMotion';
import type { CampBarrier } from '../../assets/CampBarrier';
import { effectAmount } from '../../../shared/visualSettings';
import { GAME } from '../../config';
import { classDefinition, khanTargetingRange } from '../../data/classes';
import { Enemy, Gem, Projectile } from '../../entities/actors';
import { campBoundary } from '../../state/campBarrier';
import { hasDevelopment } from '../../state/clan';
import type { ProjectileArchive, WorldArchive } from '../../state/expeditionArchive';
import { markExpedition } from '../../state/expeditionMetrics';
import { acceptCampBarrage, defeatSkybreaker } from '../../state/finalStand';
import { isKhanActive } from '../../state/khan';
import { retreatShot, spendMountedVolley } from '../../state/mountedCombat';
import { gainExperience } from '../../state/run';
import { khanVolleyFactors, volleyFactors } from '../../state/volley';
import type { EnemyDefinition } from '../../types';
import { projectileTerrainClear } from '../../world3d/projectileTerrain';
import type { ArenaContext } from './ArenaContext';
import { ArenaSystem } from './ArenaSystem';
import { captureBody } from './bodyArchive';
import type { ClanDamage } from './ClanDamage';
import type { EnemyDirector } from './EnemyDirector';

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
}

/**
 * Khan volleys, every friendly and hostile projectile, hits and enemy damage,
 * defeat rewards, gem collection, the three physics overlaps, and the saved
 * projectiles. Method names and positional signatures match the scene's old
 * private methods, which browser tests still call through scene forwarders.
 */
export class CombatSystem extends ArenaSystem {
  constructor(
    arena: ArenaContext,
    private readonly host: CombatHost,
    private readonly enemyDirector: EnemyDirector,
    private readonly clanDamage: ClanDamage,
  ) {
    super(arena);
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

  /** Counts down the Khan's attack timer and fires when it is due. */
  tickFire(dt: number): void {
    if (this.run.phase !== 'playing') return;
    this.tickCloseDefense(dt);
    this.timers.attackTimer -= dt;
    if (this.timers.attackTimer <= 0) this.fire();
  }

  private tickCloseDefense(dt: number): void {
    if (!isKhanActive(this.run)) return;
    this.timers.closeDefenseTimer = Math.max(0, (this.timers.closeDefenseTimer ?? 0) - dt);
    if (this.timers.closeDefenseTimer > 0) return;
    const cls = classDefinition(this.run.character?.classId);
    let struck = false;
    this.spatial.forEachNearby(
      this.player.x,
      this.player.y,
      cls.stats.closeDefenseRadius,
      (enemy) => {
        if (
          this.landscape.navigation &&
          !this.landscape.navigation.lineClear(this.player, enemy, 0)
        )
          return;
        if (cls.id === 'spirit-caller') {
          enemy.pinned = Math.max(enemy.pinned, GAME.mounted.pinSeconds);
          enemy.setVelocity(0, 0);
        }
        this.damageEnemy(enemy, this.run.stats.damage * cls.stats.closeDefenseDamage);
        struck = true;
      },
    );
    if (!struck) return;
    this.timers.closeDefenseTimer = cls.stats.closeDefenseInterval;
    this.host.playerMotion.attack();
    this.effects.burst(this.player.x, this.player.y, cls.weapon.projectileTint, 5);
    this.audio.play('impact', this.player);
    markExpedition(this.run, 'fight');
  }

  fire(): void {
    let hostFired = false;
    const momentum = this.run.clan.momentum;
    const target = this.spatial.nearest(
      this.player.x,
      this.player.y,
      khanTargetingRange(this.run) + momentum * 120,
      (e) => !this.landscape.navigation || this.landscape.navigation.lineClear(this.player, e, 0),
    );
    if (isKhanActive(this.run) && target) {
      this.host.playerMotion.attack();
      if (this.player.body!.velocity.lengthSq() < 4)
        this.player.setFlipX(
          (this.landscape.world3d?.screenX(target.x - this.player.x, target.y - this.player.y) ??
            target.x - this.player.x) < 0,
        );
      const charged = this.run.combat.ready;
      const cls = classDefinition(this.run.character?.classId);
      const retreat = retreatShot(this.run, this.player, this.camp, target, this.facing);
      const released = this.shootVolley(
        this.player.x,
        this.player.y,
        target,
        this.run.stats.projectiles,
        (1 + momentum * 0.3) * (retreat ? GAME.mounted.retreatDamage : 1),
        false,
        charged,
        'khan',
      );
      hostFired ||= released;
      if (released && charged && cls.id === 'spirit-caller') {
        // Summon Ancestor (Call Spirit): channels an ancestral spectral bolt alongside charged volleys
        this.shootVolley(
          this.player.x,
          this.player.y,
          target,
          1,
          0.85,
          true,
          true,
          'khan',
          1,
          true,
        );
      }
      if (released && charged) {
        spendMountedVolley(this.run);
        this.effects.burst(this.player.x, this.player.y, cls.weapon.projectileTint, 5);
      }
    }
    if (hostFired) this.run.combat.volleys++;
    this.timers.attackTimer =
      this.run.stats.attackInterval *
      this.run.clan.campEffects.multipliers.hostInterval *
      (this.run.clan.formation === 'retreat' && momentum > 0.4 ? 0.7 : 1);
  }

  shootVolley(
    x: number,
    y: number,
    target: Enemy,
    count: number,
    damageOrMultiplier: number,
    ancestral = false,
    charged = false,
    owner: 'khan' | 'rider' | 'wagon' | 'wagon-ricochet' = 'rider',
    echoIndex?: number,
    ghost = false,
    origin?: Enemy,
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
    const arrowCount = volley.count;
    const spacing = volley.spacing;
    const chargedPierce = owner === 'khan' ? cls.weapon.chargedExtraPierce : 1;
    const basePierces = this.run.stats.pierce + (charged ? chargedPierce : 0);
    const baseSpeed = owner === 'khan' ? cls.stats.projectileSpeed : GAME.projectile.speed;
    for (let i = 0; i < arrowCount; i += 1) {
      const bolt = i === 0 ? first : (this.projectiles.get(x, y, 'bolt') as Projectile | null);
      if (!bolt) break;
      const angle = direction + (i - (arrowCount - 1) / 2) * spacing;
      bolt.enableBody(true, x, y, true, true);
      bolt.barrage = undefined;
      bolt.echoIndex = ancestral ? echoIndex : undefined;
      bolt.source =
        owner === 'khan' || owner === 'wagon' || owner === 'wagon-ricochet' ? owner : undefined;
      bolt.setData('terrain-previous', { x, y });
      bolt
        .setTexture('bolt')
        .setScale(1)
        .setDepth(9200)
        .setRotation(angle + Math.PI / 4)
        .setAlpha(1)
        .clearTint();
      // Preserve the original 4.5-world-unit arrow radius at the new texture scale.
      bolt.setCircle(4.5, bolt.width / 2 - 4.5, bolt.height / 2 - 4.5);
      bolt.fire = hasDevelopment(this.run, 'archery', 'fire-arrows');
      bolt.tempest = tempest;
      bolt.pierces = basePierces;
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
      bolt.remaining = GAME.projectile.lifetime;
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
    shot.barrage = undefined;
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
        if (acceptCampBarrage(this.run, shot.barrage))
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
    if (enemy === this.enemyDirector.boss && this.run.finalStand?.phase === 'recovery')
      amount *= GAME.finalStand.vulnerableDamage;
    const hasArmor =
      (enemy.definition.armor !== undefined || enemy.definition.id === 'brute') &&
      enemy.pinned <= 0;
    const baseArmor = hasArmor ? (enemy.definition.armor ?? GAME.tactics.heavyArmor) : 1;
    amount *= baseArmor;
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
    if (enemy === this.enemyDirector.boss) defeatSkybreaker(this.run);
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
          baseDamage: p.getData('base-damage') as number | undefined,
          dealtDamage: p.getData('dealt-damage') as number | undefined,
          rotation: p.rotation,
          tint: p.tintTopLeft,
          previous: p.getData('terrain-previous') as { x: number; y: number } | undefined,
          barrage: p.barrage,
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
