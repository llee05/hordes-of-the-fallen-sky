import { describe, expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { composedRegion } from '../../src/game/data/worldRegions';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { routeDue, routeInterval, type EnemyRoute } from '../../src/game/systems/enemyRoutes';
import { TerrainNavigation } from '../../src/game/terrain/TerrainNavigation';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';

const { nearRange, farRange, midInterval, farInterval, arrival } = GAME.enemyRoutes;
const khan = { x: 0, y: 0 };
const camp = { x: 900, y: 0 };

describe('staggered enemy route planning', () => {
  it('plans close enemies every frame and distant ones less often', () => {
    expect(routeInterval(0)).toBe(1);
    expect(routeInterval(nearRange - 1)).toBe(1);
    expect(routeInterval(nearRange)).toBe(midInterval);
    expect(routeInterval(farRange - 1)).toBe(midInterval);
    expect(routeInterval(farRange)).toBe(farInterval);
    expect(routeInterval(Infinity)).toBe(farInterval);
    expect(midInterval).toBeGreaterThan(1);
    expect(farInterval).toBeGreaterThanOrEqual(midInterval);
  });

  it('refreshes every enemy exactly once in any window of its interval', () => {
    for (const distance of [nearRange - 10, nearRange + 10, farRange + 10]) {
      const interval = routeInterval(distance);
      for (let slot = 0; slot < GAME.maxEnemies; slot++) {
        const route: EnemyRoute = { x: 500, y: 500, target: khan };
        for (let start = 0; start < 13; start++) {
          let refreshes = 0;
          for (let frame = start; frame < start + interval; frame++)
            if (routeDue(route, frame, slot, distance, khan, { x: 0, y: 900 })) refreshes++;
          expect(refreshes).toBe(1);
        }
      }
    }
  });

  it('spreads distant refreshes across the crowd', () => {
    const route: EnemyRoute = { x: 500, y: 500, target: khan };
    const due = Array.from({ length: GAME.maxEnemies }, (_, slot) =>
      routeDue(route, 7, slot, farRange + 1, khan, { x: 0, y: 900 }),
    ).filter(Boolean).length;
    expect(due).toBeLessThanOrEqual(Math.ceil(GAME.maxEnemies / farInterval));
  });

  it('switches to every-frame planning as an enemy closes in', () => {
    const route: EnemyRoute = { x: 500, y: 500, target: khan };
    const position = { x: 0, y: 900 };
    const far = Array.from({ length: farInterval }, (_, frame) =>
      routeDue(route, frame, 3, farRange + 50, khan, position),
    );
    expect(far.filter(Boolean)).toHaveLength(1);
    const near = Array.from({ length: farInterval }, (_, frame) =>
      routeDue(route, frame, 3, nearRange - 50, khan, position),
    );
    expect(near.every(Boolean)).toBe(true);
  });

  it('re-plans at once with no route, a new target, or on arrival', () => {
    const position = { x: 0, y: 900 };
    const frame = 1;
    const slot = 1; // (1 + 1) % interval is never 0 for the distant tiers.
    expect(routeDue(undefined, frame, slot, farRange + 1, khan, position)).toBe(true);
    const route: EnemyRoute = { x: 500, y: 500, target: khan };
    expect(routeDue(route, frame, slot, farRange + 1, khan, position)).toBe(false);
    expect(routeDue(route, frame, slot, farRange + 1, camp, position)).toBe(true);
    // Equal coordinates are not the same target; the route follows identity.
    expect(routeDue(route, frame, slot, farRange + 1, { ...khan }, position)).toBe(true);
    const reached = { x: 500, y: 500 + arrival };
    expect(routeDue(route, frame, slot, farRange + 1, khan, reached)).toBe(true);
    expect(routeDue(route, frame, slot, farRange + 1, khan, { x: 500, y: 501 + arrival })).toBe(
      false,
    );
  });
});

describe('staggered routes on real terrain', () => {
  /** Walks a seeded crowd to the camp, as EnemyBehaviour steers, and returns arrival frames. */
  function walk(nav: TerrainNavigation, goal: { x: number; y: number }, staggered: boolean) {
    let seed = 9;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const agents = Array.from({ length: 60 }, (_, slot) => {
      const angle = random() * Math.PI * 2,
        radius = 500 + random() * 800;
      const start = nav.nearestWalkable({
        x: goal.x + Math.cos(angle) * radius,
        y: goal.y + Math.sin(angle) * radius,
      })!;
      return { ...start, slot, route: undefined as EnemyRoute | undefined, arrived: -1 };
    });
    const speed = 90,
      dt = 1 / 60;
    for (let frame = 1; frame <= 60 * 50; frame++)
      for (const agent of agents) {
        if (agent.arrived >= 0) continue;
        const distance = Math.hypot(goal.x - agent.x, goal.y - agent.y);
        if (distance < 30) {
          agent.arrived = frame;
          continue;
        }
        let point = agent.route!;
        if (!staggered || routeDue(agent.route, frame, agent.slot, distance, goal, agent)) {
          const next = nav.waypoint(agent, goal, 'ground');
          point = agent.route = { x: next.x, y: next.y, target: goal };
        }
        const length = Math.hypot(point.x - agent.x, point.y - agent.y);
        if (length > 0) {
          const step = Math.min(length, speed * dt);
          const x = agent.x + ((point.x - agent.x) / length) * step,
            y = agent.y + ((point.y - agent.y) / length) * step;
          // Terrain collision stops movement into closed ground, as Arcade bodies do.
          if (nav.isWalkable(x, y, 0)) Object.assign(agent, { x, y });
        }
      }
    return agents.map((agent) => agent.arrived);
  }

  it.each(['otgontenger', 'orkhon-valley'] as const)(
    'reaches the camp at about the same time in %s',
    (id) => {
      const terrain = new ComposedTerrain(composedRegion(id), LANDSCAPES[id].water);
      const nav = new TerrainNavigation(terrain);
      const every = walk(nav, terrain.campPosition, false),
        staggered = walk(nav, terrain.campPosition, true);
      expect(every.every((frame) => frame > 0)).toBe(true);
      expect(staggered.every((frame) => frame > 0)).toBe(true);
      for (let i = 0; i < every.length; i++)
        expect(Math.abs(staggered[i]! - every[i]!), `agent ${i}`).toBeLessThanOrEqual(
          Math.max(30, every[i]! * 0.04),
        );
    },
    30_000,
  );
});
