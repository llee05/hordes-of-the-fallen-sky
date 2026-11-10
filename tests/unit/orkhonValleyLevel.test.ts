import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  ORKHON_ATLAS,
  ORKHON_CLIFF_FACE_WIDTH,
  ORKHON_CLIFF_FACES,
  ORKHON_LANDMARK_SCALE,
  ORKHON_PROP_SCALE,
  ORKHON_SPRITES,
  ORKHON_TILES,
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
import { orkhonOverlay } from '../../src/game/world3d/orkhonOverlay';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';
import { sceneGeometry } from '../../src/game/world3d/sceneGeometry';
import { terrainHabitat, terrainMaterialWeights } from '../../src/game/world3d/terrainHabitat';
import { WORLD_3D } from '../../src/game/world3d/worldProjection';

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

  it('breaks long cliff lines into irregular jogs but keeps ramps and the falls on their edge', () => {
    for (const plateau of ORKHON_VALLEY.plateaus) {
      const outline = plateau.outline;
      let turns = 0;
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i]!,
          b = outline[(i + 1) % outline.length]!,
          c = outline[(i + 2) % outline.length]!;
        if (Math.max(Math.abs(b.x), Math.abs(b.y)) > 2550) continue;
        // No straight run inside the world is longer than about two jogs.
        if (Math.max(Math.abs(a.x), Math.abs(a.y), Math.abs(b.x), Math.abs(b.y)) < 2550)
          expect(Math.hypot(b.x - a.x, b.y - a.y), plateau.id).toBeLessThan(560);
        const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
        if (Math.abs(cross) > 1) turns++;
      }
      expect(turns, plateau.id).toBeGreaterThan(5);
      for (const ramp of plateau.ramps) {
        const crossing = { x: (ramp.foot.x + ramp.top.x) / 2, y: (ramp.foot.y + ramp.top.y) / 2 };
        expect(Math.abs(outlineField(outline, crossing.x, crossing.y)), plateau.id).toBeLessThan(2);
      }
    }
    const falls = ORKHON_VALLEY.plateaus.find((p) => p.id === 'falls-plateau')!;
    expect(
      Math.abs(outlineField(falls.outline, ORKHON_VALLEY.waterfall.x, ORKHON_VALLEY.waterfall.y)),
    ).toBeLessThan(60);
  });

  it('lights every plateau rim with a band of dry grass', () => {
    let rims = 0;
    for (const plateau of ORKHON_VALLEY.plateaus)
      for (let i = 0; i < plateau.outline.length; i += 3) {
        const a = plateau.outline[i]!,
          b = plateau.outline[(i + 1) % plateau.outline.length]!;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (Math.abs(mid.x) > 2400 || Math.abs(mid.y) > 2400) continue;
        if (plateau.ramps.some((r) => segmentDistance(mid, r.foot, r.top) < 320)) continue;
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        let n = { x: (b.y - a.y) / length, y: -(b.x - a.x) / length };
        if (outlineField(plateau.outline, mid.x + n.x * 20, mid.y + n.y * 20) < 0)
          n = { x: -n.x, y: -n.y };
        const rim = world({ x: mid.x + n.x * 20, y: mid.y + n.y * 20 });
        const inner = world({ x: mid.x + n.x * 220, y: mid.y + n.y * 220 });
        if (outlineField(plateau.outline, inner.x - C, inner.y - C) < 180) continue;
        // The river's gravel banks replace the rim beside the gorge.
        if (terrain.river!.sample(rim.x, rim.y).shoreDistance < 150) continue;
        const weights = (p: TerrainPoint) => {
          const height = terrain.height(p.x, p.y) * 1000;
          return terrainMaterialWeights(
            terrain,
            height,
            1,
            terrainHabitat(terrain, p.x, p.y, height, 1),
          );
        };
        // Channel 3 is dry grass.
        expect(weights(rim)[3], plateau.id).toBeGreaterThan(0.5);
        rims++;
      }
    expect(rims).toBeGreaterThan(10);
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

  it('draws trees, scrub, rocks and landmarks at one miniature scale', () => {
    const all = sceneDressing(terrain, {
      x: 0,
      y: 0,
      width: GAME.worldSize,
      height: GAME.worldSize,
    });
    const scale = (kind: string) =>
      ({
        larch: [ORKHON_PROP_SCALE.tree * 0.9, ORKHON_PROP_SCALE.tree * 1.1],
        scrub: [ORKHON_PROP_SCALE.scrub, ORKHON_PROP_SCALE.scrub],
        reeds: [ORKHON_PROP_SCALE.reed, ORKHON_PROP_SCALE.reed],
        boulders: [ORKHON_PROP_SCALE.rock * 0.85, ORKHON_PROP_SCALE.rock * 1.15],
      })[kind];
    for (const prop of all) {
      const painted = ORKHON_SPRITES[prop.frame as keyof typeof ORKHON_SPRITES].width * 1.7;
      const range = scale(prop.kind);
      if (!range) continue;
      expect(prop.width / painted, prop.frame).toBeGreaterThanOrEqual(range[0]! - 1e-9);
      expect(prop.width / painted, prop.frame).toBeLessThanOrEqual(range[1]! + 1e-9);
    }
    for (const landmark of ORKHON_VALLEY.landmarks) {
      const prop = all.find(
        (p) =>
          p.kind === 'landmark' &&
          p.frame === landmark.sprite &&
          p.x === C + landmark.x &&
          p.z === C + landmark.y,
      )!;
      const expected = landmark.scale ?? ORKHON_LANDMARK_SCALE[landmark.sprite] ?? 1;
      expect(prop.width).toBeCloseTo(ORKHON_SPRITES[landmark.sprite].width * 1.7 * expected);
    }
    // A mounted rider is about 60 units tall: trees stand about twice that.
    for (const prop of all.filter((p) => p.kind === 'larch')) {
      const metrics = ORKHON_SPRITES[prop.frame as keyof typeof ORKHON_SPRITES];
      const tall = (prop.width / metrics.width) * metrics.height;
      expect(tall).toBeGreaterThan(90);
      expect(tall).toBeLessThan(150);
    }
  });

  it('gathers rubble below camera-facing cliffs and trees behind plateau rims', () => {
    const all = sceneDressing(terrain, {
      x: 0,
      y: 0,
      width: GAME.worldSize,
      height: GAME.worldSize,
    });
    const field = (prop: { x: number; z: number }) =>
      Math.max(
        ...ORKHON_VALLEY.plateaus.map((p) => outlineField(p.outline, prop.x - C, prop.z - C)),
      );
    const foot = all.filter(
      (prop) => prop.kind === 'boulders' && field(prop) < -20 && field(prop) > -80,
    );
    const rim = all.filter(
      (prop) => prop.kind === 'larch' && field(prop) > 60 && field(prop) < 190,
    );
    expect(foot.length).toBeGreaterThan(20);
    expect(rim.length).toBeGreaterThan(15);
    // Ramps and paths stay clear for movement and combat.
    for (const prop of all.filter((p) => p.kind !== 'landmark')) {
      const height = terrain.height(prop.x, prop.z) * 1000;
      expect(terrainHabitat(terrain, prop.x, prop.z, height, 1).wear).toBeLessThan(0.3);
    }
  });

  it('paints every plateau wall with continuous cliff-face bands and leaves ramps open', () => {
    let checked = 0;
    for (const plateau of ORKHON_VALLEY.plateaus)
      for (const ramp of plateau.ramps) {
        const middle = world({
          x: (ramp.foot.x + ramp.top.x) / 2,
          y: (ramp.foot.y + ramp.top.y) / 2,
        });
        const { walls } = sceneGeometry(terrain, {
          x: Math.floor((middle.x - 512) / 32) * 32,
          y: Math.floor((middle.y - 512) / 32) * 32,
          width: 1024,
          height: 1024,
        });
        expect(walls.positions.length, plateau.id).toBeGreaterThan(0);
        for (let i = 0; i < walls.positions.length / 3; i++) {
          const weights = walls.weights.slice(i * 7, i * 7 + 7);
          // Painted-face flag, distance along the outline, and depth below the cliff top.
          expect(weights[6]).toBe(1);
          expect(Number.isFinite(weights[4])).toBe(true);
          expect(weights[5]).toBeGreaterThanOrEqual(-1e-6);
          expect(weights[5]).toBeLessThan(ORKHON_VALLEY.rise * 1.06);
          const point = { x: walls.positions[i * 3]! - C, y: walls.positions[i * 3 + 2]! - C };
          // Wall ends snap to the 32-unit terrain mesh around each ramp's open width.
          for (const other of ORKHON_VALLEY.plateaus.flatMap((p) => p.ramps))
            expect(segmentDistance(point, other.foot, other.top)).toBeGreaterThan(
              other.halfWidth - WORLD_3D.meshStep,
            );
          checked++;
        }
        // Each wall triangle samples one stretch of the outline, never across its start.
        for (let i = 0; i < walls.positions.length / 9; i++) {
          const along = [0, 1, 2].map((v) => walls.weights[(i * 3 + v) * 7 + 4]!);
          expect(Math.max(...along) - Math.min(...along)).toBeLessThan(80);
        }
      }
    expect(checked).toBeGreaterThan(500);
    // Other places keep their plain rock walls.
    const other = new ComposedTerrain(composedRegion('otgontenger'));
    const { walls } = sceneGeometry(other, { x: 2048, y: 1536, width: 1024, height: 1024 });
    expect(walls.weights.length).toBeGreaterThan(0);
    for (let i = 6; i < walls.weights.length; i += 7) expect(walls.weights[i]).toBe(0);
  });

  it('crops every cliff-face band from inside its supplied sprite', () => {
    const atlas = JSON.parse(readFileSync(join(art, `${ORKHON_ATLAS}.json`), 'utf8'));
    for (const face of ORKHON_CLIFF_FACES) {
      const { frame } = atlas.frames[face.sprite];
      expect(face.x).toBeGreaterThanOrEqual(0);
      expect(face.y).toBeGreaterThanOrEqual(0);
      expect(face.x + ORKHON_CLIFF_FACE_WIDTH, face.sprite).toBeLessThanOrEqual(frame.w);
      expect(face.y + face.height, face.sprite).toBeLessThanOrEqual(frame.h);
    }
  });

  it('wears every ramp bare across its walkable width', () => {
    for (const plateau of ORKHON_VALLEY.plateaus)
      for (const ramp of plateau.ramps) {
        const length = Math.hypot(ramp.top.x - ramp.foot.x, ramp.top.y - ramp.foot.y);
        const side = {
          x: -(ramp.top.y - ramp.foot.y) / length,
          y: (ramp.top.x - ramp.foot.x) / length,
        };
        for (const t of [0.25, 0.5, 0.75])
          for (const offset of [-0.5, 0, 0.5]) {
            const x =
              ramp.foot.x + (ramp.top.x - ramp.foot.x) * t + side.x * ramp.halfWidth * offset;
            const y =
              ramp.foot.y + (ramp.top.y - ramp.foot.y) * t + side.y * ramp.halfWidth * offset;
            const height = terrain.height(C + x, C + y) * 1000;
            expect(
              terrainHabitat(terrain, C + x, C + y, height, 1).wear,
              plateau.id,
            ).toBeGreaterThan(0.85);
          }
      }
  });

  it('places every packed sprite, so only used pack art is bundled', () => {
    const used = new Set([
      ...sceneDressing(terrain, { x: 0, y: 0, width: GAME.worldSize, height: GAME.worldSize }).map(
        (prop) => prop.frame,
      ),
      ...orkhonOverlay(terrain).map((piece) => piece.sprite),
      ...ORKHON_CLIFF_FACES.map((face) => face.sprite),
    ]);
    expect([...used].sort()).toEqual([...frames()].sort());
  });

  it('keeps the falls and the bridge deck painted over the river', () => {
    const pieces = orkhonOverlay(terrain);
    const valid = frames();
    for (const piece of pieces) {
      expect(valid.has(piece.sprite), piece.sprite).toBe(true);
      expect(piece.vertices.length % 3).toBe(0);
      expect(piece.vertices.every((v) => v.position.every(Number.isFinite))).toBe(true);
    }
    expect(pieces.filter((piece) => piece.part === 'deck')).toHaveLength(
      ORKHON_VALLEY.river.bridges.length,
    );
    expect(pieces.some((piece) => piece.part === 'falls')).toBe(true);
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
