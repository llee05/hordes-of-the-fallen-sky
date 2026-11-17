import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('../support/mockPhaser')).mockPhaser());

import { CHARACTER_CLASSES } from '../../src/shared/characterProfile';
import { createDeveloperTools, executeDeveloperCommand } from '../../src/game/dev/commands';
import { createDeveloperClassRun } from '../../src/game/dev/levels';
import { classDefinition } from '../../src/game/data/classes';
import { ALL_ENEMIES } from '../../src/game/data/enemies';
import type { Enemy } from '../../src/game/entities/actors';
import { CombatSystem } from '../../src/game/scenes/arena/CombatSystem';
import { EnemyDirector } from '../../src/game/scenes/arena/EnemyDirector';
import { KhanController } from '../../src/game/scenes/arena/KhanController';
import { createAreaThreats } from '../../src/game/state/areaThreats';
import {
  abilitySpend,
  canAffordAbility,
  createKhanResources,
  earnClassPower,
  khanResourcesOf,
  restKhan,
} from '../../src/game/state/khanResources';
import { SpatialHash } from '../../src/game/systems/SpatialHash';
import { abilityCostLabel, abilityCostTitle, abilityStatus } from '../../src/ui/khanResourceHud';
import { createFakeArena } from '../support/fakeArena';

function setup(classId: string) {
  const arena = createFakeArena({
    run: createDeveloperClassRun(classId)!,
    visualSettings: { effectDensity: 'minimal' },
  });
  Object.assign(arena.context, { spatial: new SpatialHash<Enemy>() });
  const director = new EnemyDirector(arena.context, arena.enemyDirectorHost);
  const combat = new CombatSystem(arena.context, arena.host, director, arena.clanDamage);
  const spawn = (dx: number, dy: number) => {
    const enemy = arena.enemies.create();
    director.initialize(enemy, { ...ALL_ENEMIES[0]!, health: 10000 }, 1000 + dx, 1000 + dy);
    arena.context.spatial.rebuild(arena.enemies.getChildren());
    return enemy;
  };
  const resources = khanResourcesOf(arena.context.timers);
  resources.classPower = 0;
  /** Makes the next attack available at once. */
  const ready = () => {
    arena.context.timers.attackTimer = 0;
  };
  return { ...arena, combat, director, spawn, resources, ready };
}

const east = { x: 1600, y: 1000 };

describe('class resource rules', () => {
  it('names each class resource and prices its four abilities', () => {
    const table = CHARACTER_CLASSES.map((id) => {
      const cls = classDefinition(id);
      return [cls.resource.name, cls.resource.maximum, ...cls.abilities.map((a) => a.cost)];
    });
    expect(table).toEqual([
      ['Focus', 12, 2, 4, 3, 4],
      ['Momentum', 12, 2, 2, 2, 4],
      ['Mettle', 12, 3, 3, 2, 5],
      ['Spiritual Energy', 12, 4, 3, 4, 6],
    ]);
  });

  it('earns whole points per event, never past the maximum and never by itself', () => {
    const r = createKhanResources();
    const lancer = classDefinition('lancer').resource;
    expect(r.classPower).toBe(0);
    expect(earnClassPower(r, lancer, 'basicHit')).toBe(1);
    expect(earnClassPower(r, lancer, 'fullHeavy')).toBe(2);
    expect(earnClassPower(r, lancer, 'hitTaken')).toBe(0);
    expect(earnClassPower(r, lancer, 'basicHit', 20)).toBe(9);
    expect(r.classPower).toBe(12);
    expect(earnClassPower(r, lancer, 'basicHit')).toBe(0);
  });

  it('prices an ability by its cost, or by everything stored when it takes all', () => {
    const r = { ...createKhanResources(), classPower: 7 };
    expect(canAffordAbility(r, { cost: 7 })).toBe(true);
    expect(canAffordAbility(r, { cost: 8 })).toBe(false);
    expect(abilitySpend(r, { cost: 3 })).toBe(3);
    expect(abilitySpend(r, { cost: 6, spendsAll: true })).toBe(7);
  });

  it('empties the class resource and fills Breath for a successor', () => {
    const r = { stamina: 3, classPower: 9, sprinting: true, winded: true };
    restKhan(r);
    expect(r).toEqual(createKhanResources());
  });
});

describe('earning the class resource', () => {
  it('Mounted Archer earns Focus once per arrow that hits and twice for a full Piercing Draw', () => {
    const arena = setup('mounted-archer');
    const near = arena.spawn(120, 0);
    const far = arena.spawn(200, 0);
    arena.combat.fireBasic(east);
    const arrow = arena.projectiles.getFirstAlive()!;
    arena.combat.hitEnemy(arrow, near);
    expect(arena.resources.classPower).toBe(1);
    // The same arrow piercing a second enemy earns nothing more.
    arena.combat.hitEnemy(arrow, far);
    expect(arena.resources.classPower).toBe(1);
    for (const bolt of arena.projectiles.getChildren()) bolt.disableBody(true, true);

    const heavy = classDefinition('mounted-archer').heavyAttack;
    arena.ready();
    arena.combat.fireHeavy(east, heavy.windup);
    arena.combat.hitEnemy(arena.projectiles.getFirstAlive()!, near);
    expect(arena.resources.classPower).toBe(1);
    for (const bolt of arena.projectiles.getChildren()) bolt.disableBody(true, true);
    arena.ready();
    arena.combat.fireHeavy(east, heavy.charge!.maxDuration);
    arena.combat.hitEnemy(arena.projectiles.getFirstAlive()!, near);
    expect(arena.resources.classPower).toBe(3);
  });

  it('Lancer earns Momentum per thrust that lands, more for three enemies or a full Impaling Strike', () => {
    const arena = setup('lancer');
    arena.combat.fireBasic(east);
    expect(arena.resources.classPower).toBe(0);
    arena.spawn(120, 0);
    arena.ready();
    arena.combat.fireBasic(east);
    expect(arena.resources.classPower).toBe(1);
    arena.spawn(150, 0);
    arena.spawn(180, 0);
    arena.ready();
    arena.combat.fireBasic(east);
    expect(arena.resources.classPower).toBe(3);
    const heavy = classDefinition('lancer').heavyAttack;
    arena.ready();
    arena.combat.fireHeavy(east, heavy.holdCharge!.maxDuration / 2);
    expect(arena.resources.classPower).toBe(3);
    arena.ready();
    arena.combat.fireHeavy(east, heavy.holdCharge!.maxDuration);
    expect(arena.resources.classPower).toBe(5);
  });

  it('Iron Pagoda earns Mettle per slash that lands, on the finisher, and for each hit taken', () => {
    const arena = setup('iron-pagoda');
    const combo = classDefinition('iron-pagoda').basicAttack.combo!;
    arena.combat.fireBasic(east);
    expect(arena.resources.classPower).toBe(0);
    arena.spawn(60, 0);
    for (let slash = 0; slash < combo.steps; slash++) {
      arena.ready();
      arena.combat.fireBasic(east);
    }
    expect(arena.resources.classPower).toBe(combo.steps + 1);
    // The Sundering Cleave is not a sabre slash.
    arena.ready();
    arena.combat.fireHeavy(east);
    expect(arena.resources.classPower).toBe(combo.steps + 1);

    const khan = new KhanController(arena.context, {
      areaThreats: createAreaThreats(),
      clearTouch: () => {},
    });
    khan.takeDamage(5);
    expect(arena.resources.classPower).toBe(combo.steps + 2);
    // Invulnerability after the hit blocks both the damage and the point.
    khan.takeDamage(5);
    expect(arena.resources.classPower).toBe(combo.steps + 2);
  });

  it('gives a hit taken to no other class', () => {
    const arena = setup('lancer');
    const khan = new KhanController(arena.context, {
      areaThreats: createAreaThreats(),
      clearTouch: () => {},
    });
    khan.takeDamage(5);
    expect(arena.resources.classPower).toBe(0);
  });

  it('earns nothing while the Khan is down', () => {
    const arena = setup('lancer');
    arena.spawn(120, 0);
    arena.combat.fireBasic(east);
    expect(arena.resources.classPower).toBe(1);
    const arrow = setup('mounted-archer');
    const target = arrow.spawn(120, 0);
    arrow.combat.fireBasic(east);
    arrow.context.run.health = 0;
    arrow.context.run.khan.successionRemaining = 5;
    arrow.combat.hitEnemy(arrow.projectiles.getFirstAlive()!, target);
    expect(arrow.resources.classPower).toBe(0);
  });
});

describe('spending the class resource', () => {
  it.each(CHARACTER_CLASSES)('%s refuses an ability it cannot pay for', (classId) => {
    const arena = setup(classId);
    const [first] = classDefinition(classId).abilities;
    const play = vi.spyOn(arena.context.audio, 'play');
    arena.resources.classPower = first.cost - 1;
    expect(arena.combat.useAbility('q', east)).toBe(false);
    expect(arena.resources.classPower).toBe(first.cost - 1);
    expect(arena.context.timers.abilityCooldowns!.q).toBe(0);
    expect(arena.combat.abilityStates()[0]).toMatchObject({ remaining: 0, affordable: false });
    expect(arena.combat.classResourceStatus()).toMatchObject({ refusals: 1, refusedSlot: 'q' });
    expect(play).toHaveBeenCalledWith('ui');

    arena.resources.classPower = first.cost;
    expect(arena.combat.useAbility('q', east)).toBe(true);
    expect(arena.resources.classPower).toBe(0);
    expect(arena.context.timers.abilityCooldowns!.q).toBe(first.cost > 0 ? first.cooldown : 0);
    // Still on cooldown: no second cast and no second charge, even with the resource back.
    arena.resources.classPower = 12;
    expect(arena.combat.useAbility('q', east)).toBe(false);
    expect(arena.resources.classPower).toBe(12);
    expect(arena.combat.classResourceStatus().refusals).toBe(1);
  });

  it('spends only on abilities: attacks and the gallop leave the class resource alone', () => {
    const arena = setup('lancer');
    arena.resources.classPower = 6;
    arena.combat.fireBasic(east);
    arena.ready();
    arena.combat.fireHeavy(east);
    expect(arena.resources.classPower).toBe(6);
    expect(arena.resources.stamina).toBeLessThan(100);
  });

  it('reports the class resource for the HUD in the class colour', () => {
    const arena = setup('iron-pagoda');
    arena.resources.classPower = 4;
    expect(arena.combat.classResourceStatus()).toEqual({
      name: 'Mettle',
      current: 4,
      maximum: 12,
      tint: classDefinition('iron-pagoda').weapon.projectileTint,
      activeSpirits: undefined,
      refusals: 0,
      refusedSlot: undefined,
    });
    expect(setup('spirit-caller').combat.classResourceStatus().activeSpirits).toBe(0);
  });
});

describe('class resource HUD text', () => {
  it('shows each cost, the resource an ability still needs, and the cooldown first', () => {
    expect(abilityCostLabel({ cost: 3 })).toBe('3');
    expect(abilityCostLabel({ cost: 6, spendsAll: true })).toBe('ALL');
    expect(abilityStatus({ remaining: 0, cost: 3, affordable: true })).toBe('READY');
    expect(abilityStatus({ remaining: 0, cost: 3, affordable: false })).toBe('NEEDS 3');
    expect(abilityStatus({ remaining: 2.26, cost: 3, affordable: false })).toBe('2.3s');
    expect(abilityCostTitle({ cost: 3 }, 'Mettle')).toBe('Costs 3 Mettle.');
    expect(abilityCostTitle({ cost: 6, spendsAll: true }, 'Spiritual Energy')).toBe(
      'Takes all Spiritual Energy (at least 6).',
    );
  });
});

describe('developer refill', () => {
  it('fills Breath and the class resource for a living Khan only', () => {
    const run = createDeveloperClassRun('iron-pagoda')!;
    run.phase = 'console';
    const tools = createDeveloperTools();
    const resources = { ...createKhanResources(), stamina: 4 };
    expect(executeDeveloperCommand(tools, run, 'refill', true, undefined, resources)).toEqual({
      cheated: true,
    });
    expect(resources).toMatchObject({ stamina: 100, classPower: 12 });
    expect(tools.log.at(-1)?.text).toBe('Breath and Mettle filled.');
    resources.classPower = 0;
    run.health = 0;
    run.khan.successionRemaining = 5;
    executeDeveloperCommand(tools, run, 'refill', true, undefined, resources);
    expect(tools.log.at(-1)?.kind).toBe('error');
    expect(resources.classPower).toBe(0);
  });
});
