import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('../support/mockPhaser')).mockPhaser());

import { GAME } from '../../src/game/config';
import { SKYBREAKER } from '../../src/game/data/enemies';
import { EnemyDirector } from '../../src/game/scenes/arena/EnemyDirector';
import { createFakeArena } from '../support/fakeArena';

describe('EnemyDirector pool, retry limits and boss arrival', () => {
  it('enforces pool cap, retry delays on rejection, and deferred final boss arrival', () => {
    const arena = createFakeArena();
    const director = new EnemyDirector(arena.context, arena.enemyDirectorHost);

    // Fill the pool to maxEnemies (350)
    for (let i = 0; i < 400; i++) director.spawn();
    const cap = arena.enemies.countActive(true);
    const pool = arena.enemies.getChildren().length;
    expect(cap).toBe(GAME.maxEnemies);
    expect(pool).toBe(GAME.maxEnemies);

    // Spawning when full returns false
    const rejected = director.spawn();
    expect(rejected).toBe(false);

    // tickSpawns when full sets retry timer to 0.2
    arena.context.run.clan.stageTime = 12;
    arena.context.timers.spawnTimer = 0;
    director.tickSpawns(0.016);
    expect(arena.context.timers.spawnTimer).toBe(0.2);

    // Free one slot
    const reusable = arena.enemies.getFirstAlive()!;
    reusable.disableBody(true, true);
    expect(arena.enemies.countActive(true)).toBe(GAME.maxEnemies - 1);

    // tickSpawns replenishes to 350 and sets opening delay to 2
    arena.context.timers.spawnTimer = 0;
    director.tickSpawns(0.016);
    expect(arena.enemies.countActive(true)).toBe(GAME.maxEnemies);
    expect(arena.context.timers.spawnTimer).toBe(2);

    // Final stand boss arrival deferred when pool full
    arena.context.run.clan.stage = 'final';
    arena.context.run.clan.stageTime = 20;
    arena.context.run.clan.finalBossSpawned = false;

    director.tickFinalBoss();
    expect(arena.context.run.clan.finalBossSpawned).toBe(false);
    expect(director.boss).toBeUndefined();

    // Free a slot and tick boss again
    arena.enemies.getFirstAlive()!.disableBody(true, true);
    director.tickFinalBoss();
    expect(arena.context.run.clan.finalBossSpawned).toBe(true);
    expect(director.boss).toBeDefined();
    expect(director.boss?.definition.id).toBe(SKYBREAKER.id);
  });
});
