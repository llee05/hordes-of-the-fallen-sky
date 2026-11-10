import { describe, expect, it } from 'vitest';
import {
  normalizeCapture,
  normalizeScenario,
  sameView,
  snapshotGameState,
  validateCamera,
  type GameStateInput,
} from '../../src/game/dev/gameControls';
import { createRun } from '../../src/game/state/run';

function input(overrides: Partial<GameStateInput> = {}): GameStateInput {
  const run = createRun();
  run.phase = 'playing';
  run.elapsed = 12.34567;
  return {
    run,
    player: { active: true, x: 2600.04, y: 2700.06 },
    enemies: [
      { active: true, x: 10.04, y: 20, elite: false, definition: { id: 'wisp' } },
      { active: true, x: 30, y: 40, elite: true, definition: { id: 'wisp' } },
      { active: false, x: 0, y: 0, elite: false, definition: { id: 'wisp' } },
      { active: true, x: 50, y: 60, elite: false, definition: { id: 'ash-wolf' } },
    ],
    projectiles: [
      { active: true, x: 1, y: 2 },
      { active: false, x: 3, y: 4 },
    ],
    hostileShots: [{ active: true, x: 5, y: 6 }],
    gems: [
      { active: true, x: 0, y: 0 },
      { active: false, x: 0, y: 0 },
    ],
    camera: { x: 2600, y: 2700, zoom: 1, following: true, angle: 42 },
    frozen: true,
    ...overrides,
  };
}

describe('game-control state snapshot', () => {
  it('groups active enemies and shots into a plain JSON snapshot', () => {
    const source = input();
    const state = snapshotGameState(source);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(state).toMatchObject({
      phase: 'playing',
      place: { id: source.run.clan.locationId },
      elapsed: 12.346,
      frozen: true,
      khan: { x: 2600, y: 2700.1, alive: true, maxHealth: source.run.stats.maxHealth },
      enemies: {
        total: 3,
        byType: {
          wisp: {
            count: 2,
            elites: 1,
            positions: [
              [10, 20],
              [30, 40],
            ],
          },
          'ash-wolf': { count: 1, elites: 0, positions: [[50, 60]] },
        },
      },
      projectiles: {
        player: { count: 1, positions: [[1, 2]] },
        hostile: { count: 1, positions: [[5, 6]] },
      },
      gems: 1,
      camera: { zoom: 1, following: true, angle: 42 },
      upgrades: { level: source.run.level, nextLevelXp: source.run.nextLevelXp },
    });
    expect(state.place.name).not.toBe(state.place.id);
    expect(Object.keys(state.clan)).toEqual(
      expect.arrayContaining(['food', 'materials', 'spirit', 'population', 'herd', 'integrity']),
    );
  });

  it('copies nested run data instead of exposing live references', () => {
    const source = input();
    const state = snapshotGameState(source);
    state.upgrades.stats.damage = -1;
    state.camera.zoom = 9;
    if (state.clan.camp) state.clan.camp.slots.push(null);
    expect(source.run.stats.damage).not.toBe(-1);
    expect(source.camera.zoom).toBe(1);
    expect(source.run.clan.nomadicCamp?.slots.length).not.toBe(state.clan.camp?.slots.length);
  });

  it('reports a fallen Khan as not alive', () => {
    const source = input();
    source.run.health = 0;
    expect(snapshotGameState(source).khan.alive).toBe(false);
  });
});

describe('game-control argument validation', () => {
  it('fills scenario defaults and keeps the checkpoint elapsed time when omitted', () => {
    expect(normalizeScenario({ place: 'orkhon-valley' }, 350)).toEqual({
      place: 'orkhon-valley',
      seed: 1,
      enemies: 0,
      minRadius: 240,
      maxRadius: 1400,
      arrivals: false,
      protect: true,
      settle: 0,
      freeze: true,
    });
    expect(
      normalizeScenario({ place: 'otgontenger', seed: 9, elapsed: 600, enemies: 200 }, 350),
    ).toMatchObject({ seed: 9, elapsed: 600, enemies: 200 });
  });

  it('rejects unknown places, keys and out-of-range values before anything changes', () => {
    const bad: [unknown, string][] = [
      [undefined, 'required'],
      [{ place: 'atlantis' }, 'Unknown place'],
      [{ place: 'river' }, 'Unknown place'],
      [{ place: 'otgontenger', wave: 10 }, 'Unknown scenario option: wave'],
      [{ place: 'otgontenger', seed: -1 }, 'seed'],
      [{ place: 'otgontenger', seed: 1.5 }, 'seed'],
      [{ place: 'otgontenger', enemies: 351 }, 'enemies'],
      [{ place: 'otgontenger', elapsed: -1 }, 'elapsed'],
      [{ place: 'otgontenger', elapsed: NaN }, 'elapsed'],
      [{ place: 'otgontenger', minRadius: 500, maxRadius: 100 }, 'radii'],
      [{ place: 'otgontenger', settle: 61 }, 'settle'],
      [{ place: 'otgontenger', freeze: 'yes' }, 'freeze'],
    ];
    for (const [options, message] of bad)
      expect(() => normalizeScenario(options, 350), JSON.stringify(options)).toThrow(message);
  });

  it('accepts complete camera targets, zoom and follow, and rejects ambiguous ones', () => {
    expect(validateCamera({ x: 10, y: 20, zoom: 1.2 })).toEqual({ x: 10, y: 20, zoom: 1.2 });
    expect(validateCamera({ follow: true })).toEqual({ follow: true });
    expect(validateCamera({ zoom: 0.8 })).toEqual({ zoom: 0.8 });
    expect(() => validateCamera({ x: 10 })).toThrow('together');
    expect(() => validateCamera({ x: 1, y: 2, follow: true })).toThrow('follow');
    expect(() => validateCamera({ zoom: 0 })).toThrow('positive');
    expect(() => validateCamera({ x: Infinity, y: 0 })).toThrow('finite');
    expect(() => validateCamera({ pitch: 30 })).toThrow('Unknown camera option');
  });

  it('defaults capture settling and bounds its options', () => {
    expect(normalizeCapture()).toEqual({ frames: 3, timeout: 15000 });
    expect(normalizeCapture({ frames: 5, timeout: 100 })).toEqual({ frames: 5, timeout: 100 });
    expect(() => normalizeCapture({ frames: 0 })).toThrow('frames');
    expect(() => normalizeCapture({ timeout: -1 })).toThrow('timeout');
    expect(() => normalizeCapture({ delay: 1 })).toThrow('Unknown capture option');
  });

  it('treats a view as settled only without pending terrain and sub-pixel movement', () => {
    const view = { x: 1, y: 2, zoom: 1, focus: 30, scale: 1, pending: 0 };
    expect(sameView(view, { ...view, x: 1.004 })).toBe(true);
    expect(sameView(view, { ...view, x: 1.5 })).toBe(false);
    expect(sameView(view, { ...view, focus: undefined })).toBe(false);
    expect(sameView(view, { ...view, pending: 2 })).toBe(false);
    expect(sameView(view, { ...view, scale: 0.85 })).toBe(false);
  });
});
