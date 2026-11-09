import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  ORKHON_ATLAS,
  ORKHON_SPRITES,
  ORKHON_TILES,
  type OrkhonSpriteMetrics,
} from '../../src/game/assets/orkhonValleyArt';
import { GAME } from '../../src/game/config';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import {
  ORKHON_ENEMY_CAMPS,
  ORKHON_FIELD_SITES,
  ORKHON_FOOTPRINTS,
  ORKHON_VALLEY,
} from '../../src/game/data/orkhonValley';
import { WORLD_REGIONS, composedRegion } from '../../src/game/data/worldRegions';
import { ambientArrivalAngle, authoredFieldSite } from '../../src/game/systems/authoredSites';
import { TerrainNavigation } from '../../src/game/terrain/TerrainNavigation';
import type { TerrainPoint } from '../../src/game/terrain/types';
import { ComposedTerrain, outlineField } from '../../src/game/world3d/ComposedTerrain';
import { CAMERA_DIRECTION, orkhonOverlay } from '../../src/game/world3d/orkhonOverlay';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';

const art = resolve('public/art/orkhon-valley');
const C = GAME.worldSize / 2;
const world = (p: TerrainPoint): TerrainPoint => ({ x: C + p.x, y: C + p.y });
const clearance = GAME.terrain.actorClearance;
let terrain: ComposedTerrain;
let nav: TerrainNavigation;

beforeAll(() => {
  terrain = new ComposedTerrain(composedRegion('orkhon-valley'), LANDSCAPES['orkhon-valley'].water);
  nav = new TerrainNavigation(terrain);
});

function segmentDistance(point: TerrainPoint, a: TerrainPoint, b: TerrainPoint): number {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
}

/** Follow the shared enemy flow field, as pursuing enemies do, from `from` to `to`. */
function route(from: TerrainPoint, to: TerrainPoint): TerrainPoint[] {
  const path = [from];
  let point = from;
  for (let step = 0; step < 400 && Math.hypot(point.x - to.x, point.y - to.y) > 96; step++) {
    const next = nav.waypoint(point, to);
    if (next.x === point.x && next.y === point.y) break;
    point = next;
    path.push(point);
  }
  return path;
}
const elevation = (p: TerrainPoint) =>
  terrain.actorHeight(p.x, p.y) * 1000 - terrain.region.scene.floor;

describe('Orkhon Valley texture pack v2 assets', () => {
  it('bundles exactly the used supplied tiles and one sprite atlas, with no v1 files', () => {
    const files = readdirSync(art, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(art.length + 1))
      .sort();
    expect(files).toEqual(
      [
        ...Object.values(ORKHON_TILES).map((tile) => `${tile}.png`),
        `${ORKHON_ATLAS}.json`,
        `${ORKHON_ATLAS}.png`,
      ].sort(),
    );
  });

  it('registers every sprite at its supplied size inside the atlas', () => {
    const atlas = JSON.parse(readFileSync(join(art, `${ORKHON_ATLAS}.json`), 'utf8'));
    expect(Object.keys(atlas.frames).sort()).toEqual(Object.keys(ORKHON_SPRITES).sort());
    for (const [name, metrics] of Object.entries(ORKHON_SPRITES)) {
      const { frame } = atlas.frames[name];
      expect([frame.w, frame.h], name).toEqual([metrics.width, metrics.height]);
      expect(frame.x + frame.w).toBeLessThanOrEqual(atlas.meta.size.w);
      expect(frame.y + frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
    }
    expect(existsSync(join(art, `${ORKHON_ATLAS}.png`))).toBe(true);
  });
});

describe('Orkhon Valley two-level terrain', () => {
  it('keeps the camp on the valley floor and every plateau one level above it', () => {
    const floor = terrain.region.scene.floor;
    expect(terrain.height(C, C) * 1000).toBeCloseTo(floor, 6);
    for (const plateau of ORKHON_VALLEY.plateaus) {
      const xs = plateau.outline.map((p) => p.x);
      let inside = 0;
      for (let y = -2500; y <= 2500; y += 173)
        for (let x = Math.min(...xs); x <= Math.max(...xs); x += 173) {
          if (Math.abs(x) > 2500 || outlineField(plateau.outline, x, y) < 260) continue;
          if (plateau.ramps.some((ramp) => segmentDistance({ x, y }, ramp.foot, ramp.top) < 400))
            continue;
          inside++;
          expect(elevation(world({ x, y })), plateau.id).toBeGreaterThan(ORKHON_VALLEY.rise - 12);
          expect(elevation(world({ x, y })), plateau.id).toBeLessThan(ORKHON_VALLEY.rise + 12);
        }
      expect(inside, plateau.id).toBeGreaterThan(0);
    }
    for (const point of [
      { x: 0, y: -700 },
      { x: -900, y: 300 },
      { x: 700, y: 1400 },
      { x: 2300, y: 400 },
    ])
      expect(Math.abs(elevation(world(point)))).toBeLessThan(15);
  });

  it('blocks a unit from crossing any cliff edge away from its ramps', () => {
    let checked = 0;
    for (const plateau of ORKHON_VALLEY.plateaus) {
      const outline = plateau.outline;
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i]!,
          b = outline[(i + 1) % outline.length]!;
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const n = { x: (b.y - a.y) / length, y: -(b.x - a.x) / length };
        for (let t = 0.2; t <= 0.8; t += 0.3) {
          const mid = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          if (Math.abs(mid.x) > 2400 || Math.abs(mid.y) > 2400) continue;
          if (plateau.ramps.some((ramp) => segmentDistance(mid, ramp.foot, ramp.top) < 260))
            continue;
          const outside = { x: mid.x + n.x * 140, y: mid.y + n.y * 140 };
          const inside = { x: mid.x - n.x * 140, y: mid.y - n.y * 140 };
          if (outlineField(outline, outside.x, outside.y) > 0) {
            outside.x = mid.x - n.x * 140;
            outside.y = mid.y - n.y * 140;
            inside.x = mid.x + n.x * 140;
            inside.y = mid.y + n.y * 140;
          }
          if (
            ORKHON_VALLEY.plateaus.some(
              (other) => outlineField(other.outline, outside.x, outside.y) > 0,
            )
          )
            continue;
          if (!nav.isWalkable(C + outside.x, C + outside.y, clearance)) continue;
          expect(nav.lineClear(world(outside), world(inside)), `${plateau.id} edge ${i}`).toBe(
            false,
          );
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(25);
  });

  it('lets a unit climb every ramp from the valley floor to the plateau', () => {
    for (const plateau of ORKHON_VALLEY.plateaus)
      for (const ramp of plateau.ramps) {
        const foot = world(ramp.foot),
          top = world(ramp.top);
        expect(nav.isWalkable(foot.x, foot.y, clearance, true), plateau.id).toBe(true);
        expect(nav.isWalkable(top.x, top.y, clearance, true), plateau.id).toBe(true);
        expect(nav.lineClear(foot, top), plateau.id).toBe(true);
        expect(elevation(foot)).toBeLessThan(25);
        expect(elevation(top)).toBeGreaterThan(ORKHON_VALLEY.rise - 12);
      }
  });

  it('routes pursuing enemies off each plateau through one of its ramps', () => {
    const camp = { x: C, y: C };
    for (const plateau of ORKHON_VALLEY.plateaus) {
      const ramp = plateau.ramps[0]!;
      const start = nav.nearestWalkable(
        world({
          x: ramp.top.x + (ramp.top.x - ramp.foot.x),
          y: ramp.top.y + (ramp.top.y - ramp.foot.y),
        }),
      )!;
      expect(elevation(start), plateau.id).toBeGreaterThan(ORKHON_VALLEY.rise - 12);
      const path = route(start, camp);
      expect(Math.hypot(path.at(-1)!.x - C, path.at(-1)!.y - C), plateau.id).toBeLessThan(140);
      const descent = path.findIndex((p) => elevation(p) < ORKHON_VALLEY.rise / 2);
      expect(descent, plateau.id).toBeGreaterThan(0);
      const step = path[descent]!;
      expect(
        Math.min(
          ...plateau.ramps.map((r) =>
            segmentDistance({ x: step.x - C, y: step.y - C }, r.foot, r.top),
          ),
        ),
        plateau.id,
      ).toBeLessThan(140);
      for (let i = 1; i < path.length; i++)
        expect(nav.lineClear(path[i - 1]!, path[i]!, clearance * 0.5)).toBe(true);
    }
  });

  it('makes river water impassable away from the bridge', () => {
    const river = terrain.river!;
    let wet = 0;
    for (const section of river.channels[0]!.sections) {
      const x = C + section.x,
        y = C + section.y;
      if (river.bridgeHeight(x, y) !== undefined) continue;
      if (Math.abs(section.y) > 2500) continue;
      if (Math.min(...river.bridges.map((b) => Math.hypot(b.x - x, b.z - y))) < 260) continue;
      expect(nav.isWalkable(x, y, clearance), `${section.x},${section.y}`).toBe(false);
      wet++;
    }
    expect(wet).toBeGreaterThan(40);
    // A unit on the west bank cannot wade straight across to the east bank.
    for (const y of [-600, 700, 1400]) {
      const section = river.channels[0]!.sections.reduce((a, b) =>
        Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a,
      );
      const west = world({ x: section.x - section.left - 70, y: section.y });
      const east = world({ x: section.x + section.right + 70, y: section.y });
      expect(nav.lineClear(west, east, clearance), `y=${y}`).toBe(false);
    }
  });

  it('lets a unit cross the river on the bridge deck', () => {
    const river = terrain.river!;
    for (const bridge of river.bridges) {
      const along = { x: bridge.nx, y: bridge.nz };
      const end = (side: number) => ({
        x: bridge.x + along.x * side * (bridge.length / 2 - 10),
        y: bridge.z + along.y * side * (bridge.length / 2 - 10),
      });
      expect(nav.isWalkable(bridge.x, bridge.z, clearance, true)).toBe(true);
      expect(terrain.actorHeight(bridge.x, bridge.z) * 1000).toBeCloseTo(bridge.height);
      expect(nav.lineClear(end(-1), end(1), clearance)).toBe(true);
    }
  });

  it('routes enemies from the far bank to the camp over the bridge', () => {
    const river = terrain.river!;
    const start = nav.nearestWalkable(world({ x: 2350, y: 600 }))!;
    const path = route(start, { x: C, y: C });
    expect(Math.hypot(path.at(-1)!.x - C, path.at(-1)!.y - C)).toBeLessThan(140);
    expect(path.some((p) => river.bridgeHeight(p.x, p.y) !== undefined)).toBe(true);
    expect(
      path.every(
        (p) =>
          river.sample(p.x, p.y).shoreDistance >= 0 || river.bridgeHeight(p.x, p.y) !== undefined,
      ),
    ).toBe(true);
  });

  it('keeps landmark footprints solid and their field sites reachable beside them', () => {
    for (const landmark of ORKHON_FOOTPRINTS)
      expect(nav.isWalkable(C + landmark.x, C + landmark.y), landmark.id).toBe(false);
    for (let issued = 0; issued < ORKHON_FIELD_SITES.length; issued++) {
      const site = authoredFieldSite('orkhon-valley', issued)!;
      const near = nav.nearestWalkable(site)!;
      expect(Math.hypot(near.x - site.x, near.y - site.y)).toBeLessThan(220);
    }
    expect(authoredFieldSite('otgontenger', 0)).toBeUndefined();
  });

  it('keeps large open combat space on the valley floor around the camp', () => {
    let open = 0,
      total = 0;
    for (let y = -900; y <= 900; y += 100)
      for (let x = -1300; x <= 1300; x += 100) {
        total++;
        if (
          nav.isWalkable(C + x, C + y, clearance, true) &&
          Math.abs(elevation(world({ x, y }))) < 15
        )
          open++;
      }
    expect(open / total).toBeGreaterThan(0.85);
  });
});

describe('Orkhon Valley painted scene', () => {
  const frames = (): Set<string> =>
    new Set(
      Object.keys(JSON.parse(readFileSync(join(art, `${ORKHON_ATLAS}.json`), 'utf8')).frames),
    );

  it('dresses the level from supplied atlas frames, untinted, and stable across chunks', () => {
    const valid = frames();
    const whole = sceneDressing(terrain, { x: 1536, y: 1536, width: 1024, height: 1024 });
    const parts = [1536, 2048].flatMap((x) =>
      [1536, 2048].flatMap((y) => sceneDressing(terrain, { x, y, width: 512, height: 512 })),
    );
    const sort = (items: typeof whole) => items.map((p) => JSON.stringify(p)).sort();
    expect(sort(parts)).toEqual(sort(whole));
    const all = sceneDressing(terrain, {
      x: 0,
      y: 0,
      width: GAME.worldSize,
      height: GAME.worldSize,
    });
    expect(all.length).toBeGreaterThan(150);
    for (const prop of all) {
      expect(prop.texture).toBe(ORKHON_ATLAS);
      expect(valid.has(prop.frame), prop.frame).toBe(true);
      expect(prop.tint).toBe(0xffffff);
      expect(terrain.river!.sample(prop.x, prop.z).shoreDistance).toBeGreaterThan(0);
    }
    for (const landmark of ORKHON_VALLEY.landmarks)
      expect(all.some((prop) => prop.frame === landmark.sprite && prop.x === C + landmark.x)).toBe(
        true,
      );
  });

  it('folds painted cliffs onto every camera-facing wall and leaves ramps open', () => {
    const pieces = orkhonOverlay(terrain);
    const valid = frames();
    for (const piece of pieces) {
      expect(valid.has(piece.sprite), piece.sprite).toBe(true);
      expect(piece.vertices.length % 3).toBe(0);
      expect(piece.vertices.every((v) => v.position.every(Number.isFinite))).toBe(true);
    }
    const faces = pieces.filter((piece) => piece.part === 'face');
    expect(faces.length).toBeGreaterThan(40);
    for (const face of faces) {
      const [topLeft, , , bottomLeft] = [0, 1, 2, 5].map((i) => face.vertices[i]!.position);
      // Each face stands vertically on its wall and spans the full level change.
      expect(topLeft![0]).toBeCloseTo(bottomLeft![0]);
      expect(topLeft![2]).toBeCloseTo(bottomLeft![2]);
      expect(topLeft![1] - bottomLeft![1]).toBeGreaterThan(ORKHON_VALLEY.rise * 0.75);
      const center = { x: topLeft![0] - C, y: topLeft![2] - C };
      const plateau = ORKHON_VALLEY.plateaus.find(
        (p) => Math.abs(outlineField(p.outline, center.x, center.y)) < 160,
      );
      expect(plateau).toBeDefined();
    }
    for (const plateau of ORKHON_VALLEY.plateaus)
      for (const ramp of plateau.ramps) {
        expect(pieces.some((piece) => piece.part === 'ramp' && piece.sprite === ramp.sprite)).toBe(
          true,
        );
        const crossing = {
          x: (ramp.foot.x + ramp.top.x) / 2,
          y: (ramp.foot.y + ramp.top.y) / 2,
        };
        for (const face of faces) {
          const p = face.vertices[0]!.position,
            q = face.vertices[1]!.position;
          const middle = { x: (p[0] + q[0]) / 2 - C, y: (p[2] + q[2]) / 2 - C };
          expect(Math.hypot(middle.x - crossing.x, middle.y - crossing.y)).toBeGreaterThan(
            ramp.halfWidth,
          );
        }
      }
    expect(pieces.filter((piece) => piece.part === 'deck')).toHaveLength(
      ORKHON_VALLEY.river.bridges.length,
    );
    expect(pieces.some((piece) => piece.part === 'falls')).toBe(true);
  });

  it('drapes ramp paintings so their painted foot and crest land on the graded ramp', () => {
    for (const plateau of ORKHON_VALLEY.plateaus)
      for (const ramp of plateau.ramps) {
        const metrics: OrkhonSpriteMetrics = ORKHON_SPRITES[ramp.sprite];
        const climb = metrics.climb!;
        const piece = orkhonOverlay(terrain).find(
          (p) =>
            p.part === 'ramp' &&
            p.vertices.some(
              (v) =>
                Math.hypot(v.position[0] - C - ramp.foot.x, v.position[2] - C - ramp.foot.y) < 8,
            ),
        )!;
        const nearest = (point: TerrainPoint) =>
          piece.vertices.reduce((a, b) =>
            Math.hypot(b.position[0] - C - point.x, b.position[2] - C - point.y) <
            Math.hypot(a.position[0] - C - point.x, a.position[2] - C - point.y)
              ? b
              : a,
          );
        const foot = nearest(ramp.foot).pixel,
          top = nearest(ramp.top).pixel;
        expect(Math.hypot(foot[0] - climb[0][0], foot[1] - climb[0][1])).toBeLessThan(6);
        expect(Math.hypot(top[0] - climb[1][0], top[1] - climb[1][1])).toBeLessThan(6);
      }
  });

  it('places every packed sprite, so only used pack art is bundled', () => {
    const used = new Set([
      ...sceneDressing(terrain, { x: 0, y: 0, width: GAME.worldSize, height: GAME.worldSize }).map(
        (prop) => prop.frame,
      ),
      ...orkhonOverlay(terrain).map((piece) => piece.sprite),
    ]);
    expect([...used].sort()).toEqual([...frames()].sort());
  });

  it('only paints walls whose outward side faces the fixed camera', () => {
    for (const face of orkhonOverlay(terrain).filter((piece) => piece.part === 'face')) {
      const [left, right] = [face.vertices[0]!.position, face.vertices[1]!.position];
      const along = { x: right[0] - left[0], y: right[2] - left[2] };
      const length = Math.hypot(along.x, along.y);
      const middle = { x: (left[0] + right[0]) / 2 - C, y: (left[2] + right[2]) / 2 - C };
      const plateau = ORKHON_VALLEY.plateaus.reduce((a, b) =>
        Math.abs(outlineField(b.outline, middle.x, middle.y)) <
        Math.abs(outlineField(a.outline, middle.x, middle.y))
          ? b
          : a,
      );
      let n = { x: along.y / length, y: -along.x / length };
      if (outlineField(plateau.outline, middle.x + n.x * 40, middle.y + n.y * 40) > 0)
        n = { x: -n.x, y: -n.y };
      expect(n.x * CAMERA_DIRECTION.x + n.y * CAMERA_DIRECTION.y).toBeGreaterThan(0);
    }
  });
});

describe('Orkhon Valley landmark systems', () => {
  it('sends ordinary arrivals from the direction of a raider camp', () => {
    const anchor = { x: C, y: C };
    for (const [index, camp] of ORKHON_ENEMY_CAMPS.entries()) {
      const pick = (index + 0.5) / ORKHON_ENEMY_CAMPS.length;
      const draws = [pick, 0.5];
      const angle = ambientArrivalAngle('orkhon-valley', anchor, () => draws.shift()!);
      expect(angle).toBeCloseTo(Math.atan2(camp.y, camp.x));
    }
  });

  it('keeps every other location on a single uniform bearing draw', () => {
    for (const id of Object.keys(WORLD_REGIONS) as (keyof typeof WORLD_REGIONS)[]) {
      if (id === 'orkhon-valley') continue;
      let draws = 0;
      const angle = ambientArrivalAngle(id, { x: C, y: C }, () => {
        draws++;
        return 0.25;
      });
      expect(angle).toBeCloseTo(Math.PI / 2);
      expect(draws).toBe(1);
      expect(composedRegion(id).scene.shelves[0]!.id).toBe('camp-shelf');
    }
  });
});
