import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('../support/mockPhaser')).mockPhaser());

import { GAME } from '../../src/game/config';
import { ALL_ENEMIES } from '../../src/game/data/enemies';
import { karakorumWorldSite } from '../../src/game/data/karakorum';
import { EnemyDirector } from '../../src/game/scenes/arena/EnemyDirector';
import { FieldObjectiveDirector } from '../../src/game/scenes/arena/FieldObjectiveDirector';
import { PrologueDirector } from '../../src/game/scenes/arena/PrologueDirector';
import { advanceClan, beginMigration, canMigrate } from '../../src/game/state/clan';
import { availableDestinations } from '../../src/game/state/journey';
import { damageKhan } from '../../src/game/state/khan';
import { createPrologueRun, skipPrologue } from '../../src/game/state/prologue';
import { createRun } from '../../src/game/state/run';
import { createFakeArena } from '../support/fakeArena';

describe('prologue-only core-loop guards', () => {
  it('freezes the economy before the camp exists and leaves normal runs unchanged', () => {
    const run = createPrologueRun();
    run.phase = 'playing';
    const before = { ...run.clan };
    expect(advanceClan(run, 30)).toBeUndefined();
    expect(run.clan.stageTime).toBe(before.stageTime);
    expect(run.clan.food).toBe(before.food);
    expect(run.clan.pasture).toBe(before.pasture);

    skipPrologue(run);
    advanceClan(run, 1);
    expect(run.clan.stageTime).toBe(1);

    const normal = createRun();
    normal.phase = 'playing';
    advanceClan(normal, 1);
    expect(normal.clan.stageTime).toBe(1);
  });

  it('opens only Orkhon Valley, then releases the destination lock after first arrival', () => {
    const run = createPrologueRun();
    run.phase = 'playing';
    expect(canMigrate(run)).toBe(false);
    expect(availableDestinations(run)).toEqual([]);
    skipPrologue(run);
    expect(canMigrate(run)).toBe(true);
    expect(availableDestinations(run).map(({ id }) => id)).toEqual(['orkhon-valley']);

    run.phase = 'route';
    expect(beginMigration(run, 'river', 'orkhon-valley')).toBe(true);
    run.phase = 'playing';
    expect(advanceClan(run, 300)).toBe('arrived');
    expect(run.legacy.crossings).toHaveLength(1);
    expect(availableDestinations(run)).toHaveLength(7);
    expect(availableDestinations(run).map(({ id }) => id)).not.toContain('karakorum');
    expect(canMigrate(run)).toBe(false);
  });

  it('holds ambient spawns and automatic field objectives until completion', () => {
    const run = createPrologueRun();
    run.phase = 'playing';
    run.clan.stageTime = GAME.field.firstAt + 10;
    const arena = createFakeArena({ run });
    const enemies = new EnemyDirector(arena.context, arena.enemyDirectorHost);
    const objectives = new FieldObjectiveDirector(arena.context, enemies);
    objectives.create();
    arena.context.timers.spawnTimer = 0;
    enemies.tickSpawns(1);
    objectives.update(1);
    expect(arena.context.timers.spawnTimer).toBe(0);
    expect(arena.enemies.countActive(true)).toBe(0);
    expect(run.field.objective).toBeUndefined();

    skipPrologue(run);
    enemies.tickSpawns(1);
    objectives.update(1);
    expect(arena.context.timers.spawnTimer).toBeGreaterThan(0);
    expect(arena.enemies.countActive(true)).toBeGreaterThan(0);
    expect(run.field.objective).toBeDefined();
  });

  it('lets scripted spawns explicitly anchor on the Khan', () => {
    const arena = createFakeArena();
    const director = new EnemyDirector(arena.context, arena.enemyDirectorHost);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      expect(director.spawn(ALL_ENEMIES[0], { anchor: 'khan', angle: 0 })).toBe(true);
      const khanAnchored = arena.enemies.getFirstAlive()!;
      expect(khanAnchored.y).toBe(arena.context.player.y);
      khanAnchored.disableBody(true, true);
      expect(director.spawn(ALL_ENEMIES[0], { anchor: 'camp', angle: 0 })).toBe(true);
      expect(arena.enemies.getFirstAlive()!.y).toBe(arena.context.camp.y);
    } finally {
      random.mockRestore();
    }
  });

  it('drives reach/hold markers and notifies the scene when the camp is established', () => {
    const run = createPrologueRun();
    const arena = createFakeArena({ run });
    const established = vi.fn();
    const completed = vi.fn();
    const director = new PrologueDirector(arena.context, {
      campEstablished: established,
      completed,
    });
    director.create();

    Object.assign(arena.context.player, karakorumWorldSite('gate'));
    director.update(0.1);
    expect(run.prologue!.beat).toBe(1);
    director.update(1.5);
    expect(run.prologue!.beat).toBe(2);
    expect(run.clan.message).toContain('Gate captain');

    Object.assign(arena.context.player, karakorumWorldSite('yard'));
    director.update(0.1);
    expect(run.prologue!.stage).toBe('return');
    expect(director.markerPoint()).toEqual(karakorumWorldSite('campSite'));
    Object.assign(arena.context.player, karakorumWorldSite('campSite'));
    director.update(0.1);
    expect(established).toHaveBeenCalledOnce();
    expect(completed).toHaveBeenCalledOnce();
  });

  it('knocks the Khan down without succession only while the prologue is active', () => {
    const run = createPrologueRun();
    run.phase = 'playing';
    expect(damageKhan(run, 100000)).toBe('knocked-down');
    expect(run.health).toBe(run.stats.maxHealth * GAME.prologue.knockdownHealth);
    expect(run.khan).toEqual({ generation: 1, successionRemaining: 0 });

    const normal = createRun();
    normal.phase = 'playing';
    expect(damageKhan(normal, 100000)).toBe('fallen');
    expect(normal.khan.successionRemaining).toBe(GAME.khan.successionDelay);
  });
});
