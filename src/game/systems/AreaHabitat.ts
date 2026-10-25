import { GAME } from '../config';
import type { AreaHabitat } from '../data/areaEncounters';
import type { LocationId } from '../types';
import { LANDSCAPES } from '../data/landscapes';
import { riverChannels } from '../assets/riverGeometry';
import { coherentNoise, terrainSeed } from '../terrain/noise';
import type { MountainTerrain } from '../terrain/MountainTerrain';
import { ComposedTerrain } from '../world3d/ComposedTerrain';
import { terrainHabitat } from '../world3d/terrainHabitat';
export interface AreaSurface {
  grove: number;
  shore: number;
  ridge: number;
  snow: number;
  shelter: number;
  open: number;
}
const caches = new WeakMap<MountainTerrain, Map<string, AreaSurface>>();
const flat = new Map<string, AreaSurface>();
const rivers = new Map<LocationId, ReturnType<typeof riverChannels>>();
/** Uses the exact ecology masks that place rendered groves, shores and cliff-foot rubble. */
export function areaSurface(
  terrain: MountainTerrain | undefined,
  id: LocationId,
  x: number,
  y: number,
): AreaSurface {
  const onBridge =
    terrain instanceof ComposedTerrain && terrain.river?.bridgeHeight(x, y) !== undefined;
  const size = GAME.terrain.cellSize;
  const column = Math.floor(x / size),
    row = Math.floor(y / size),
    key = `${id}:${column}:${row}`;
  const cache = terrain ? (caches.get(terrain) ?? new Map<string, AreaSurface>()) : flat;
  if (terrain && !caches.has(terrain)) caches.set(terrain, cache);
  const old = cache.get(key);
  if (old) return onBridge ? { ...old, shore: 0 } : old;
  x = (column + 0.5) * size;
  y = (row + 0.5) * size;
  let value: AreaSurface;
  if (terrain instanceof ComposedTerrain) {
    const s = terrain.sample(x, y),
      height = s.elevation * terrain.region.biome.heightScale;
    const h = terrainHabitat(terrain, x, y, height, 1 / Math.hypot(1, s.slope));
    const protectedGround = terrain.protection(x, y);
    const grove =
      protectedGround < 0.2 && s.slope < 0.38 && terrain.snowAt(height, 1) < 0.65 ? h.grove : 0;
    const bridge = terrain.river?.bridgeHeight(x, y) !== undefined;
    value = {
      grove,
      shore: bridge ? 0 : h.shore,
      ridge: Math.max(h.cliffFoot, h.cliffTop),
      snow: terrain.snowAt(height, 1),
      shelter: h.cliffFoot,
      open: 1 - Math.max(h.cliffFoot, grove * 0.6),
    };
  } else {
    const seed = terrainSeed(id),
      s = terrain?.sample(x, y),
      grove = coherentNoise(x / 390, y / 440, seed);
    const water = LANDSCAPES[id].water;
    let shore = 0;
    if (water) {
      let channels = rivers.get(id);
      if (!channels) {
        channels = riverChannels(water);
        rivers.set(id, channels);
      }
      let distance = Infinity;
      for (const channel of channels)
        for (let i = 0; i < channel.sections.length; i += 4) {
          const p = channel.sections[i]!;
          distance = Math.min(
            distance,
            Math.hypot(x - GAME.worldSize / 2 - p.x, y - GAME.worldSize / 2 - p.y),
          );
        }
      shore = Math.max(0, 1 - distance / (water.width / 2 + 110));
    }
    value = {
      grove,
      shore,
      ridge: s?.cliff ?? 0,
      shelter: s?.cliff ?? 0,
      snow: s?.weights[4] ?? (LANDSCAPES[id].surface === 'frost' ? 0.5 : 0),
      open: 1 - (s?.cliff ?? 0),
    };
  }
  cache.set(key, value);
  if (cache.size > GAME.areaCombat.cachedCells) cache.delete(cache.keys().next().value!);
  return onBridge ? { ...value, shore: 0 } : value;
}
export function habitatPreference(surface: AreaSurface, habitat: AreaHabitat): number {
  return habitat === 'ridge' ? Math.max(surface.ridge, surface.snow * 0.4) : surface[habitat];
}

/** Bank approaches follow the same curved course as the rendered water, including braided channels. */
export function areaRiverTangent(
  terrain: MountainTerrain | undefined,
  id: LocationId,
  anchor: { x: number; y: number },
  fallback: number,
): number {
  const water = LANDSCAPES[id].water;
  const channels =
    terrain instanceof ComposedTerrain
      ? terrain.river?.channels
      : water
        ? (rivers.get(id) ?? riverChannels(water))
        : undefined;
  if (!channels?.length) return fallback;
  if (!terrain && water && !rivers.has(id)) rivers.set(id, channels);
  const center = terrain?.worldSize ? terrain.worldSize / 2 : GAME.worldSize / 2;
  let best = Infinity,
    angle = fallback;
  for (const channel of channels)
    for (let i = 0; i < channel.sections.length; i += 4) {
      const s = channel.sections[i]!,
        distance = (anchor.x - center - s.x) ** 2 + (anchor.y - center - s.y) ** 2;
      if (distance < best) {
        best = distance;
        angle = Math.atan2(-s.nx, s.ny);
      }
    }
  return angle;
}
