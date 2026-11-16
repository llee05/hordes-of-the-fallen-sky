import { beforeAll, describe, expect, it } from 'vitest';
import { ORKHON_SPRITES, orkhonAtlasOf } from '../../src/game/assets/orkhonValleyArt';
import { AREA_ENCOUNTERS } from '../../src/game/data/areaEncounters';
import { DESTINATIONS, LOCATIONS } from '../../src/game/data/clan';
import { AREA_ENEMIES } from '../../src/game/data/enemies';
import {
  KARAKORUM,
  KARAKORUM_FIELD_SITES,
  KARAKORUM_FOOTPRINTS,
  KARAKORUM_SITES,
} from '../../src/game/data/karakorum';
import { LANDSCAPES } from '../../src/game/data/landscapes';
import { WORLD_REGIONS, composedRegion } from '../../src/game/data/worldRegions';
import { createDeveloperRun } from '../../src/game/dev/levels';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { availableDestinations } from '../../src/game/state/journey';
import { createRun } from '../../src/game/state/run';
import { ambientArrivalAngle, authoredFieldSite } from '../../src/game/systems/authoredSites';
import { TerrainNavigation } from '../../src/game/terrain/TerrainNavigation';
import type { TerrainPoint } from '../../src/game/terrain/types';
import { ComposedTerrain } from '../../src/game/world3d/ComposedTerrain';
import {
  karakorumDressing,
  karakorumDressingClear,
  karakorumLandmarkAt,
} from '../../src/game/world3d/karakorumDressing';
import { sceneDressing } from '../../src/game/world3d/sceneDressing';
import { journalMenu } from '../../src/ui/menuContent';
import { world as archivedWorld } from './fixtures/expedition';

const terrain = new ComposedTerrain(composedRegion('karakorum'), LANDSCAPES.karakorum.water);
const centre = KARAKORUM.world.terrainSize / 2;
const world = (point: TerrainPoint): TerrainPoint => ({
  x: centre + point.x,
  y: centre + point.y,
});
let navigation: TerrainNavigation;

beforeAll(() => {
  navigation = new TerrainNavigation(terrain);
});

const samePoint = (a: TerrainPoint, b: TerrainPoint) => a.x === b.x && a.y === b.y;

describe('Karakorum catalogue boundaries', () => {
  it('is a ninth prologue-only place but a playable developer checkpoint', () => {
    expect(LOCATIONS).toHaveLength(9);
    expect(LOCATIONS.find((location) => location.id === 'karakorum')).toMatchObject({
      name: 'Karakorum',
      prologueOnly: true,
    });
    expect(DESTINATIONS).toHaveLength(8);
    expect(DESTINATIONS.map(({ id }) => id)).not.toContain('karakorum');
    expect(createDeveloperRun('place:karakorum')?.clan.locationId).toBe('karakorum');
  });

  it('never appears in normal migration choices or the journey map', () => {
    const run = createRun();
    expect(availableDestinations(run).map(({ id }) => id)).not.toContain('karakorum');
    expect(journalMenu(run, 'journey')).not.toContain('Karakorum');
  });

  it('defines one area encounter backed by exactly two local native variants', () => {
    const encounter = AREA_ENCOUNTERS.karakorum;
    expect(encounter.natives).toEqual(['ash-maned-prowler', 'westward-shade']);
    expect(AREA_ENEMIES.filter((enemy) => enemy.home === 'karakorum').map(({ id }) => id)).toEqual(
      encounter.natives,
    );
  });

  it('round-trips a save made at Karakorum', () => {
    const run = createDeveloperRun('place:karakorum')!;
    const restored = decodeExpedition(captureExpedition(run, archivedWorld()));
    expect(restored.summary.location).toBe('Karakorum');
    expect(restored.run.clan.locationId).toBe('karakorum');
    expect(restored.run.phase).toBe('paused');
  });
});

describe('Karakorum authored layout and navigation', () => {
  it('uses the approved broad rectangle, low relief and unraised camp', () => {
    expect(KARAKORUM.world).toEqual({
      width: 6400,
      height: 4000,
      terrainSize: 8704,
      minX: -3200,
      minY: -2000,
      camp: KARAKORUM_SITES.campSite,
      campClearRadius: 520,
    });
    expect(WORLD_REGIONS.karakorum).toMatchObject({
      campShelf: false,
      relief: 0.22,
      shelves: [],
      playBounds: { x: -3200, y: -2000, width: 6400, height: 4000 },
    });
    expect(terrain.playBounds).toEqual({ x: 1152, y: 2352, width: 6400, height: 4000 });
    expect(terrain.campPosition).toEqual(world(KARAKORUM_SITES.campSite));
  });

  it('connects every road endpoint to a named site or another road', () => {
    const named = [
      KARAKORUM_SITES.gate,
      KARAKORUM_SITES.yard,
      ...KARAKORUM_SITES.westTrack,
      KARAKORUM_SITES.cart,
      KARAKORUM_SITES.omen,
      KARAKORUM_SITES.rally,
      KARAKORUM_SITES.campSite,
      KARAKORUM_SITES.reportPost,
    ];
    for (const path of KARAKORUM.paths) {
      expect(path.length).toBeGreaterThanOrEqual(2);
      for (const point of path) {
        expect(point.x).toBeGreaterThanOrEqual(KARAKORUM.world.minX);
        expect(point.x).toBeLessThanOrEqual(KARAKORUM.world.minX + KARAKORUM.world.width);
        expect(point.y).toBeGreaterThanOrEqual(KARAKORUM.world.minY);
        expect(point.y).toBeLessThanOrEqual(KARAKORUM.world.minY + KARAKORUM.world.height);
      }
      for (const endpoint of [path[0]!, path.at(-1)!])
        expect(
          named.some((site) => samePoint(site, endpoint)) ||
            KARAKORUM.paths.some((other) =>
              other.slice(1, -1).some((point) => samePoint(point, endpoint)),
            ),
          `${endpoint.x},${endpoint.y}`,
        ).toBe(true);
    }
  });

  it('keeps the camp and every named site on connected walkable ground', () => {
    const sites = [
      KARAKORUM_SITES.gate,
      KARAKORUM_SITES.yard,
      ...KARAKORUM_SITES.westTrack,
      KARAKORUM_SITES.cart,
      KARAKORUM_SITES.omen,
      KARAKORUM_SITES.rally,
      KARAKORUM_SITES.campSite,
      KARAKORUM_SITES.reportPost,
    ];
    for (const site of sites) {
      const point = world(site);
      expect(navigation.isWalkable(point.x, point.y, 24, true), `${site.x},${site.y}`).toBe(true);
    }
  });

  it('keeps the decorative river on the north edge and city footprints solid', () => {
    expect(KARAKORUM.river.course.every((value, index) => index % 2 === 0 || value < -1450)).toBe(
      true,
    );
    const riverPoint = world({ x: KARAKORUM.river.course[4]!, y: KARAKORUM.river.course[5]! });
    expect(terrain.river?.sample(riverPoint.x, riverPoint.y).shoreDistance).toBeLessThan(0);
    expect(KARAKORUM_FOOTPRINTS.length).toBeGreaterThanOrEqual(10);
    for (const landmark of KARAKORUM_FOOTPRINTS)
      expect(navigation.isWalkable(centre + landmark.x, centre + landmark.y), landmark.id).toBe(
        false,
      );
  });

  it('provides reachable authored field sites and western arrival bearings', () => {
    for (let issued = 0; issued < KARAKORUM_FIELD_SITES.length; issued++) {
      const site = authoredFieldSite('karakorum', issued)!;
      expect(site).toEqual(world(KARAKORUM_FIELD_SITES[issued]!));
      expect(navigation.isWalkable(site.x, site.y, 24, true)).toBe(true);
    }
    const anchor = world(KARAKORUM_SITES.campSite);
    const angle = ambientArrivalAngle('karakorum', anchor, () => 0);
    expect(Math.cos(angle)).toBeLessThan(0);
  });
});

describe('Karakorum placeholder dressing', () => {
  const bounds = {
    x: 0,
    y: 0,
    width: KARAKORUM.world.terrainSize,
    height: KARAKORUM.world.terrainSize,
  };
  const all = karakorumDressing('karakorum-test', bounds);

  it('is deterministic, chunk-stable and routed through the shared dispatcher', () => {
    expect(karakorumDressing('karakorum-test', bounds)).toEqual(all);
    const half = KARAKORUM.world.terrainSize / 2;
    const parts = [0, half].flatMap((x) =>
      [0, half].flatMap((y) =>
        karakorumDressing('karakorum-test', { x, y, width: half, height: half }),
      ),
    );
    const sorted = (items: typeof all) => items.map((item) => JSON.stringify(item)).sort();
    expect(sorted(parts)).toEqual(sorted(all));
    expect(sceneDressing(terrain, bounds)).toEqual(karakorumDressing(terrain.seed, bounds));
  });

  it('places every authored landmark once from bundled Orkhon frames without tinting', () => {
    const landmarks = all.filter((prop) => prop.kind === 'landmark');
    expect(landmarks).toHaveLength(KARAKORUM.landmarks.length);
    expect(landmarks.map(({ frame }) => frame)).toEqual(
      expect.arrayContaining([
        'enemy_camp_palisade',
        'player_ger_small',
        'player_ger_medium',
        'camp_canopy',
        'blue_camp_banner',
        'spear_rack',
        'wooden_rack',
        'standing_stone',
      ]),
    );
    for (const prop of landmarks) {
      expect(ORKHON_SPRITES).toHaveProperty(prop.frame);
      expect(prop.texture).toBe(orkhonAtlasOf(prop.frame as keyof typeof ORKHON_SPRITES));
      expect(prop.tint).toBe(0xffffff);
      expect(karakorumLandmarkAt(prop)).toBeDefined();
    }
  });

  it('keeps ambient groves and pasture accents clear of roads, water, camp and footprints', () => {
    expect(all.length).toBeGreaterThan(KARAKORUM.landmarks.length + 25);
    for (const prop of all.filter((item) => item.kind !== 'landmark'))
      expect(
        karakorumDressingClear({ x: prop.x - centre, y: prop.z - centre }, 76),
        `${prop.frame}@${prop.x - centre},${prop.z - centre}`,
      ).toBe(true);
  });
});
