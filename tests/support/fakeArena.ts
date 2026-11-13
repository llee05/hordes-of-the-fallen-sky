import type Phaser from 'phaser';
import type { VisualSettings } from '../../src/shared/visualSettings';
import { defaultVisualSettings } from '../../src/shared/visualSettings';
import { createDeveloperTools } from '../../src/game/dev/commands';
import { Enemy, Gem, Projectile } from '../../src/game/entities/actors';
import type { ArenaContext, ArenaTimers } from '../../src/game/scenes/arena/ArenaContext';
import type { CombatHost } from '../../src/game/scenes/arena/CombatSystem';
import type { EnemyDirectorHost } from '../../src/game/scenes/arena/EnemyDirector';
import { ClanDamage } from '../../src/game/scenes/arena/ClanDamage';
import { createAreaEncounter } from '../../src/game/state/areaEncounters';
import { createSpiritCallerCombatState } from '../../src/game/state/spiritCaller';
import { createLegacyCampRun as createRun } from './legacyCamp';
import type { RunState } from '../../src/game/types';

export class MockGroup<T extends { active: boolean }> {
  private items: T[] = [];
  constructor(private readonly factory: () => T) {}

  getChildren(): T[] {
    return this.items;
  }
  countActive(active = true): number {
    return this.items.filter((item) => item.active === active).length;
  }
  getFirstAlive(): T | null {
    return this.items.find((item) => item.active) ?? null;
  }
  get(x?: number, y?: number, ..._args: unknown[]): T | null {
    let item = this.items.find((i) => !i.active);
    if (!item) {
      item = this.factory();
      this.items.push(item);
    }
    if (
      x !== undefined &&
      y !== undefined &&
      'setPosition' in item &&
      typeof (item as any).setPosition === 'function'
    ) {
      (item as any).setPosition(x, y);
    }
    return item;
  }
  create(x?: number, y?: number, ..._args: unknown[]): T {
    const item = this.factory();
    this.items.push(item);
    if (
      x !== undefined &&
      y !== undefined &&
      'setPosition' in item &&
      typeof (item as any).setPosition === 'function'
    ) {
      (item as any).setPosition(x, y);
    }
    return item;
  }
}

export interface FakeArenaOptions {
  run?: RunState;
  visualSettings?: Partial<VisualSettings>;
}

export function createFakeArena(options: FakeArenaOptions = {}) {
  const run = options.run ?? createRun();
  run.phase = 'playing';
  const visualSettings: VisualSettings = {
    ...defaultVisualSettings(),
    ...(options.visualSettings ?? {}),
  };

  const timers: ArenaTimers = {
    spawnTimer: 0,
    attackTimer: 0,
    spiritCaller: createSpiritCallerCombatState(),
    dashTimer: 0,
    dashRemaining: 0,
    invulnerable: 0,
    supportTimer: 0,
    wagonTimer: 0,
    wardTimer: 0,
  };

  const enemies = new MockGroup<Enemy>(() => new Enemy({} as any, 0, 0, 'wolf'));
  const projectiles = new MockGroup<Projectile>(() => new Projectile({} as any, 0, 0, 'bolt'));
  const hostileShots = new MockGroup<Projectile>(() => new Projectile({} as any, 0, 0, 'gem'));
  const gems = new MockGroup<Gem>(() => new Gem({} as any, 0, 0, 'gem'));

  const player = new Enemy(
    {} as any,
    1000,
    1000,
    'khan',
  ) as unknown as Phaser.Physics.Arcade.Sprite;
  player.x = 1000;
  player.y = 1000;

  const camp = { x: 1200, y: 1200 } as unknown as Phaser.GameObjects.Container;

  const landscape = {
    navigation: {
      terrain: {} as any,
      isWalkable: (_x: number, _y: number) => true,
      lineClear: () => true,
      nearestWalkable: (p: { x: number; y: number }) => ({ ...p }),
    },
    world3d: undefined,
  } as any;

  const scene = {
    add: {
      image: (x = 0, y = 0) => {
        const img = new Projectile({} as any, x, y, 'shadow');
        return img;
      },
    },
    physics: {
      add: {
        overlap: () => {},
      },
    },
    cameras: {
      main: {
        x: 0,
        y: 0,
        width: 1280,
        height: 800,
        zoom: 1,
        midPoint: { x: 1000, y: 1000 },
      },
    },
    tweens: {},
    events: {
      once: (_event: string, cb: () => void) => cb(),
    },
  } as unknown as Phaser.Scene;

  const context: ArenaContext = {
    scene,
    get run() {
      return run;
    },
    timers,
    player,
    camp,
    enemies: enemies as unknown as Phaser.Physics.Arcade.Group,
    projectiles: projectiles as unknown as Phaser.Physics.Arcade.Group,
    hostileShots: hostileShots as unknown as Phaser.Physics.Arcade.Group,
    gems: gems as unknown as Phaser.Physics.Arcade.Group,
    landscape,
    spatial: {
      nearest: () => undefined,
      rebuild: () => {},
    } as any,
    audio: {
      play: () => {},
      muted: false,
    } as any,
    visualSettings,
    facing: { x: 1, y: 0 } as any,
    cameraZoom: 1,
    developerTools: createDeveloperTools(),
    effects: {
      burst: () => {},
      ring: () => {},
    } as any,
    hud: {
      refresh: () => {},
    },
  };

  const host: CombatHost = {
    playerMotion: {
      attack: () => {},
      hit: () => {},
    } as any,
    defeats: {
      show: () => {},
    } as any,
    campBarrier: {
      hit: () => ({ x: 0, y: 0 }),
    } as any,
    takeDamage: () => {},
    hurtPlayer: () => {},
    faceTarget: () => {},
  };

  const enemyDirectorHost: EnemyDirectorHost = {
    areaEncounter: createAreaEncounter(),
  };

  const clanDamage = new ClanDamage(context);

  return {
    context,
    host,
    enemyDirectorHost,
    clanDamage,
    enemies,
    projectiles,
    hostileShots,
    gems,
  };
}
