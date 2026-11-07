import { ALL_ENEMIES, SKYBREAKER } from '../../data/enemies';
import type { Enemy } from '../../entities/actors';
import { encounterEnemy } from '../../state/encounters';
import type { ArenaScene } from '../ArenaScene';
import type { ArenaContext } from './ArenaContext';
import { createArenaTimers, type ArenaTimers } from './ArenaTimers';

type VolleyArguments = Parameters<ArenaScene['shootVolley']>;

export interface SpawnOptions {
  id?: (typeof ALL_ENEMIES)[number]['id'];
  x: number;
  y: number;
  /** Base definition health; the director still applies its normal elapsed-time scaling. */
  health?: number;
}

export interface VolleyOptions {
  from: { x: number; y: number };
  target: Enemy;
  count: number;
  /** Same damage or multiplier semantics as CombatSystem.shootVolley. */
  damage: number;
  source: NonNullable<VolleyArguments[7]>;
  ancestral?: boolean;
  charged?: boolean;
  echoIndex?: number;
  ghost?: boolean;
  origin?: Enemy;
}

/** Stable development-only operations; browser tests must not invent scene timer fields. */
export interface ArenaTestHooks {
  /** Suppress only the selected timers; clears enemies by default. */
  quietBattlefield(options?: {
    timers?: readonly (keyof ArenaTimers)[];
    clearEnemies?: boolean;
  }): void;
  setTimers(timers: Partial<ArenaTimers>): void;
  spawn(options: SpawnOptions): boolean;
  volley(options: VolleyOptions): boolean;
  /** Run real scene updates at 60Hz, including a final partial frame. Menus still freeze simulation. */
  advance(seconds: number): void;
  invincible(options: { khan?: boolean; clan?: boolean }): void;
}

/** The bootstrap imports this module only in DEV. Context getters survive scene restarts. */
export function createTestHooks(
  scene: ArenaScene,
  // The single typed boundary to scene internals. Indexed access keeps TypeScript
  // checking without adding a production-facing context accessor to ArenaScene.
  arena: ArenaContext = scene['createArenaContext'](),
): ArenaTestHooks {
  const timerKeys = new Set(Object.keys(createArenaTimers()));
  const setTimers = (values: Partial<ArenaTimers>): void => {
    // Validate the entire patch before mutating anything, including JS/untyped callers.
    for (const key of Reflect.ownKeys(values)) {
      if (typeof key !== 'string' || !timerKeys.has(key))
        throw new Error(`Unknown arena timer: ${String(key)}`);
      const value: unknown = Reflect.get(values, key);
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw new Error(`Invalid arena timer value: ${key}`);
    }
    Object.assign(arena.timers, values);
  };
  return {
    setTimers,
    quietBattlefield({
      timers = ['spawnTimer', 'attackTimer', 'hazardTimer'],
      clearEnemies = true,
    } = {}) {
      setTimers(Object.fromEntries(timers.map((key) => [key, 999])));
      if (clearEnemies)
        for (const enemy of arena.enemies.getChildren()) (enemy as Enemy).disableBody(true, true);
    },
    spawn({ id, x, y, health }) {
      const definition =
        id === undefined
          ? health === undefined
            ? undefined
            : encounterEnemy(arena.run).definition
          : [...ALL_ENEMIES, SKYBREAKER].find((enemy) => enemy.id === id);
      if (id !== undefined && !definition) throw new Error(`Unknown enemy: ${id}`);
      return scene.spawnEnemy(
        definition && health !== undefined ? { ...definition, health } : definition,
        { point: { x, y } },
      );
    },
    volley({ from, target, count, damage, source, ancestral, charged, echoIndex, ghost, origin }) {
      return scene.shootVolley(
        from.x,
        from.y,
        target,
        count,
        damage,
        ancestral,
        charged,
        source,
        echoIndex,
        ghost,
        origin,
      );
    },
    advance(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0)
        throw new Error('Advance requires finite, nonnegative seconds');
      const frames = Math.floor(seconds * 60);
      for (let frame = 0; frame < frames; frame++) scene.update(0, 1000 / 60);
      const remainder = seconds - frames / 60;
      if (remainder > 1e-10) scene.update(0, remainder * 1000);
    },
    invincible({ khan, clan }) {
      const tools = arena.developerTools;
      if (!tools) throw new Error('Development tools are unavailable');
      if (khan !== undefined) tools.invincible = khan;
      if (clan !== undefined) tools.clanInvincible = clan;
    },
  };
}

declare global {
  interface Window {
    /** Only installed by development bootstrap; unavailable in production. */
    __gloam: { game: Phaser.Game; scene: ArenaScene; hooks: ArenaTestHooks };
  }
}
