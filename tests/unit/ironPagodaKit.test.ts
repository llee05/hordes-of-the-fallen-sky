import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('../support/mockPhaser')).mockPhaser());

import { GAME } from '../../src/game/config';
import { createDeveloperClassRun } from '../../src/game/dev/levels';
import { classDefinition } from '../../src/game/data/classes';
import { ALL_ENEMIES } from '../../src/game/data/enemies';
import type { Enemy } from '../../src/game/entities/actors';
import { CombatSystem } from '../../src/game/scenes/arena/CombatSystem';
import {
  EnemyBehaviour,
  type EnemyBehaviourHost,
} from '../../src/game/scenes/arena/EnemyBehaviour';
import { EnemyDirector } from '../../src/game/scenes/arena/EnemyDirector';
import { KhanController } from '../../src/game/scenes/arena/KhanController';
import { createAreaThreats } from '../../src/game/state/areaThreats';
import {
  createEnemyStatus,
  isKhanUnstoppable,
  khanStatusOf,
} from '../../src/game/state/statusEffects';
import { SpatialHash } from '../../src/game/systems/SpatialHash';
import { createFakeArena } from '../support/fakeArena';

const pagoda = classDefinition('iron-pagoda');
const east = { x: 1600, y: 1000 };
const wisp = ALL_ENEMIES.find((enemy) => enemy.id === 'wisp')!;
const brute = ALL_ENEMIES.find((enemy) => enemy.id === 'brute')!;
const giant = ALL_ENEMIES.find((enemy) => enemy.id === 'eclipse-giant')!;
const HEALTH = 100000;

function setup() {
  const arena = createFakeArena({
    run: createDeveloperClassRun('iron-pagoda')!,
    visualSettings: { effectDensity: 'minimal' },
  });
  Object.assign(arena.context, { spatial: new SpatialHash<Enemy>() });
  const director = new EnemyDirector(arena.context, arena.enemyDirectorHost);
  const combat = new CombatSystem(arena.context, arena.host, director, arena.clanDamage);
  const spawn = (dx: number, dy: number, definition = wisp, armor?: number) => {
    const enemy = arena.enemies.create();
    director.initialize(enemy, { ...definition, health: HEALTH, armor }, 1000 + dx, 1000 + dy);
    arena.context.spatial.rebuild(arena.enemies.getChildren());
    return enemy;
  };
  const ready = () => {
    arena.context.timers.attackTimer = 0;
  };
  return { ...arena, combat, director, spawn, ready };
}

/** Damage a single strike did, read from an enemy's lost health. */
const lost = (enemy: Enemy): number => HEALTH - enemy.health;

describe('Iron Pagoda kit definitions', () => {
  it('replaces the placeholder attacks and abilities with the Heavy Sabre kit', () => {
    expect(pagoda.basicAttack.name).toBe('Heavy Sabre');
    expect(pagoda.heavyAttack.name).toBe('Sundering Cleave');
    expect(pagoda.abilities.map((a) => [a.slotLabel, a.name, a.kind])).toEqual([
      ['1', 'Iron Wall', 'brace'],
      ['2', 'Crushing Hooves', 'shockwave'],
      ['3', 'Chain Snare', 'snare'],
      ['4', 'Unbroken Fortress', 'fortress'],
    ]);
  });

  it('makes the sabre slow and broad with a combo, and the cleave wider and stronger', () => {
    expect(pagoda.basicAttack.shape).toBe('arc');
    expect(pagoda.basicAttack.windup).toBeGreaterThan(0.12);
    expect(pagoda.basicAttack.width).toBeGreaterThan(Math.PI / 2);
    expect(pagoda.basicAttack.combo).toBeDefined();
    expect(pagoda.heavyAttack.width).toBeGreaterThan(pagoda.basicAttack.width);
    expect(pagoda.heavyAttack.payload?.shred).toBeDefined();
    expect(pagoda.heavyAttack.payload?.stun).toBeGreaterThan(0);
    expect(pagoda.heavyAttack.payload?.knockback).toBeDefined();
  });

  it('describes the numbers it actually uses', () => {
    expect(pagoda.heavyAttack.description).toContain('30%');
    expect(pagoda.abilities[0]!.description).toContain('65%');
    expect(pagoda.abilities[3]!.description).toContain('0.7 seconds');
  });

  it('leaves the other classes without status payloads or combos', () => {
    for (const id of ['mounted-archer', 'lancer', 'spirit-caller'] as const) {
      const cls = classDefinition(id);
      expect(cls.basicAttack.combo).toBeUndefined();
      expect(cls.basicAttack.payload).toBeUndefined();
      expect(cls.heavyAttack.payload).toBeUndefined();
    }
  });
});

describe('Heavy Sabre', () => {
  it('strikes every enemy in a broad frontal arc and nothing behind', () => {
    const arena = setup();
    const front = [arena.spawn(80, 0), arena.spawn(70, 55), arena.spawn(70, -55)];
    const behind = arena.spawn(-60, 0);
    const far = arena.spawn(300, 0);
    arena.combat.fireBasic(east);
    for (const enemy of front) expect(enemy.health).toBeLessThan(HEALTH);
    expect(behind.health).toBe(HEALTH);
    expect(far.health).toBe(HEALTH);
  });

  it('hits harder with each successive landed slash and resets after the finishing slash', () => {
    const arena = setup();
    const target = arena.spawn(80, 0);
    const base = arena.context.run.stats.damage * pagoda.basicAttack.damage;
    const step = pagoda.basicAttack.combo!.damagePerStep;
    const steps = pagoda.basicAttack.combo!.steps;
    const dealt: number[] = [];
    for (let slash = 0; slash < steps + 1; slash++) {
      arena.ready();
      const before = target.health;
      arena.combat.fireBasic(east);
      dealt.push(before - target.health);
    }
    for (let slash = 0; slash < steps; slash++)
      expect(dealt[slash]).toBeCloseTo(base * (1 + step * slash));
    expect(dealt[steps]).toBeCloseTo(base);
    expect(dealt[steps - 1]!).toBeGreaterThan(dealt[0]!);
    expect(arena.combat.comboCount()).toBe(1);
  });

  it('resets the chain after a pause longer than its window', () => {
    const arena = setup();
    const target = arena.spawn(80, 0);
    const window = pagoda.basicAttack.combo!.window;
    arena.ready();
    arena.combat.fireBasic(east);
    arena.ready();
    arena.combat.fireBasic(east);
    expect(arena.combat.comboCount()).toBe(2);
    arena.combat.tickKhanCombat(window - 0.1, false, false, east);
    expect(arena.combat.comboCount()).toBe(2);
    arena.combat.tickKhanCombat(0.2, false, false, east);
    expect(arena.combat.comboCount()).toBe(0);
    arena.ready();
    const before = target.health;
    arena.combat.fireBasic(east);
    expect(before - target.health).toBeCloseTo(
      arena.context.run.stats.damage * pagoda.basicAttack.damage,
    );
  });

  it('does not advance the chain on a miss, and does not tick while paused', () => {
    const arena = setup();
    arena.ready();
    arena.combat.fireBasic(east);
    expect(arena.combat.comboCount()).toBe(0);
    arena.spawn(80, 0);
    arena.ready();
    arena.combat.fireBasic(east);
    expect(arena.combat.comboCount()).toBe(1);
    arena.context.run.phase = 'paused';
    arena.combat.tickKhanCombat(60, false, false, east);
    expect(arena.combat.comboCount()).toBe(1);
  });

  it('is slow: it holds the swing through a longer windup than other light attacks', () => {
    const arena = setup();
    const target = arena.spawn(80, 0);
    arena.combat.tickKhanCombat(0.01, true, false, east);
    arena.combat.tickKhanCombat(pagoda.basicAttack.windup! - 0.05, true, false, east);
    expect(target.health).toBe(HEALTH);
    arena.combat.tickKhanCombat(0.1, true, false, east);
    expect(target.health).toBeLessThan(HEALTH);
  });

  it('does not clear the chain when the Khan falls and a successor returns', () => {
    const arena = setup();
    arena.spawn(80, 0);
    arena.ready();
    arena.combat.fireBasic(east);
    expect(arena.combat.comboCount()).toBe(1);
    arena.context.run.health = 0;
    arena.context.run.khan.successionRemaining = 5;
    arena.combat.tickKhanCombat(0.01, false, false, east);
    expect(arena.combat.comboCount()).toBe(0);
  });
});

describe('Sundering Cleave', () => {
  it('shreds armour: the enemy takes more damage and loses its armour reduction', () => {
    const arena = setup();
    const armoured = arena.spawn(100, 0, brute, GAME.tactics.heavyArmor);
    const plain = arena.spawn(100, 30, wisp);
    const base = arena.context.run.stats.damage * pagoda.heavyAttack.damage;
    arena.combat.fireHeavy(east);
    // Armour is removed by the same hit that shreds, so the cleave itself lands unreduced.
    const shred = pagoda.heavyAttack.payload!.shred!.bonus;
    expect(lost(armoured)).toBeCloseTo(base * (1 + shred));
    expect(lost(plain)).toBeCloseTo(base * (1 + shred));
    expect(armoured.status.shred).toBe(pagoda.heavyAttack.payload!.shred!.seconds);
    // Later hits keep the bonus while the shred lasts, then armour returns.
    const before = armoured.health;
    arena.combat.damageEnemy(armoured, 10);
    expect(before - armoured.health).toBeCloseTo(10 * (1 + shred));
    armoured.status.shred = 0;
    armoured.status.shredBonus = 0;
    const after = armoured.health;
    arena.combat.damageEnemy(armoured, 10);
    expect(after - armoured.health).toBeCloseTo(10 * GAME.tactics.heavyArmor);
  });

  it('staggers nearby foes: a brief stun and a knockback away from the Khan', () => {
    const arena = setup();
    const near = arena.spawn(100, 0);
    const outside = arena.spawn(400, 0);
    arena.combat.fireHeavy(east);
    const payload = pagoda.heavyAttack.payload!;
    expect(near.status.stun).toBeCloseTo(payload.stun!);
    expect(near.status.forced).toBeCloseTo(payload.knockback!.seconds);
    expect(near.status.forcedVx).toBeGreaterThan(0);
    expect(near.status.forcedVy).toBeCloseTo(0);
    expect(outside.status).toEqual(createEnemyStatus());
  });

  it('reaches enemies at the flanks of its wide sweep', () => {
    const arena = setup();
    const flank = arena.spawn(10, 100);
    const rear = arena.spawn(-100, 0);
    arena.combat.fireHeavy(east);
    expect(flank.status.stun).toBeGreaterThan(0);
    expect(rear.status.stun).toBe(0);
  });

  it('staggers large enemies and elites for less time', () => {
    const arena = setup();
    const small = arena.spawn(100, 0, wisp);
    const large = arena.spawn(100, 30, brute);
    const elite = arena.spawn(100, -30, giant);
    arena.combat.fireHeavy(east);
    expect(large.status.stun).toBeCloseTo(small.status.stun * GAME.status.largeControl);
    expect(elite.status.stun).toBeCloseTo(small.status.stun * GAME.status.eliteControl);
  });

  it('is slower and harder-hitting than the sabre', () => {
    expect(pagoda.heavyAttack.windup).toBeGreaterThan(pagoda.basicAttack.windup!);
    expect(pagoda.heavyAttack.damage).toBeGreaterThan(
      pagoda.basicAttack.damage * (1 + pagoda.basicAttack.combo!.damagePerStep * 3),
    );
  });
});

describe('Iron Wall', () => {
  it('braces for several seconds with damage reduction and knockback immunity', () => {
    const arena = setup();
    const brace = pagoda.abilities[0]!;
    if (brace.kind !== 'brace') throw new Error('expected brace');
    expect(arena.combat.useAbility('q', east)).toBe(true);
    const status = khanStatusOf(arena.context.timers);
    expect(brace.duration).toBeGreaterThanOrEqual(3);
    expect(status.guard).toBe(brace.duration);
    expect(status.reduction).toBe(brace.damageReduction);
    expect(isKhanUnstoppable(status)).toBe(true);
    expect(arena.combat.abilityStates()[0]!.remaining).toBe(brace.cooldown);
  });

  it('ends after its duration in active play time only', () => {
    const arena = setup();
    arena.combat.useAbility('q', east);
    arena.context.run.phase = 'paused';
    arena.combat.tickKhanCombat(30, false, false, east);
    expect(khanStatusOf(arena.context.timers).guard).toBeGreaterThan(0);
    arena.context.run.phase = 'playing';
    const brace = pagoda.abilities[0]!;
    if (brace.kind !== 'brace') throw new Error('expected brace');
    arena.combat.tickKhanCombat(brace.duration + 0.1, false, false, east);
    const status = khanStatusOf(arena.context.timers);
    expect(status.guard).toBe(0);
    expect(isKhanUnstoppable(status)).toBe(false);
  });

  it('is cleared when the Khan falls', () => {
    const arena = setup();
    arena.combat.useAbility('q', east);
    arena.context.run.health = 0;
    arena.context.run.khan.successionRemaining = 5;
    arena.combat.tickKhanCombat(0.01, false, false, east);
    expect(khanStatusOf(arena.context.timers).guard).toBe(0);
  });
});

describe('Crushing Hooves', () => {
  it('stuns every nearby enemy briefly and damages them, leaving distant ones alone', () => {
    const arena = setup();
    const hooves = pagoda.abilities[1]!;
    if (hooves.kind !== 'shockwave') throw new Error('expected shockwave');
    const near = [arena.spawn(60, 0), arena.spawn(-90, 40), arena.spawn(0, -120)];
    const distant = arena.spawn(hooves.range + 40, 0);
    expect(arena.combat.useAbility('w', east)).toBe(true);
    for (const enemy of near) {
      expect(enemy.status.stun).toBeCloseTo(hooves.payload.stun!);
      expect(enemy.health).toBeLessThan(HEALTH);
    }
    expect(distant.status.stun).toBe(0);
    expect(distant.health).toBe(HEALTH);
    expect(hooves.payload.stun).toBeLessThan(3);
  });

  it('surrounds the Khan, not only the front', () => {
    const arena = setup();
    const behind = arena.spawn(-100, 0);
    arena.combat.useAbility('w', east);
    expect(behind.status.stun).toBeGreaterThan(0);
  });

  it('stuns large enemies for less time than small ones', () => {
    const arena = setup();
    const small = arena.spawn(60, 0, wisp);
    const large = arena.spawn(-60, 0, brute);
    arena.combat.useAbility('w', east);
    expect(large.status.stun).toBeCloseTo(small.status.stun * GAME.status.largeControl);
  });
});

describe('Chain Snare', () => {
  it('pulls small enemies toward the Khan and slows large ones', () => {
    const arena = setup();
    const snare = pagoda.abilities[2]!;
    if (snare.kind !== 'snare') throw new Error('expected snare');
    const small = arena.spawn(180, 0, wisp);
    const large = arena.spawn(-180, 0, brute);
    const elite = arena.spawn(0, 180, giant);
    expect(arena.combat.useAbility('e', east)).toBe(true);
    // Pulled inward along the line to the Khan, and also briefly slowed.
    expect(small.status.forced).toBeGreaterThan(0);
    expect(small.status.forcedVx).toBeLessThan(0);
    expect(small.status.forcedVy).toBeCloseTo(0);
    expect(small.status.slow).toBe(snare.small.slow!.seconds);
    for (const heavy of [large, elite]) {
      expect(heavy.status.forced).toBe(0);
      expect(heavy.status.slow).toBe(snare.large.slow!.seconds);
      expect(heavy.status.slowMultiplier).toBe(snare.large.slow!.multiplier);
    }
    expect(snare.large.slow!.multiplier).toBeLessThan(snare.small.slow!.multiplier);
  });

  it('pulls an enemy toward the Khan but stops it short of him', () => {
    const arena = setup();
    const snare = pagoda.abilities[2]!;
    if (snare.kind !== 'snare') throw new Error('expected snare');
    const pull = snare.small.pull!;
    const far = arena.spawn(200, 0);
    const close = arena.spawn(0, pull.stopAt + 20);
    const adjacent = arena.spawn(-20, 0);
    arena.combat.useAbility('e', east);
    expect(Math.abs(far.status.forcedVx) * far.status.forced).toBeCloseTo(
      Math.min(pull.distance, 200 - pull.stopAt),
    );
    expect(Math.abs(close.status.forcedVy) * close.status.forced).toBeCloseTo(20);
    expect(adjacent.status.forced).toBe(0);
  });

  it('sweeps a full circle and ignores enemies beyond its reach', () => {
    const arena = setup();
    const snare = pagoda.abilities[2]!;
    if (snare.kind !== 'snare') throw new Error('expected snare');
    const ring = [
      arena.spawn(150, 0),
      arena.spawn(-150, 0),
      arena.spawn(0, 150),
      arena.spawn(0, -150),
    ];
    const outside = arena.spawn(snare.range + 30, 0);
    arena.combat.useAbility('e', east);
    for (const enemy of ring) {
      expect(enemy.status.forced).toBeGreaterThan(0);
      expect(enemy.health).toBeLessThan(HEALTH);
    }
    expect(outside.status).toEqual(createEnemyStatus());
  });
});

describe('Unbroken Fortress', () => {
  function cast() {
    const arena = setup();
    const fortress = pagoda.abilities[3]!;
    if (fortress.kind !== 'fortress') throw new Error('expected fortress');
    const target = arena.spawn(70, 0);
    const outside = arena.spawn(fortress.range + 60, 0);
    expect(arena.combat.useAbility('r', east)).toBe(true);
    return { arena, fortress, target, outside, status: khanStatusOf(arena.context.timers) };
  }

  it('is an unstoppable stance with reduced damage and a starting shield', () => {
    const { fortress, status } = cast();
    expect(isKhanUnstoppable(status)).toBe(true);
    expect(status.fortress).toBe(fortress.duration);
    expect(status.reduction).toBe(fortress.damageReduction);
    expect(status.shield).toBe(fortress.shield.start);
    expect(status.shieldMax).toBe(fortress.shield.max);
  });

  it('strikes nearby enemies automatically on its interval, with no input', () => {
    const { arena, fortress, target, outside } = cast();
    arena.combat.tickKhanCombat(0.2, false, false, east);
    const firstBlow = HEALTH - target.health;
    expect(firstBlow).toBeCloseTo(arena.context.run.stats.damage * fortress.damage);
    arena.combat.tickKhanCombat(fortress.interval * 0.5, false, false, east);
    expect(HEALTH - target.health).toBeCloseTo(firstBlow);
    arena.combat.tickKhanCombat(fortress.interval * 0.6, false, false, east);
    expect(HEALTH - target.health).toBeCloseTo(firstBlow * 2);
    expect(outside.health).toBe(HEALTH);
  });

  it('strikes the whole circle, including behind the Khan', () => {
    const { arena, fortress } = cast();
    const behind = arena.spawn(-90, 0);
    arena.combat.tickKhanCombat(0.2, false, false, east);
    expect(behind.health).toBeLessThan(HEALTH);
    expect(fortress.range).toBeGreaterThan(90);
  });

  it('strikes about duration / interval times, then stops when the stance ends', () => {
    const { arena, fortress, target, status } = cast();
    let blows = 0;
    let health = target.health;
    for (let time = 0; time < fortress.duration + 2; time += 0.05) {
      arena.combat.tickKhanCombat(0.05, false, false, east);
      if (target.health < health) blows++;
      health = target.health;
    }
    expect(blows).toBeGreaterThanOrEqual(Math.floor(fortress.duration / fortress.interval));
    expect(blows).toBeLessThanOrEqual(Math.ceil(fortress.duration / fortress.interval) + 1);
    expect(status.fortress).toBe(0);
    expect(isKhanUnstoppable(status)).toBe(false);
    expect(status.shield).toBe(0);
  });

  it('keeps rebuilding its shield while it lasts, from time and from each enemy struck', () => {
    const { arena, fortress, status } = cast();
    status.shield = 0;
    arena.combat.tickKhanCombat(1, false, false, east);
    // Time regeneration plus the first sweep's per-enemy shield (two enemies are not in reach: one is).
    expect(status.shield).toBeGreaterThan(fortress.shield.perSecond * 0.99);
    for (let i = 0; i < 60; i++) arena.combat.tickKhanCombat(0.05, false, false, east);
    expect(status.shield).toBeLessThanOrEqual(fortress.shield.max);
  });
});

describe('Khan taking damage under guards', () => {
  function khanController() {
    const arena = setup();
    const khan = new KhanController(arena.context, {
      areaThreats: createAreaThreats(),
      clearTouch: () => {},
    });
    return { arena, khan };
  }

  it('takes less damage while braced', () => {
    const { arena, khan } = khanController();
    const run = arena.context.run;
    const protection = classDefinition('iron-pagoda').stats.damageTakenMultiplier;
    khan.takeDamage(20);
    const unbraced = run.stats.maxHealth - run.health;
    expect(unbraced).toBeCloseTo(20 * protection);
    run.health = run.stats.maxHealth;
    arena.context.timers.invulnerable = 0;
    arena.combat.useAbility('q', east);
    khan.takeDamage(20);
    const brace = pagoda.abilities[0]!;
    if (brace.kind !== 'brace') throw new Error('expected brace');
    expect(run.stats.maxHealth - run.health).toBeCloseTo(unbraced * (1 - brace.damageReduction));
  });

  it('spends the fortress shield before health', () => {
    const { arena, khan } = khanController();
    const run = arena.context.run;
    const fortress = pagoda.abilities[3]!;
    if (fortress.kind !== 'fortress') throw new Error('expected fortress');
    arena.combat.useAbility('r', east);
    const status = khanStatusOf(arena.context.timers);
    const incoming = 8;
    const afterReduction = incoming * (1 - fortress.damageReduction);
    expect(afterReduction).toBeLessThan(status.shield);
    khan.takeDamage(incoming);
    expect(run.health).toBe(run.stats.maxHealth);
    expect(status.shield).toBeCloseTo(fortress.shield.start - afterReduction);
  });

  it('ignores the hit entirely when a stunned enemy touches the Khan', () => {
    const { arena, khan } = khanController();
    const run = arena.context.run;
    const enemy = arena.spawn(10, 0);
    enemy.status.stun = 1;
    khan.hurtPlayer(enemy);
    expect(run.health).toBe(run.stats.maxHealth);
    enemy.status.stun = 0;
    khan.hurtPlayer(enemy);
    expect(run.health).toBeLessThan(run.stats.maxHealth);
  });
});

describe('enemy behaviour under status effects', () => {
  function behaviour() {
    const arena = setup();
    Object.assign(arena.context.landscape, { navigation: undefined });
    Object.assign(arena.context.camp, { x: 4000, y: 4000 });
    const moves: { speed: number }[] = [];
    Object.assign(arena.context.scene.physics, {
      moveTo: (enemy: Enemy, _x: number, _y: number, speed: number) => {
        moves.push({ speed });
        enemy.setVelocity(speed, 0);
      },
    });
    const warnings = { clear: () => warnings };
    const host = { fieldMarkers: { warnings } } as unknown as EnemyBehaviourHost;
    const system = new EnemyBehaviour(
      arena.context,
      host,
      arena.combat,
      arena.director,
      arena.clanDamage,
    );
    return { arena, system, moves };
  }

  it('holds a stunned enemy still and lets it move again afterwards', () => {
    const { arena, system } = behaviour();
    const enemy = arena.spawn(300, 0);
    enemy.status.stun = 0.5;
    system.update(0.1);
    expect(enemy.body!.velocity.x).toBe(0);
    expect(enemy.status.stun).toBeCloseTo(0.4);
    system.update(0.5);
    system.update(0.1);
    expect(enemy.body!.velocity.x).toBeGreaterThan(0);
  });

  it('moves a slowed enemy at a fraction of its speed', () => {
    const { arena, system, moves } = behaviour();
    const enemy = arena.spawn(300, 0);
    system.update(0.01);
    const normal = moves.at(-1)!.speed;
    enemy.status.slow = 2;
    enemy.status.slowMultiplier = 0.5;
    system.update(0.01);
    expect(moves.at(-1)!.speed).toBeCloseTo(normal * 0.5);
  });

  it('drives a pulled or knocked-back enemy at the forced velocity instead of steering', () => {
    const { arena, system, moves } = behaviour();
    const enemy = arena.spawn(300, 0);
    enemy.status.forced = 0.3;
    enemy.status.forcedVx = -120;
    enemy.status.forcedVy = 40;
    system.update(0.1);
    expect(moves).toHaveLength(0);
    expect(enemy.body!.velocity.x).toBe(-120);
    expect(enemy.body!.velocity.y).toBe(40);
    system.update(0.3);
    system.update(0.1);
    expect(moves.length).toBeGreaterThan(0);
  });

  it('stops a stunned ranged enemy firing', () => {
    const { arena, system } = behaviour();
    const seer = ALL_ENEMIES.find((enemy) => enemy.id === 'hollow-seer')!;
    const enemy = arena.spawn(300, 0, seer);
    const fire = vi.spyOn(arena.combat, 'fireHostile');
    enemy.attackTimer = 0;
    enemy.status.stun = 1;
    system.update(0.01);
    expect(fire).not.toHaveBeenCalled();
    enemy.status.stun = 0;
    enemy.attackTimer = 0;
    system.update(0.01);
    expect(fire).toHaveBeenCalled();
  });
});
