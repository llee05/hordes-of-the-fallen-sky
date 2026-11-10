import { describe, expect, it, vi } from 'vitest';
import type { ArenaScene } from '../../src/game/scenes/ArenaScene';
import type { ArenaContext } from '../../src/game/scenes/arena/ArenaContext';
import { createArenaTimers } from '../../src/game/scenes/arena/ArenaTimers';
import { createTestHooks } from '../../src/game/scenes/arena/testHooks';
import { createRun } from '../../src/game/state/run';

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

  it('places a seeded crowd in a ring around the Khan, retrying unwalkable points', () => {
    const place = (seed: number, accept: (calls: number) => boolean) => {
      const points: { x: number; y: number }[] = [];
      const scene = {
        spawnEnemy: vi.fn((definition: { health: number }, { point }) => {
          expect(definition.health).toBe(5000);
          if (!accept(points.length)) return false;
          points.push(point);
          return true;
        }),
      };
      const hooks = createTestHooks(
        scene as unknown as ArenaScene,
        { player: { x: 1000, y: 2000 }, run: createRun() } as unknown as ArenaContext,
      );
      const placed = hooks.crowd({ count: 40, seed, minRadius: 100, maxRadius: 300, health: 5000 });
      return { placed, points, attempts: scene.spawnEnemy.mock.calls.length };
    };
    const first = place(3, () => true);
    expect(first.placed).toBe(40);
    expect(first.attempts).toBe(40);
    for (const { x, y } of first.points) {
      const distance = Math.hypot(x - 1000, y - 2000);
      expect(distance).toBeGreaterThanOrEqual(100);
      expect(distance).toBeLessThanOrEqual(300);
    }
    expect(place(3, () => true).points).toEqual(first.points);
    expect(place(4, () => true).points).not.toEqual(first.points);
    let attempt = 0;
    const picky = place(3, () => attempt++ % 2 === 0);
    expect(picky.placed).toBe(40);
    expect(picky.attempts).toBe(79);
    expect(place(3, () => false)).toMatchObject({ placed: 0, attempts: 480 });
    const hooks = createTestHooks({} as ArenaScene, {} as ArenaContext);
    expect(() => hooks.crowd({ count: -1 })).toThrow('whole number');
    expect(() => hooks.crowd({ count: 1.5 })).toThrow('whole number');
  });

  it('freezes scene steps without stopping rendering and restores Phaser stepping', () => {
    class Systems {
      steps = 0;
      step(): void {
        this.steps += 1;
      }
    }
    const sys = new Systems();
    const world = { setRenderScale: vi.fn(), qualityTime: 0, renderScale: 0.7 };
    const hooks = createTestHooks(
      { sys } as unknown as ArenaScene,
      { landscape: { world3d: world } } as unknown as ArenaContext,
    );
    hooks.freezeVisuals(true);
    sys.step();
    expect(sys.steps).toBe(0);
    expect(world.setRenderScale).toHaveBeenCalledWith(1);
    expect(world.qualityTime).toBe(Infinity);
    hooks.freezeVisuals(true);
    hooks.freezeVisuals(false);
    expect(Object.prototype.hasOwnProperty.call(sys, 'step')).toBe(false);
    sys.step();
    expect(sys.steps).toBe(1);
    expect(world.qualityTime).toBeLessThan(Infinity);
    expect(() => hooks.freezeVisuals('on' as never)).toThrow('true or false');
  });

  describe('scenarios and camera', () => {
    function arenaFixture() {
      const listeners = new Map<string, (() => void)[]>();
      const events = {
        once: (name: string, listener: () => void) =>
          listeners.set(name, [...(listeners.get(name) ?? []), listener]),
        emit: (name: string) => {
          const queued = listeners.get(name) ?? [];
          listeners.delete(name);
          for (const listener of queued) listener();
        },
      };
      const run = createRun();
      run.phase = 'playing';
      const timers = createArenaTimers();
      const tools = { invincible: false, clanInvincible: false };
      const enemies: {
        active: boolean;
        x: number;
        y: number;
        elite: boolean;
        definition: { id: string };
      }[] = [];
      const group = (items: object[]) => ({
        getChildren: () => items,
        countActive: () => items.length,
      });
      const camera = {
        midPoint: { x: 2600, y: 2700 },
        zoom: 1,
        _follow: {} as object | null,
        stopFollow: vi.fn(function (this: { _follow: unknown }) {
          this._follow = null;
        }),
        centerOn: vi.fn(function (
          this: { midPoint: { x: number; y: number } },
          x: number,
          y: number,
        ) {
          this.midPoint = { x, y };
        }),
        startFollow: vi.fn(function (this: { _follow: unknown }, target: unknown) {
          this._follow = target;
          return this;
        }),
        setFollowOffset: vi.fn(),
      };
      const randoms: number[] = [];
      const scene = {
        sys: { step: vi.fn() },
        events,
        cameras: { main: camera },
        update: vi.fn(),
        applyCameraZoom: vi.fn((zoom: number) => (camera.zoom = Math.min(zoom, 1.6))),
        spawnEnemy: vi.fn(
          (definition: { id: string }, { point }: { point: { x: number; y: number } }) => {
            enemies.push({ active: true, ...point, elite: false, definition });
            return true;
          },
        ),
        scene: {
          restart: vi.fn(() => {
            events.emit('start');
            randoms.push(Math.random());
            events.emit('create');
          }),
        },
      };
      const player = { active: true, x: 2600, y: 2700 };
      const hooks = createTestHooks(
        scene as unknown as ArenaScene,
        {
          run,
          timers,
          developerTools: tools,
          player,
          enemies: group(enemies),
          projectiles: group([]),
          hostileShots: group([]),
          gems: group([]),
          landscape: {},
        } as unknown as ArenaContext,
      );
      return { hooks, scene, run, timers, tools, camera, randoms, player };
    }

    it('restarts at the place, seeds the start and applies options before resolving', async () => {
      const random = Math.random;
      try {
        const options = {
          place: 'orkhon-valley',
          seed: 5,
          elapsed: 600,
          enemies: 12,
          settle: 0.05,
        } as const;
        const first = arenaFixture();
        const state = await first.hooks.loadScenario(options);
        expect(first.scene.scene.restart).toHaveBeenCalledWith({
          developerLevel: 'place:orkhon-valley',
        });
        expect(first.run.elapsed).toBe(600);
        expect(first.timers.spawnTimer).toBe(999);
        expect(first.tools).toEqual({ invincible: true, clanInvincible: true });
        expect(first.scene.update).toHaveBeenCalledTimes(3);
        expect(state).toMatchObject({ frozen: true, elapsed: 600, enemies: { total: 12 } });
        // The fixture step stands in for Phaser's prototype step; freezing shadows it.
        expect(Object.prototype.hasOwnProperty.call(first.scene.sys, 'step')).toBe(true);
        const second = arenaFixture();
        await second.hooks.loadScenario(options);
        expect(second.randoms).toEqual(first.randoms);
        expect(second.hooks.getState().enemies).toEqual(first.hooks.getState().enemies);
        const other = arenaFixture();
        await other.hooks.loadScenario({ ...options, seed: 6 });
        expect(other.randoms).not.toEqual(first.randoms);
      } finally {
        Math.random = random;
      }
    });

    it('validates a scenario before restarting the scene', () => {
      const { hooks, scene } = arenaFixture();
      expect(() => hooks.loadScenario({ place: 'nowhere' as never })).toThrow('Unknown place');
      expect(scene.scene.restart).not.toHaveBeenCalled();
    });

    it('centres, zooms and re-follows the main camera', () => {
      const { hooks, camera, player } = arenaFixture();
      expect(hooks.setCamera({ x: 4000, y: 3800, zoom: 2 })).toEqual({
        x: 4000,
        y: 3800,
        zoom: 1.6,
        following: false,
      });
      expect(camera.stopFollow).toHaveBeenCalled();
      expect(hooks.setCamera({ follow: true })).toMatchObject({ following: true });
      expect(camera.startFollow).toHaveBeenCalledWith(player, true, 0.09, 0.09);
      expect(() => hooks.setCamera({ x: 1 })).toThrow('together');
    });
  });

  it('resolves a capture after unchanged frames and rejects one that never settles', async () => {
    vi.useFakeTimers();
    try {
      const listeners = new Set<() => void>();
      const camera = { midPoint: { x: 0, y: 0 }, zoom: 1, _follow: null };
      const world = { pendingChunks: 2, renderScale: 1, focusHeight: 10 };
      const hooks = createTestHooks(
        {
          cameras: { main: camera },
          game: {
            events: {
              on: (_: string, listener: () => void) => listeners.add(listener),
              off: (_: string, listener: () => void) => listeners.delete(listener),
            },
          },
        } as unknown as ArenaScene,
        { landscape: { world3d: world } } as unknown as ArenaContext,
      );
      const render = async (count: number) => {
        await Promise.resolve();
        for (let frame = 0; frame < count; frame++)
          for (const listener of [...listeners]) listener();
      };
      const capture = hooks.captureScene({ frames: 2 });
      await render(3);
      world.pendingChunks = 0;
      await render(3);
      await expect(capture).resolves.toMatchObject({ frames: 6, camera: { x: 0, zoom: 1 } });
      expect(listeners.size).toBe(0);
      const moving = hooks.captureScene({ timeout: 50 });
      const rejected = expect(moving).rejects.toThrow('did not settle');
      await render(1);
      camera.midPoint.x = 5;
      await render(1);
      await vi.advanceTimersByTimeAsync(60);
      await rejected;
      expect(listeners.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
