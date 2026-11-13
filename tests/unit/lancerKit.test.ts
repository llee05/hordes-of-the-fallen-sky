import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('../support/mockPhaser')).mockPhaser());

import { createDeveloperClassRun } from '../../src/game/dev/levels';
import { classDefinition } from '../../src/game/data/classes';
import { ALL_ENEMIES } from '../../src/game/data/enemies';
import type { Enemy } from '../../src/game/entities/actors';
import { CombatSystem } from '../../src/game/scenes/arena/CombatSystem';
import { EnemyDirector } from '../../src/game/scenes/arena/EnemyDirector';
import {
  breakthroughDamage,
  chargeRatio,
  safeVaultLanding,
} from '../../src/game/state/classActions';
import { isKhanUnstoppable } from '../../src/game/state/statusEffects';
import { SpatialHash } from '../../src/game/systems/SpatialHash';
import { createFakeArena } from '../support/fakeArena';

function setup() {
  const arena = createFakeArena({ run: createDeveloperClassRun('lancer')! });
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

describe('Lancer kit', () => {
  it('Spear Thrust reaches far down a narrow line without clipping enemies beside it', () => {
    const arena = setup();
    const far = arena.spawn(220, 0);
    const wide = arena.spawn(160, 18);
    const behind = arena.spawn(-20, 0);
    arena.combat.fireBasic({ x: 1500, y: 1000 });
    expect(far.health).toBeLessThan(10000);
    expect(wide.health).toBe(10000);
    expect(behind.health).toBe(10000);
  });

  it('Impaling Strike reports held progress and only releases after right click is released', () => {
    const arena = setup();
    const heavy = classDefinition('lancer').heavyAttack;
    const aim = { x: 1600, y: 1000 };
    arena.combat.tickKhanCombat(0.01, false, true, aim);
    arena.combat.tickKhanCombat(heavy.holdCharge!.maxDuration, false, true, aim);
    expect(arena.combat.chargeStatus()).toEqual({ name: 'Impaling Strike', progress: 1 });
    expect(arena.context.run.combat.volleys).toBe(0);
    arena.combat.tickKhanCombat(0.01, false, false, aim);
    expect(arena.combat.chargeStatus()).toBeUndefined();
    expect(arena.context.run.combat.volleys).toBe(1);
  });

  it('Impaling Strike scales reach, damage, and armour penetration with charge', () => {
    const uncharged = setup();
    const near = uncharged.spawn(200, 0, 0.5);
    uncharged.combat.fireHeavy({ x: 1600, y: 1000 });
    const unchargedDamage = 10000 - near.health;

    const charged = setup();
    const far = charged.spawn(360, 0, 0.5);
    const heavy = classDefinition('lancer').heavyAttack;
    charged.combat.fireHeavy({ x: 1600, y: 1000 }, heavy.holdCharge!.maxDuration);
    expect(far.health).toBeLessThan(10000);
    expect(10000 - far.health).toBeGreaterThan(unchargedDamage * 2);
    expect(chargeRatio(heavy.holdCharge!.maxDuration, heavy.holdCharge!.maxDuration)).toBe(1);
  });

  it('a full Impaling Strike pushes freely, but pins and deals bonus damage at terrain', () => {
    const open = setup();
    const openEnemy = open.spawn(180, 0);
    const heavy = classDefinition('lancer').heavyAttack;
    open.combat.fireHeavy({ x: 1600, y: 1000 }, heavy.holdCharge!.maxDuration);
    expect(openEnemy.x).toBeCloseTo(1285);
    expect(openEnemy.status.stun).toBe(0);

    const blocked = setup();
    const pinned = blocked.spawn(180, 0);
    blocked.context.landscape.navigation!.slide = (from: { x: number; y: number }) => ({
      x: from.x + 20,
      y: from.y,
    });
    blocked.combat.fireHeavy({ x: 1600, y: 1000 }, heavy.holdCharge!.maxDuration);
    expect(pinned.x).toBeCloseTo(1200);
    expect(pinned.status.stun).toBeGreaterThan(0);
    expect(pinned.health).toBeLessThan(openEnemy.health);
  });

  it('Breakthrough pierces every enemy on its travelled path and rewards speed and distance', () => {
    const arena = setup();
    const early = arena.spawn(50, 0);
    const late = arena.spawn(190, 0);
    arena.context.player.setVelocity(arena.context.run.stats.speed, 0);
    expect(arena.combat.useAbility('q', { x: 1600, y: 1000 })).toBe(true);
    arena.context.player.setPosition(1100, 1000);
    arena.combat.tickKhanCombat(0.1, false, false, { x: 1600, y: 1000 });
    arena.context.player.setPosition(1210, 1000);
    arena.combat.tickKhanCombat(0.1, false, false, { x: 1600, y: 1000 });
    expect(early.health).toBeLessThan(10000);
    expect(late.health).toBeLessThan(10000);
    expect(10000 - late.health).toBeGreaterThan(10000 - early.health);
    expect(breakthroughDamage(0.65, 0.35, 0.75, 200, 200, 300, 300)).toBeGreaterThan(
      breakthroughDamage(0.65, 0.35, 0.75, 0, 200, 0, 300),
    );
  });

  it('Sweeping Lance hits a forward semicircle and knocks survivors away', () => {
    const arena = setup();
    const ahead = arena.spawn(100, 0);
    const flank = arena.spawn(5, 100);
    const behind = arena.spawn(-100, 0);
    expect(arena.combat.useAbility('w', { x: 1600, y: 1000 })).toBe(true);
    expect(ahead.health).toBeLessThan(10000);
    expect(flank.health).toBeLessThan(10000);
    expect(ahead.status.forcedVx).toBeGreaterThan(0);
    expect(flank.status.forcedVy).toBeGreaterThan(0);
    expect(behind.health).toBe(10000);
  });

  it('Lance Vault follows movement direction and damages only its landing shockwave', () => {
    const arena = setup();
    const landingEnemy = arena.spawn(0, 280);
    const originEnemy = arena.spawn(20, 0);
    arena.context.player.setVelocity(0, 100);
    expect(arena.combat.useAbility('e', { x: 1600, y: 1000 })).toBe(true);
    expect(arena.context.player.x).toBeCloseTo(1000);
    expect(arena.context.player.y).toBeCloseTo(1285);
    expect(landingEnemy.health).toBeLessThan(10000);
    expect(originEnemy.health).toBe(10000);
    expect(arena.context.timers.invulnerable).toBeGreaterThan(0);
  });

  it('Lance Vault finds a safe landing beyond an obstacle without leaving the map', () => {
    const landing = safeVaultLanding(
      { x: 1000, y: 1000 },
      { x: 1, y: 0 },
      285,
      ({ x }) => x <= 1040 || (x >= 1200 && x <= 1240),
    );
    expect(landing.x).toBeGreaterThanOrEqual(1200);
    const edge = safeVaultLanding({ x: 5190, y: 1000 }, { x: 1, y: 0 }, 285, () => true);
    expect(edge.x).toBeLessThanOrEqual(5200 - 24);
  });

  it('Unstoppable Charge grants immunity, contact damage, and capped per-enemy extensions', () => {
    const arena = setup();
    const first = arena.spawn(30, 0);
    const ability = classDefinition('lancer').abilities[3];
    expect(ability.kind).toBe('unstoppable');
    expect(arena.combat.useAbility('r', { x: 1600, y: 1000 })).toBe(true);
    expect(isKhanUnstoppable(arena.context.timers.khanStatus!)).toBe(true);
    arena.combat.tickKhanCombat(0.01, false, false, { x: 1600, y: 1000 });
    expect(first.health).toBeLessThan(10000);
    const afterFirst = arena.context.timers.classAction!.remaining;
    expect(afterFirst).toBeGreaterThan(ability.kind === 'unstoppable' ? ability.duration : 0);
    for (let index = 0; index < 20; index++) arena.spawn(20 + index, 10);
    arena.combat.tickKhanCombat(0.01, false, false, { x: 1600, y: 1000 });
    expect(arena.context.timers.classAction!.remaining).toBeLessThanOrEqual(
      ability.kind === 'unstoppable' ? ability.maxDuration : 0,
    );
    expect(arena.context.timers.classAction!.speed).toBe(
      ability.kind === 'unstoppable' ? ability.speedMultiplier : 0,
    );
  });
});
