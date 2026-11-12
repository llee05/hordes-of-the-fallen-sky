import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('../support/mockPhaser')).mockPhaser());

import { CHARACTER_CLASSES } from '../../src/shared/characterProfile';
import { createDeveloperClassRun } from '../../src/game/dev/levels';
import { classDefinition } from '../../src/game/data/classes';
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
  it.each([
    ['mounted-archer', 0.12, 0.28],
    ['lancer', 0.08, 0.08],
    ['iron-pagoda', 0.22, 0.22],
    ['spirit-caller', 0.18, 0.18],
  ] as const)(
    '%s keeps its weapon spacing across Burning Tempest',
    (classId, ordinary, tempest) => {
      const arena = setup(classId);
      const target = arena.spawn(200, 0);
      for (const [enabled, spacing] of [
        [false, ordinary],
        [true, tempest],
      ] as const) {
        arena.context.run.clan.paths.archery = enabled ? ['fire-arrows'] : [];
        arena.context.run.clan.paths.sanctuary = enabled ? ['wind-shamans'] : [];
        arena.combat.shootVolley(1000, 1000, target, 3, 1, false, false, 'khan');
        const arrows = arena.projectiles.getChildren().filter((arrow) => arrow.active);
        expect(arrows).toHaveLength(enabled ? 5 : 3);
        const angles = arrows.map((arrow) =>
          Math.atan2(arrow.body!.velocity.y, arrow.body!.velocity.x),
        );
        for (let i = 1; i < angles.length; i++) {
          expect(angles[i]! - angles[i - 1]!).toBeCloseTo(spacing);
        }
        for (const arrow of arrows) arrow.disableBody(true, true);
      }
    },
  );

  it('fires the Mounted Archer basic as a fast aimed arrow', () => {
    const arena = setup('mounted-archer');
    const faceTarget = vi.spyOn(arena.host, 'faceTarget');
    expect(arena.combat.fireBasic({ x: 1400, y: 1000 })).toBe(true);
    expect(faceTarget).toHaveBeenCalledWith(1400, 1000);
    const arrow = arena.projectiles.getFirstAlive()!;
    expect(arrow.body!.velocity.x).toBeGreaterThan(0);
    expect(arrow.body!.velocity.y).toBeCloseTo(0);
    expect(arrow.damage).toBeCloseTo(arena.context.run.stats.damage);
  });

  it('fires the Spirit Caller basic as one slower homing bolt', () => {
    const arena = setup('spirit-caller');
    const target = arena.spawn(250, 80);
    expect(arena.combat.fireBasic({ x: 1400, y: 1000 })).toBe(true);
    const bolt = arena.projectiles.getFirstAlive()!;
    expect(arena.projectiles.countActive()).toBe(1);
    expect(Math.hypot(bolt.body!.velocity.x, bolt.body!.velocity.y)).toBeCloseTo(
      classDefinition('spirit-caller').stats.projectileSpeed,
    );
    arena.combat.updateProjectiles(0.1);
    expect(bolt.body!.velocity.y).toBeGreaterThan(0);
    arena.combat.hitEnemy(bolt, target);
    expect(arena.combat.spiritStatus()).toMatchObject({ energy: 1, maximum: 12 });
  });

  it('fires the Mounted Archer heavy as a harder-hitting drawn power shot', () => {
    const arena = setup('mounted-archer');
    expect(arena.combat.fireHeavy({ x: 1600, y: 1000 })).toBe(true);
    const arrow = arena.projectiles.getFirstAlive()!;
    expect(arrow.damage).toBeCloseTo(
      arena.context.run.stats.damage * classDefinition('mounted-archer').heavyAttack.damage,
    );
  });

  it('fires the Lancer heavy through its longer charging-thrust lane', () => {
    const arena = setup('lancer');
    const distant = arena.spawn(270, 20);
    arena.combat.fireHeavy({ x: 1600, y: 1000 });
    expect(distant.health).toBeLessThan(10000);
  });

  it('fires the Iron Pagoda heavy through a larger sweeping arc', () => {
    const arena = setup('iron-pagoda');
    const distant = arena.spawn(110, 70);
    arena.combat.fireHeavy({ x: 1600, y: 1000 });
    expect(distant.health).toBeLessThan(10000);
  });

  it('charges the Ancestral Drum into three expanding slowing waves', () => {
    const arena = setup('spirit-caller');
    const near = arena.spawn(100, 0);
    const far = arena.spawn(205, 0);
    const heavy = classDefinition('spirit-caller').heavyAttack;
    expect(arena.combat.fireHeavy({ x: 1600, y: 1000 }, heavy.charge!.maxDuration)).toBe(true);
    expect(arena.context.timers.spiritCaller?.drumWaves).toHaveLength(3);
    arena.combat.tickKhanCombat(0.01, false, false, { x: 1600, y: 1000 });
    expect(near.health).toBeLessThan(10000);
    expect(near.spiritSlow).toBe(heavy.charge!.slowDuration);
    expect(far.health).toBe(10000);
    arena.combat.tickKhanCombat(heavy.charge!.waveDelay, false, false, { x: 1600, y: 1000 });
    arena.combat.tickKhanCombat(heavy.charge!.waveDelay, false, false, { x: 1600, y: 1000 });
    expect(far.health).toBeLessThan(10000);
  });

  it('releases additional Ancestral Drum waves according to held right-click charge', () => {
    const arena = setup('spirit-caller');
    const aim = { x: 1500, y: 1000 };
    arena.combat.tickKhanCombat(0.01, false, true, aim);
    arena.combat.tickKhanCombat(0.56, false, true, aim);
    arena.combat.tickKhanCombat(0.01, false, false, aim);
    expect(arena.context.timers.spiritCaller?.drumWaves).toHaveLength(2);
  });

  it('Ongod Guardians attack and intercept only their limited allotment of hostile shots', () => {
    const arena = setup('spirit-caller');
    const target = arena.spawn(120, 0);
    expect(arena.combat.useAbility('q', target)).toBe(true);
    for (let index = 0; index < 6; index++) {
      const shot = arena.hostileShots.get(1010 + index, 1000)!;
      shot.enableBody(true, 1010 + index, 1000, true, true);
    }
    arena.combat.tickKhanCombat(0.01, false, false, target);
    expect(arena.hostileShots.countActive()).toBe(2);
    expect(arena.projectiles.countActive()).toBeGreaterThanOrEqual(2);
    expect(arena.combat.spiritStatus()?.activeSpirits).toBe(2);
  });

  it('Wind of Tengri damages enemies and opens a broad corridor by pushing them forward', () => {
    const arena = setup('spirit-caller');
    const ahead = arena.spawn(180, 20);
    const outside = arena.spawn(180, 80);
    expect(arena.combat.useAbility('w', { x: 1500, y: 1000 })).toBe(true);
    expect(ahead.health).toBeLessThan(10000);
    expect(ahead.x).toBeGreaterThan(1180);
    expect(outside.health).toBe(10000);
  });

  it('Sacred Ovoo slows enemies and empowers guardian attacks while the spirits are inside', () => {
    const arena = setup('spirit-caller');
    const target = arena.spawn(100, 0);
    expect(arena.combat.useAbility('e', { x: 1400, y: 1000 })).toBe(true);
    expect(arena.combat.useAbility('q', target)).toBe(true);
    arena.combat.tickKhanCombat(0.01, false, false, target);
    expect(target.spiritSlow).toBeGreaterThan(0);
    const bolt = arena.projectiles.getFirstAlive()!;
    const guardians = classDefinition('spirit-caller').abilities.find(
      (ability) => ability.kind === 'guardians',
    )!;
    const ovoo = classDefinition('spirit-caller').abilities.find(
      (ability) => ability.kind === 'ovoo',
    )!;
    expect(bolt.damage).toBeCloseTo(
      arena.context.run.stats.damage * guardians.damage * ovoo.spiritDamage,
    );
  });

  it('Veil consumes spiritual energy, multiplies guardians, and repeats Spirit Wisps', () => {
    const arena = setup('spirit-caller');
    const target = arena.spawn(120, 0);
    arena.context.timers.spiritCaller!.energy = 4;
    expect(arena.combat.useAbility('q', target)).toBe(true);
    expect(arena.combat.useAbility('r', target)).toBe(true);
    expect(arena.context.timers.spiritCaller!.energy).toBe(0);
    expect(arena.context.timers.spiritCaller!.veilRemaining).toBeCloseTo(6.2);
    expect(arena.combat.spiritStatus()?.activeSpirits).toBe(6);
    arena.combat.tickKhanCombat(0.01, false, false, target);
    expect(arena.projectiles.countActive()).toBeGreaterThanOrEqual(6);
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
    const { homingTurnRate, spreadAngle } = classDefinition('spirit-caller').weapon;
    arena.combat.updateProjectiles(0.01);
    for (const [i, bolt] of bolts.entries()) {
      const angle = Math.atan2(bolt.body!.velocity.y, bolt.body!.velocity.x);
      const desired = Math.atan2(dy!, dx!);
      const error = Math.abs(Math.atan2(Math.sin(angle - desired), Math.cos(angle - desired)));
      expect(error).toBeCloseTo(spreadAngle / 2 - homingTurnRate * 0.01);
      expect(Math.hypot(bolt.body!.velocity.x, bolt.body!.velocity.y)).toBeCloseTo(speeds[i]!);
    }
    arena.combat.updateProjectiles(spreadAngle / 2 / homingTurnRate);
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

  it('fires the Lancer basic through a narrow forward line only', () => {
    const arena = setup('lancer');
    const ahead = arena.spawn(150, 0);
    const beside = arena.spawn(120, 30);
    const behind = arena.spawn(-30, 0);
    arena.combat.fireBasic({ x: 1400, y: 1000 });
    expect(ahead.health).toBeLessThan(10000);
    expect(beside.health).toBe(10000);
    expect(behind.health).toBe(10000);
  });

  it('fires the Iron Pagoda basic through a wide close saber arc only', () => {
    const arena = setup('iron-pagoda');
    const ahead = arena.spawn(80, 50);
    const flank = arena.spawn(40, 90);
    const behind = arena.spawn(-80, 0);
    arena.combat.fireBasic({ x: 1400, y: 1000 });
    expect(ahead.health).toBeLessThan(10000);
    expect(flank.health).toBeLessThan(10000);
    expect(behind.health).toBe(10000);
  });

  it.each(CHARACTER_CLASSES)('%s never attacks without manual input', (classId) => {
    const arena = setup(classId);
    const enemy = arena.spawn(20, 0);
    arena.combat.tickKhanCombat(10, false, false, { x: 1400, y: 1000 });
    expect(enemy.health).toBe(10000);
    expect(arena.projectiles.countActive()).toBe(0);
  });

  it.each(CHARACTER_CLASSES)('%s gates ability 1 by its active-time cooldown', (classId) => {
    const arena = setup(classId);
    const q = classDefinition(classId).abilities[0];
    arena.spawn(50, 0);
    expect(arena.combat.useAbility('q', { x: 1400, y: 1000 })).toBe(true);
    expect(arena.combat.useAbility('q', { x: 1400, y: 1000 })).toBe(false);
    expect(arena.combat.abilityStates()[0]!.remaining).toBe(q.cooldown);
    arena.context.run.phase = 'paused';
    arena.combat.tickKhanCombat(q.cooldown, false, false, { x: 1400, y: 1000 });
    expect(arena.combat.abilityStates()[0]!.remaining).toBe(q.cooldown);
    arena.context.run.phase = 'playing';
    arena.combat.tickKhanCombat(q.cooldown, false, false, { x: 1400, y: 1000 });
    expect(arena.combat.useAbility('q', { x: 1400, y: 1000 })).toBe(true);
  });

  it('repeats a held basic only after windup and its class attack interval', () => {
    const arena = setup('mounted-archer');
    const aim = { x: 1400, y: 1000 };
    arena.combat.tickKhanCombat(0.01, true, false, aim);
    expect(arena.projectiles.countActive()).toBe(0);
    arena.combat.tickKhanCombat(0.12, true, false, aim);
    expect(arena.projectiles.countActive()).toBe(1);
    arena.combat.tickKhanCombat(arena.context.run.stats.attackInterval - 0.01, true, false, aim);
    expect(arena.projectiles.countActive()).toBe(1);
    arena.combat.tickKhanCombat(0.02, true, false, aim);
    arena.combat.tickKhanCombat(0.12, true, false, aim);
    expect(arena.projectiles.countActive()).toBe(2);
  });

  it('holds a heavy through its longer windup and repeats at its own cooldown', () => {
    const arena = setup('mounted-archer');
    const aim = { x: 1600, y: 1000 };
    const heavy = classDefinition('mounted-archer').heavyAttack;
    arena.combat.tickKhanCombat(0.01, false, true, aim);
    arena.combat.tickKhanCombat(heavy.windup - 0.01, false, true, aim);
    expect(arena.projectiles.countActive()).toBe(0);
    arena.combat.tickKhanCombat(0.02, false, true, aim);
    expect(arena.projectiles.countActive()).toBe(1);
    arena.combat.tickKhanCombat(heavy.cooldown, false, true, aim);
    arena.combat.tickKhanCombat(heavy.windup, false, true, aim);
    expect(arena.projectiles.countActive()).toBe(2);
  });
});
