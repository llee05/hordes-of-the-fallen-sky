import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('../support/mockPhaser')).mockPhaser());

import { effectAmount } from '../../src/shared/visualSettings';
import { ALL_ENEMIES } from '../../src/game/data/enemies';
import type { Enemy } from '../../src/game/entities/actors';
import { CombatSystem } from '../../src/game/scenes/arena/CombatSystem';
import { EnemyDirector } from '../../src/game/scenes/arena/EnemyDirector';
import { createFakeArena } from '../support/fakeArena';

describe('Arena CombatSystem with fake ArenaContext', () => {
  it('charged arrows hit a charger and pooled arrows clear their special effect', () => {
    const arena = createFakeArena();
    const enemyDirector = new EnemyDirector(arena.context, arena.enemyDirectorHost);
    const combat = new CombatSystem(arena.context, arena.host, enemyDirector, arena.clanDamage);

    const ghostRiderDef = ALL_ENEMIES.find((e) => e.id === 'ghost-rider')!;
    const e = arena.enemies.create() as Enemy;
    enemyDirector.initialize(
      e,
      { ...ghostRiderDef, health: 10000 },
      arena.context.player.x + 120,
      arena.context.player.y,
    );
    e.health = e.maxHealth = 10000;
    e.tactics.phase = 'charge';
    e.tactics.remaining = 0.5;
    e.tactics.direction = { x: -1, y: 0 };
    e.tactics.aim = { x: arena.context.player.x, y: arena.context.player.y };

    combat.shootVolley(arena.context.player.x, arena.context.player.y, e, 1, 1, false, true);
    const arrow = arena.projectiles.getFirstAlive()!;
    combat.hitEnemy(arrow, e);

    const pin = { remaining: e.pinned, phase: e.tactics.phase, health: e.health };
    for (const b of arena.projectiles.getChildren()) b.disableBody(true, true);

    combat.shootVolley(arena.context.player.x, arena.context.player.y, e, 1, 1);
    const reused = arena.projectiles.getFirstAlive()!;

    // Copying simulation state must remain safe for purchase previews.
    const copy = structuredClone(arena.context.run);

    expect(pin.remaining).toBe(0);
    expect(pin.phase).toBe('charge');
    expect(pin.health).toBeCloseTo(10000 - 16 * 1.35);
    expect({
      pin,
      reused: reused === arrow,
      pins: reused.pins,
      plainDamage: reused.damage,
      clone: !!copy.combat,
    }).toMatchObject({
      reused: true,
      pins: false,
      plainDamage: 16,
      clone: true,
    });
  });

  it('keeps hostile shot collision size invariant across projectile contrast settings', () => {
    const arena = createFakeArena();
    const enemyDirector = new EnemyDirector(arena.context, arena.enemyDirectorHost);
    const combat = new CombatSystem(arena.context, arena.host, enemyDirector, arena.clanDamage);

    const seerDef = ALL_ENEMIES.find((e) => e.id === 'hollow-seer')!;
    const enemy = arena.enemies.create() as Enemy;
    enemyDirector.initialize(enemy, seerDef, arena.context.player.x + 300, arena.context.player.y);

    // Standard contrast
    const defaultShot = combat.fireHostile(enemy, Math.PI)!;
    expect(defaultShot).toBeDefined();
    const defaultRadius = defaultShot.body!.radius * defaultShot.scaleX;
    expect(defaultRadius).toBeCloseTo(5.4);
    expect(defaultShot.damage).toBe(seerDef.damage);
    expect(defaultShot.scaleX).toBe(1.1);

    // Deactivate shot and switch to high contrast
    defaultShot.disableBody(true, true);
    arena.context.visualSettings.projectileContrast = 'high';

    const contrastShot = combat.fireHostile(enemy, Math.PI)!;
    expect(contrastShot).toBeDefined();
    const contrastRadius = contrastShot.body!.radius * contrastShot.scaleX;
    expect(contrastRadius).toBeCloseTo(defaultRadius);
    expect(contrastShot.damage).toBe(seerDef.damage);
    expect(contrastShot.scaleX).toBe(1.45);

    // Effect density setting
    arena.context.visualSettings.effectDensity = 'minimal';
    expect(effectAmount(arena.context.visualSettings)).toBe(0);
  });
});
