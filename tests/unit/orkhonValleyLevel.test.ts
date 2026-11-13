import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  ORKHON_ATLAS,
  ORKHON_BANKS,
  ORKHON_BANK_SHORE,
  ORKHON_CLIFF_FACE_WIDTH,
  ORKHON_CLIFF_FACES,
  ORKHON_KIT_ATLAS,
  ORKHON_KIT_SPRITES,
  ORKHON_LANDMARK_SCALE,
  ORKHON_PROP_SCALE,
  ORKHON_SPRITES,
  ORKHON_TILES,
  orkhonAtlasOf,
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
import {
  ORKHON_GROUND_QUADRANTS,
  ORKHON_PAINTED_GROUND,
} from '../../src/game/world3d/orkhonPaintedGround';
import {
  BANK_ACROSS,
  CAMERA_DIRECTION,
  orkhonBanks,
  orkhonOverlay,
} from '../../src/game/world3d/orkhonOverlay';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';
import { sceneGeometry } from '../../src/game/world3d/sceneGeometry';
import { terrainHabitat, terrainMaterialWeights } from '../../src/game/world3d/terrainHabitat';
import { WORLD_3D } from '../../src/game/world3d/worldProjection';

const art = resolve('public/art/orkhon-valley');
const C = ORKHON_VALLEY.world.terrainSize / 2;
const world = (p: TerrainPoint): TerrainPoint => ({ x: C + p.x, y: C + p.y });
const camp = world(ORKHON_VALLEY.world.camp);
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

const atlasJson = (atlas: string) =>
  JSON.parse(readFileSync(join(art, `${atlas}.json`), 'utf8')) as {
    frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
    meta: { size: { w: number; h: number } };
  };

describe('Orkhon Valley terrain kit and pack assets', () => {
  it('bundles exactly the used kit tiles, bank bands and the two sprite atlases', () => {
    const files = readdirSync(art, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(art.length + 1))
      .sort();
    expect(files).toEqual(
      [
        ...ORKHON_GROUND_QUADRANTS.map(
          (quadrant) => ORKHON_PAINTED_GROUND.quadrants[quadrant].file,
        ),
        ORKHON_PAINTED_GROUND.detail.file,
        ...Object.values(ORKHON_TILES).map((tile) => `${tile}.png`),
        ...Object.values(ORKHON_BANKS).map((bank) => `${bank}.png`),
        ...[ORKHON_ATLAS, ORKHON_KIT_ATLAS].flatMap((atlas) => [`${atlas}.json`, `${atlas}.png`]),
      ].sort(),
    );
  });

  it('registers every sprite at its supplied size inside its atlas', () => {
    const pack = atlasJson(ORKHON_ATLAS),
      kit = atlasJson(ORKHON_KIT_ATLAS);
    expect(Object.keys(kit.frames).sort()).toEqual(Object.keys(ORKHON_KIT_SPRITES).sort());
    expect([...Object.keys(pack.frames), ...Object.keys(kit.frames)].sort()).toEqual(
      Object.keys(ORKHON_SPRITES).sort(),
    );
    for (const [name, metrics] of Object.entries(ORKHON_SPRITES)) {
      const atlas =
        orkhonAtlasOf(name as keyof typeof ORKHON_SPRITES) === ORKHON_KIT_ATLAS ? kit : pack;
      const { frame } = atlas.frames[name]!;
      expect([frame.w, frame.h], name).toEqual([metrics.width, metrics.height]);
      expect(frame.x + frame.w).toBeLessThanOrEqual(atlas.meta.size.w);
      expect(frame.y + frame.h).toBeLessThanOrEqual(atlas.meta.size.h);
    }
    for (const atlas of [ORKHON_ATLAS, ORKHON_KIT_ATLAS])
      expect(existsSync(join(art, `${atlas}.png`))).toBe(true);
  });
});

describe('Orkhon Valley two-level terrain', () => {
  it('uses a 6400 by 4000 playable rectangle with the camp in the south-west quadrant', () => {
    expect(terrain.worldSize).toBe(6400);
    expect(terrain.playBounds).toEqual({ x: 0, y: 1200, width: 6400, height: 4000 });
    expect(terrain.campPosition).toEqual({ x: 2650, y: 3620 });
  });

  it('keeps the camp on the valley floor and every plateau one level above it', () => {
    const floor = terrain.region.scene.floor;
    expect(terrain.height(camp.x, camp.y) * 1000).toBeCloseTo(floor, 6);
    for (const plateau of ORKHON_VALLEY.plateaus) {
      const xs = plateau.outline.map((p) => p.x);
      let inside = 0;
      for (let y = -1900; y <= 1900; y += 120)
        for (let x = Math.min(...xs); x <= Math.max(...xs); x += 120) {
          if (Math.abs(x) > 3100 || outlineField(plateau.outline, x, y) < 260) continue;
          if (plateau.ramps.some((ramp) => segmentDistance({ x, y }, ramp.foot, ramp.top) < 400))
            continue;
          inside++;
          expect(elevation(world({ x, y })), plateau.id).toBeGreaterThan(ORKHON_VALLEY.rise - 20);
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
        if (Math.abs(b.x) > 3150 || Math.abs(b.y) > 1950) continue;
        // No straight run inside the world is longer than about two jogs.
        if (
          Math.max(Math.abs(a.x), Math.abs(b.x)) < 3150 &&
          Math.max(Math.abs(a.y), Math.abs(b.y)) < 1950
        )
          expect(Math.hypot(b.x - a.x, b.y - a.y), plateau.id).toBeLessThan(560);
        const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
        if (Math.abs(cross) > 1) turns++;
      }
      expect(turns, plateau.id).toBeGreaterThanOrEqual(5);
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

  it('keeps every plateau top on the darker moss right up to its rim', () => {
    let rims = 0;
    for (const plateau of ORKHON_VALLEY.plateaus)
      for (let i = 0; i < plateau.outline.length; i += 3) {
        const a = plateau.outline[i]!,
          b = plateau.outline[(i + 1) % plateau.outline.length]!;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (Math.abs(mid.x) > 3050 || Math.abs(mid.y) > 1850) continue;
        if (plateau.ramps.some((r) => segmentDistance(mid, r.foot, r.top) < 320)) continue;
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        let n = { x: (b.y - a.y) / length, y: -(b.x - a.x) / length };
        if (outlineField(plateau.outline, mid.x + n.x * 20, mid.y + n.y * 20) < 0)
          n = { x: -n.x, y: -n.y };
        const rim = world({ x: mid.x + n.x * 20, y: mid.y + n.y * 20 });
        const inner = world({ x: mid.x + n.x * 220, y: mid.y + n.y * 220 });
        if (outlineField(plateau.outline, inner.x - C, inner.y - C) < 180) continue;
        // The river's banks replace the rim beside the gorge.
        if (terrain.river!.sample(rim.x, rim.y).shoreDistance < 150) continue;
        const rimHeight = terrain.height(rim.x, rim.y) * 1000;
        if (terrainHabitat(terrain, rim.x, rim.y, rimHeight, 1).wear > 0.3) continue;
        const valley = world({ x: mid.x - n.x * 260, y: mid.y - n.y * 260 });
        const weights = (p: TerrainPoint) => {
          const height = terrain.height(p.x, p.y) * 1000;
          return terrainMaterialWeights(
            terrain,
            height,
            1,
            terrainHabitat(terrain, p.x, p.y, height, 1),
          );
        };
        // Channel 4 is plateau moss and channel 3 sun-cured straw: elevation reads from tone, so
        // the rim is moss with no lighter band, and the valley below has none of it.
        expect(weights(rim)[4], plateau.id).toBeGreaterThan(0.6);
        expect(weights(rim)[3], plateau.id).toBe(0);
        expect(weights(inner)[4], plateau.id).toBeGreaterThan(0.6);
        if (
          ORKHON_VALLEY.plateaus.every(
            (p) => outlineField(p.outline, valley.x - C, valley.y - C) < -60,
          )
        )
          expect(weights(valley)[4], plateau.id).toBe(0);
        rims++;
      }
    expect(rims).toBeGreaterThanOrEqual(8);
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
          if (Math.abs(mid.x) > 3050 || Math.abs(mid.y) > 1850) continue;
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
      expect(Math.hypot(path.at(-1)!.x - camp.x, path.at(-1)!.y - camp.y), plateau.id).toBeLessThan(
        140,
      );
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
      if (Math.abs(section.y) > 1900) continue;
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
    const bridge = river.bridges[0]!;
    const ends = [-1, 1].map((side) => ({
      x: bridge.x + bridge.nx * side * (bridge.length / 2 + 90),
      y: bridge.z + bridge.nz * side * (bridge.length / 2 + 90),
    }));
    const start = nav.nearestWalkable(
      ends.sort(
        (a, b) => Math.hypot(b.x - camp.x, b.y - camp.y) - Math.hypot(a.x - camp.x, a.y - camp.y),
      )[0]!,
    )!;
    const path = route(start, camp);
    expect(Math.hypot(path.at(-1)!.x - camp.x, path.at(-1)!.y - camp.y)).toBeLessThan(140);
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
          nav.isWalkable(camp.x + x, camp.y + y, clearance, true) &&
          Math.abs(elevation({ x: camp.x + x, y: camp.y + y })) < 15
        )
          open++;
      }
    expect(open / total).toBeGreaterThan(0.85);
  });
});

describe('Orkhon Valley painted scene', () => {
  const frames = (): Set<string> =>
    new Set(
      [ORKHON_ATLAS, ORKHON_KIT_ATLAS].flatMap((atlas) => Object.keys(atlasJson(atlas).frames)),
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
      width: terrain.worldSize,
      height: terrain.worldSize,
    });
    expect(all.length).toBeGreaterThan(150);
    for (const prop of all) {
      expect(prop.texture).toBe(orkhonAtlasOf(prop.frame as keyof typeof ORKHON_SPRITES));
      expect(valid.has(prop.frame), prop.frame).toBe(true);
      expect(prop.tint).toBe(0xffffff);
      // Everything stands on land except the sacred islets, which stand in the river.
      const shore = terrain.river!.sample(prop.x, prop.z).shoreDistance;
      if (prop.frame === 'prop_river_islet') expect(shore).toBeLessThan(-30);
      else expect(shore, `${prop.frame}@${prop.x},${prop.z}`).toBeGreaterThan(0);
    }
    expect(all.filter((prop) => prop.frame === 'prop_river_islet')).toHaveLength(2);
    for (const landmark of ORKHON_VALLEY.landmarks)
      expect(all.some((prop) => prop.frame === landmark.sprite && prop.x === C + landmark.x)).toBe(
        true,
      );
  }, 30_000);

  it('draws trees, scrub, rocks and landmarks at one miniature scale', () => {
    const all = sceneDressing(terrain, {
      x: 0,
      y: 0,
      width: terrain.worldSize,
      height: terrain.worldSize,
    });
    const scale = (kind: string) =>
      ({
        larch: [ORKHON_PROP_SCALE.tree * 0.9, ORKHON_PROP_SCALE.tree * 1.1],
        scrub: [ORKHON_PROP_SCALE.scrub, ORKHON_PROP_SCALE.scrub],
        reeds: [ORKHON_PROP_SCALE.reed, ORKHON_PROP_SCALE.reed],
        boulders: [ORKHON_PROP_SCALE.scree * 0.85, ORKHON_PROP_SCALE.scree * 1.15],
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
    // The Khan on horseback is about 63 units tall: trees stand about twice that.
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
      width: terrain.worldSize,
      height: terrain.worldSize,
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
    // Generated places keep their plain rock walls.
    const other = new ComposedTerrain(composedRegion('bogd-khan-uul'));
    const { walls } = sceneGeometry(other, { x: 2048, y: 1536, width: 1024, height: 1024 });
    expect(walls.weights.length).toBeGreaterThan(0);
    for (let i = 6; i < walls.weights.length; i += 7) expect(walls.weights[i]).toBe(0);
  }, 30_000);

  it('crops every cliff-face band from inside the kit cliff run', () => {
    const atlas = atlasJson(ORKHON_KIT_ATLAS);
    for (const face of ORKHON_CLIFF_FACES) {
      expect(face.sprite).toBe('cliff_straight_run');
      expect(orkhonAtlasOf(face.sprite)).toBe(ORKHON_KIT_ATLAS);
      const { frame } = atlas.frames[face.sprite]!;
      expect(face.x).toBeGreaterThanOrEqual(0);
      expect(face.y).toBeGreaterThanOrEqual(0);
      expect(face.x + ORKHON_CLIFF_FACE_WIDTH, face.sprite).toBeLessThanOrEqual(frame.w);
      expect(face.y + face.height, face.sprite).toBeLessThanOrEqual(frame.h);
    }
  });

  it('packs the mipmapped kit atlas with 16 clear texels around every frame', () => {
    const atlas = atlasJson(ORKHON_KIT_ATLAS);
    const frames = Object.values(atlas.frames).map(({ frame }) => frame);
    const { w, h } = atlas.meta.size;
    for (const a of frames) {
      expect(Math.min(a.x, a.y, w - a.x - a.w, h - a.y - a.h)).toBeGreaterThanOrEqual(16);
      for (const b of frames)
        if (a !== b) {
          const gap = Math.max(b.x - a.x - a.w, a.x - b.x - b.w, b.y - a.y - a.h, a.y - b.y - b.h);
          expect(gap).toBeGreaterThanOrEqual(16);
        }
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
            ).toBeGreaterThan(0.8);
          }
      }
  });

  it('places every packed sprite, so only used pack art is bundled', () => {
    const used = new Set([
      ...sceneDressing(terrain, {
        x: 0,
        y: 0,
        width: terrain.worldSize,
        height: terrain.worldSize,
      }).map((prop) => prop.frame),
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
    const falls = pieces.filter((piece) => piece.part === 'falls');
    expect(falls).toHaveLength(3);
    const floor = terrain.region.scene.floor;
    for (const drop of falls) {
      expect(drop.sprite).toBe('waterfall_curtain');
      // Each curtain shows its whole keyed painting, from the plateau top down to the river.
      const columns = drop.vertices.map((v) => v.pixel[0]);
      expect(Math.min(...columns)).toBe(0);
      expect(Math.max(...columns)).toBe(ORKHON_SPRITES.waterfall_curtain.width);
      const heights = drop.vertices.map((v) => v.position[1]);
      expect(Math.min(...heights)).toBeLessThan(floor);
      expect(Math.max(...heights)).toBeGreaterThan(floor + ORKHON_VALLEY.rise * 0.9);
    }
    // Neighbouring curtains overlap, so no rock shows between them.
    const centres = falls.map((drop) => {
      const xs = drop.vertices.map((v) => v.position[0]);
      return {
        middle: (Math.min(...xs) + Math.max(...xs)) / 2,
        half: (Math.max(...xs) - Math.min(...xs)) / 2,
      };
    });
    for (let i = 1; i < centres.length; i++)
      expect(centres[i]!.middle - centres[i - 1]!.middle).toBeLessThan(
        centres[i]!.half + centres[i - 1]!.half,
      );
    // One plunge pool stands in front of the curtains' foot, on the river head.
    const pools = pieces.filter((piece) => piece.part === 'pool');
    expect(pools).toHaveLength(1);
    const pool = pools[0]!;
    expect(pool.sprite).toBe('waterfall_foam_pool');
    const base = pool.vertices.filter((v) => v.position[1] < floor + 1);
    const foot = {
      x: base.reduce((sum, v) => sum + v.position[0], 0) / base.length,
      y: base.reduce((sum, v) => sum + v.position[2], 0) / base.length,
    };
    expect(terrain.river!.sample(foot.x, foot.y).shoreDistance).toBeLessThan(0);
    const towardCamera =
      (foot.x - C - ORKHON_VALLEY.waterfall.x) * CAMERA_DIRECTION.x +
      (foot.y - C - ORKHON_VALLEY.waterfall.y) * CAMERA_DIRECTION.y;
    expect(towardCamera).toBeGreaterThan(20);
  });

  it('lines both riverbanks with the kit bank bands, but not along cliffs or under the bridge', () => {
    const strips = orkhonBanks(terrain);
    expect(strips.map((strip) => strip.bank).sort()).toEqual(Object.keys(ORKHON_BANKS).sort());
    const floor = terrain.region.scene.floor;
    let checked = 0;
    for (const strip of strips) {
      expect(strip.positions.length).toBeGreaterThan(300);
      expect(strip.positions.length % 9).toBe(0);
      expect(strip.uv.length / 2).toBe(strip.positions.length / 3);
      for (let i = 0; i < strip.positions.length / 3; i++) {
        const x = strip.positions[i * 3]!,
          y = strip.positions[i * 3 + 1]!,
          z = strip.positions[i * 3 + 2]!;
        const v = strip.uv[i * 2 + 1]!;
        // The painted water edge lies on the shoreline: land above it, water below it.
        const shore = terrain.river!.sample(x, z).shoreDistance;
        const expected = (ORKHON_BANK_SHORE - v) * BANK_ACROSS;
        expect(Math.abs(shore - expected), `${strip.bank} ${v}`).toBeLessThan(BANK_ACROSS * 0.35);
        // Bands lie on the valley floor and the water surface, never up a cliff.
        expect(y).toBeLessThan(floor + 30);
        expect(terrain.river!.bridgeHeight(x, z)).toBeUndefined();
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(500);
    // The far band covers shores whose land lies away from the camera, the near band the others.
    for (const strip of strips) {
      let agree = 0,
        total = 0;
      for (let i = 0; i < strip.positions.length / 3; i++) {
        if (strip.uv[i * 2 + 1] !== 0) continue;
        const x = strip.positions[i * 3]!,
          z = strip.positions[i * 3 + 2]!;
        // At the river's head the nearest shore is its end, so the side is ambiguous there.
        const falls = ORKHON_VALLEY.waterfall;
        if (Math.hypot(x - C - falls.x, z - C - falls.y) < 300) continue;
        const shore = (px: number, pz: number) => terrain.river!.sample(px, pz).shoreDistance;
        const land = { x: shore(x + 4, z) - shore(x - 4, z), y: shore(x, z + 4) - shore(x, z - 4) };
        const toward = land.x * CAMERA_DIRECTION.x + land.y * CAMERA_DIRECTION.y > 0;
        if (toward === (strip.bank === 'bankNear')) agree++;
        total++;
      }
      expect(agree / total, strip.bank).toBeGreaterThan(0.9);
    }
  });
});

describe('Orkhon Valley landmark systems', () => {
  it('sends ordinary arrivals from the direction of a raider camp', () => {
    const anchor = camp;
    for (const [index, camp] of ORKHON_ENEMY_CAMPS.entries()) {
      const pick = (index + 0.5) / ORKHON_ENEMY_CAMPS.length;
      const draws = [pick, 0.5];
      const angle = ambientArrivalAngle('orkhon-valley', anchor, () => draws.shift()!);
      expect(angle).toBeCloseTo(Math.atan2(C + camp.y - anchor.y, C + camp.x - anchor.x));
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
      expect(composedRegion(id).scene.shelves[0]!.id).toBe(
        id === 'altan-ovoo'
          ? 'cinder-cone'
          : id === 'otgontenger'
            ? 'alpine-bench'
            : id === 'eej-khairkhan'
              ? 'granite-terrace'
              : id === 'belukha'
                ? 'twin-summit-headwall'
                : id === 'khan-tengri'
                  ? 'lateral-moraine-terrace'
                  : id === 'bogd-khan-uul'
                    ? 'southern-woodland-shoulder'
                    : 'camp-shelf',
      );
    }
  });
});
