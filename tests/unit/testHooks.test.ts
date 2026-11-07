import { describe, expect, it, vi } from 'vitest';
import type { ArenaScene } from '../../src/game/scenes/ArenaScene';
import type { ArenaContext } from '../../src/game/scenes/arena/ArenaContext';
import { createArenaTimers } from '../../src/game/scenes/arena/ArenaTimers';
import { createTestHooks } from '../../src/game/scenes/arena/testHooks';

function fixture() {
  const timers = createArenaTimers();
  const tools = { invincible: false, clanInvincible: false };
  const enemy = { disableBody: vi.fn() };
  const scene = {
    update: vi.fn((_time: number, _delta: number) => {}),
    spawnEnemy: vi.fn(() => true),
    shootVolley: vi.fn(() => true),
  };
  const hooks = createTestHooks(
    scene as unknown as ArenaScene,
    {
      timers,
      developerTools: tools,
      enemies: { getChildren: () => [enemy] },
    } as unknown as ArenaContext,
  );
  return { hooks, timers, tools, scene, enemy };
}

describe('development arena hooks', () => {
  it('validates the complete timer patch before writing the live record', () => {
    const { hooks, timers } = fixture();
    hooks.setTimers({ spawnTimer: 17, invulnerable: 4 });
    expect(timers.spawnTimer).toBe(17);
    expect(timers.invulnerable).toBe(4);
    expect(() => hooks.setTimers({ spawnTimer: 2, renamedTimer: 99 } as never)).toThrow(
      'Unknown arena timer',
    );
    expect(timers.spawnTimer).toBe(17);
    expect(() => hooks.setTimers({ [Symbol('timer')]: 1 } as never)).toThrow('Unknown arena timer');
    expect(() => hooks.setTimers({ attackTimer: NaN })).toThrow('Invalid arena timer');
    // @ts-expect-error Unknown timer names must also fail compilation.
    const invalid: Parameters<typeof hooks.setTimers>[0] = { renamedTimer: 1 };
    void invalid;
  });

  it('quiets selected timers without silently changing actor or protection state', () => {
    const { hooks, timers, enemy, tools } = fixture();
    hooks.quietBattlefield({ timers: ['spawnTimer', 'attackTimer'], clearEnemies: false });
    expect(timers).toEqual({ ...createArenaTimers(), spawnTimer: 999, attackTimer: 999 });
    expect(enemy.disableBody).not.toHaveBeenCalled();
    hooks.quietBattlefield({ clearEnemies: true });
    expect(enemy.disableBody).toHaveBeenCalledWith(true, true);
    hooks.invincible({ clan: true });
    expect(tools).toEqual({ invincible: false, clanInvincible: true });
  });

  it('advances through bounded real update calls including partial frames', () => {
    const { hooks, scene } = fixture();
    hooks.advance(0.04);
    expect(scene.update.mock.calls.map((args) => args[1])).toEqual([
      1000 / 60,
      1000 / 60,
      (0.04 - 2 / 60) * 1000,
    ]);
    expect(() => hooks.advance(-1)).toThrow();
    expect(() => hooks.advance(Infinity)).toThrow();
    expect(scene.update).toHaveBeenCalledTimes(3);
  });

  it('forwards named spawn and volley options without losing optional arguments', () => {
    const { hooks, scene } = fixture();
    expect(hooks.spawn({ id: 'wisp', x: 10, y: 20, health: 77 })).toBe(true);
    expect(scene.spawnEnemy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wisp', health: 77 }),
      { point: { x: 10, y: 20 } },
    );
    expect(() => hooks.spawn({ id: 'missing', x: 0, y: 0 })).toThrow('Unknown enemy');
    const target = { x: 30, y: 40 } as Parameters<typeof hooks.volley>[0]['target'];
    expect(
      hooks.volley({
        from: { x: 10, y: 20 },
        target,
        count: 2,
        damage: 5,
        source: 'wagon',
        ghost: true,
      }),
    ).toBe(true);
    expect(scene.shootVolley).toHaveBeenCalledWith(
      10,
      20,
      target,
      2,
      5,
      undefined,
      undefined,
      'wagon',
      undefined,
      true,
      undefined,
    );
  });
});
