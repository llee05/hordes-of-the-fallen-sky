import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('../support/mockPhaser')).mockPhaser());

import { CHARACTER_CLASSES } from '../../src/shared/characterProfile';
import { createDeveloperClassRun } from '../../src/game/dev/levels';
import { ALL_ENEMIES } from '../../src/game/data/enemies';
import { CombatSystem } from '../../src/game/scenes/arena/CombatSystem';
import { EnemyDirector } from '../../src/game/scenes/arena/EnemyDirector';
import {
  EnemyBehaviour,
  type EnemyBehaviourHost,
} from '../../src/game/scenes/arena/EnemyBehaviour';
import { SpatialHash } from '../../src/game/systems/SpatialHash';
import type { Enemy } from '../../src/game/entities/actors';
import { createFakeArena } from '../support/fakeArena';

function setup(classId: string) {
  const arena = createFakeArena({ run: createDeveloperClassRun(classId)! });
  Object.assign(arena.context, { spatial: new SpatialHash<Enemy>() });
  const director = new EnemyDirector(arena.context, arena.enemyDirectorHost);
  const combat = new CombatSystem(arena.context, arena.host, director, arena.clanDamage);
  const spawn = (dx: number, dy: number, armor = 1) => {
    const enemy = arena.enemies.create();
    director.initialize(enemy, { ...ALL_ENEMIES[0]!, health: 10000, armor }, 1000 + dx, 1000 + dy);
    arena.context.spatial.rebuild(arena.enemies.getChildren());
    return enemy;
  };
  return { ...arena, combat, director, spawn };
}

describe('playable class combat', () => {
  it.each([1, 2])('adds a charged archer fan to %s base projectiles', (baseCount) => {
    const arena = setup('mounted-archer');
    arena.spawn(300, 0);
    arena.context.run.stats.projectiles = baseCount;
    arena.context.run.combat.ready = true;
    arena.combat.fire();
    const arrows = arena.projectiles.getChildren().filter((arrow) => arrow.active);
    expect(arrows).toHaveLength(baseCount + 2);
    expect(arrows[0]!.body!.velocity.y).toBeLessThan(0);
    expect(arrows.at(-1)!.body!.velocity.y).toBeGreaterThan(0);
    expect(arena.context.run.combat.ready).toBe(false);
    expect(arena.context.run.combat.volleys).toBe(1);
    for (const arrow of arrows) arrow.disableBody(true, true);
    arena.combat.fire();
    expect(arena.projectiles.countActive()).toBe(baseCount);
  });

  it('keeps charged support volleys at their requested count', () => {
    const arena = setup('mounted-archer');
    const target = arena.spawn(300, 0);
    arena.combat.shootVolley(1000, 1000, target, 1, 1, false, true, 'rider');
    expect(arena.projectiles.countActive()).toBe(1);
  });

  it.each(CHARACTER_CLASSES)(
    '%s applies its gallop effect once per enemy per gallop',
    (classId) => {
      const arena = setup(classId);
      Object.assign(arena.context.landscape, { navigation: undefined });
      Object.assign(arena.context.camp, { x: 4000, y: 4000 });
      Object.assign(arena.context.scene.physics, {
        moveTo: (enemy: Enemy) => enemy.setVelocity(10, 0),
      });
      const warnings = { clear: () => warnings };
      const behaviour = new EnemyBehaviour(
        arena.context,
        { fieldMarkers: { warnings } } as unknown as EnemyBehaviourHost,
        arena.combat,
        arena.director,
        arena.clanDamage,
      );
      const enemies = [
        [40, 0],
        [-40, 0],
        [0, 40],
        [0, -40],
      ].map(([x, y]) => arena.spawn(x!, y!));
      const outside = arena.spawn(100, 0);
      arena.context.timers.dashRemaining = 0.4;
      arena.context.run.combat.gallopSerial = 1;
      behaviour.update(0.01);
      const pinning = classId === 'lancer' || classId === 'iron-pagoda';
      for (const enemy of enemies) {
        expect(enemy.pinned).toBe(pinning ? 0.65 : 0);
        expect(enemy.lastGallop).toBe(1);
        expect(Math.hypot(enemy.x - 1000, enemy.y - 1000)).toBeCloseTo(88);
        if (pinning) expect(enemy.body!.velocity.lengthSq()).toBe(0);
        enemy.setPosition(1040, 1000);
      }
      expect(outside.pinned).toBe(0);
      behaviour.update(0.1);
      for (const enemy of enemies) {
        expect(enemy.pinned).toBeCloseTo(pinning ? 0.55 : 0);
        expect(enemy.x).toBe(1040);
      }
      arena.context.run.combat.gallopSerial++;
      behaviour.update(0.1);
      for (const enemy of enemies) expect(enemy.pinned).toBe(pinning ? 0.65 : 0);
      for (const enemy of enemies) enemy.setPosition(1040, 1000);
      arena.context.timers.dashRemaining = 0;
      arena.context.run.combat.gallopSerial++;
      behaviour.update(0.1);
      for (const enemy of enemies) {
        expect(enemy.lastGallop).toBe(2);
        expect(enemy.x).toBe(1040);
      }
      arena.context.run.health = 0;
      arena.context.run.khan.successionRemaining = 5;
      arena.context.timers.dashRemaining = 0.4;
      behaviour.update(0.1);
      for (const enemy of enemies) expect(enemy.lastGallop).toBe(2);
    },
  );

  it.each([
    [300, 0],
    [-300, 0],
    [0, 300],
    [0, -300],
  ])('steers both spirit bolts toward a target at (%s, %s)', (dx, dy) => {
    const arena = setup('spirit-caller');
    const target = arena.spawn(dx!, dy!);
    arena.combat.shootVolley(1000, 1000, target, 2, 1, false, false, 'khan');
    const bolts = arena.projectiles.getChildren();
    const speeds = bolts.map((bolt) => Math.hypot(bolt.body!.velocity.x, bolt.body!.velocity.y));
    arena.combat.updateProjectiles(0.01);
    for (const [i, bolt] of bolts.entries()) {
      const angle = Math.atan2(bolt.body!.velocity.y, bolt.body!.velocity.x);
      const desired = Math.atan2(dy!, dx!);
      const error = Math.abs(Math.atan2(Math.sin(angle - desired), Math.cos(angle - desired)));
      expect(error).toBeCloseTo(0.09 - 0.022);
      expect(Math.hypot(bolt.body!.velocity.x, bolt.body!.velocity.y)).toBeCloseTo(speeds[i]!);
    }
    arena.combat.updateProjectiles(0.1);
    for (const bolt of bolts) {
      expect(bolt.body!.velocity.x).toBeCloseTo(Math.cos(Math.atan2(dy!, dx!)) * speeds[0]!);
      expect(bolt.body!.velocity.y).toBeCloseTo(Math.sin(Math.atan2(dy!, dx!)) * speeds[0]!);
    }
    target.disableBody(true, true);
    const replacement = arena.spawn(-dy!, dx!);
    arena.combat.updateProjectiles(0.01);
    for (const bolt of bolts) {
      const cross =
        bolt.body!.velocity.x * (replacement.y - bolt.y) -
        bolt.body!.velocity.y * (replacement.x - bolt.x);
      expect(cross).toBeGreaterThan(0);
    }
  });

  it.each(['lancer', 'iron-pagoda', 'spirit-caller'])(
    '%s charged hits pin before resolving armor and reset on pool reuse',
    (classId) => {
      const arena = setup(classId);
      const enemy = arena.spawn(200, 0, 0.5);
      arena.combat.shootVolley(1000, 1000, enemy, 1, 1, false, true, 'khan');
      const bolt = arena.projectiles.getFirstAlive()!;
      const damage = bolt.damage;
      arena.combat.hitEnemy(bolt, enemy);
      expect(enemy.pinned).toBe(0.65);
      expect(enemy.health).toBeCloseTo(10000 - damage);
      arena.combat.hitEnemy(bolt, enemy);
      expect(enemy.health).toBeCloseTo(10000 - damage);
      for (const shot of arena.projectiles.getChildren()) shot.disableBody(true, true);
      arena.combat.shootVolley(1000, 1000, enemy, 1, 1, false, false, 'khan');
      expect(arena.projectiles.getFirstAlive()!.pins).toBe(false);
    },
  );

  it.each([
    ['mounted-archer', 96, 1.4, 0.75],
    ['lancer', 112, 1.25, 0.9],
    ['iron-pagoda', 128, 1.35, 0.85],
    ['spirit-caller', 118, 1.5, 0.7],
  ] as const)(
    '%s strikes nearby foes on its independent active-time cooldown',
    (classId, radius, interval, multiplier) => {
      const arena = setup(classId);
      const enemies = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].map(([x, y]) => arena.spawn(x! * (radius - 1), y! * (radius - 1)));
      const outside = arena.spawn(radius + 1, 0);
      arena.context.timers.attackTimer = 100;
      arena.combat.tickFire(0.01);
      const health = 10000 - arena.context.run.stats.damage * multiplier;
      for (const enemy of enemies) {
        expect(enemy.health).toBeCloseTo(health);
        expect(enemy.pinned).toBe(classId === 'spirit-caller' ? 0.65 : 0);
      }
      expect(outside.health).toBe(10000);
      arena.context.run.phase = 'paused';
      arena.combat.tickFire(10);
      expect(arena.context.timers.closeDefenseTimer).toBe(interval);
      arena.context.run.phase = 'playing';
      arena.context.run.health = 0;
      arena.context.run.khan.successionRemaining = 5;
      arena.combat.tickFire(10);
      expect(enemies[0]!.health).toBeCloseTo(health);
      expect(arena.context.timers.closeDefenseTimer).toBe(interval);
      arena.context.run.health = arena.context.run.stats.maxHealth;
      arena.context.run.khan.successionRemaining = 0;
      arena.combat.tickFire(interval / 2);
      expect(enemies[0]!.health).toBeCloseTo(health);
      arena.combat.tickFire(interval / 2);
      expect(enemies[0]!.health).toBeCloseTo(
        10000 - 2 * arena.context.run.stats.damage * multiplier,
      );
    },
  );
  it.each(CHARACTER_CLASSES)('%s close defense respects terrain', (classId) => {
    const arena = setup(classId);
    const enemy = arena.spawn(20, 0);
    arena.context.landscape.navigation!.lineClear = () => false;
    arena.combat.tickFire(0.1);
    expect(enemy.health).toBe(10000);
    expect(arena.context.timers.closeDefenseTimer).toBe(0);
  });
});
