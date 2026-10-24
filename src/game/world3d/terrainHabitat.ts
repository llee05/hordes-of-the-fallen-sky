import { clamp01, coherentNoise, smoothstep } from '../terrain/noise';
import type { ComposedTerrain } from './ComposedTerrain';

export interface TerrainHabitat {
  moisture: number;
  exposure: number;
  grove: number;
  shore: number;
  cliffFoot: number;
  cliffTop: number;
  wear: number;
  patch: number;
}

/** Global ecology masks: materials and vegetation describe the same landscape across chunk edges. */
export function terrainHabitat(
  terrain: ComposedTerrain,
  x: number,
  z: number,
  height: number,
  normalY: number,
): TerrainHabitat {
  const seed = terrain.seed;
  const scene = terrain.region.scene;
  const broad = coherentNoise(x / 870, z / 870, seed + 307);
  const wx = x + (broad - 0.5) * 180;
  const patch = coherentNoise(wx / 170, z / 210, seed + 311);
  const grove = coherentNoise(wx / 390, z / 440, seed + 313);
  const distance = terrain.river?.distance(x, z) ?? Infinity;
  const halfWidth = (terrain.river?.definition.width ?? 0) / 2;
  const shore = 1 - smoothstep(halfWidth + 12, halfWidth + 110, distance);
  const elevation = height - scene.floor;
  const exposure = clamp01(
    smoothstep(120, 650, elevation) * 0.55 + (1 - normalY) * 0.8 + (1 - broad) * 0.25,
  );
  const moisture = clamp01(
    0.18 +
      broad * 0.48 +
      shore * 0.64 -
      exposure * 0.26 -
      (scene.vegetation === 'desert' ? 0.42 : 0),
  );
  let cliffFoot = 0,
    cliffTop = 0;
  for (const layer of terrain.node(x, z).layers!) {
    if (layer.rise < 70) continue;
    if (layer.field < 0) cliffFoot = Math.max(cliffFoot, 1 - smoothstep(10, 145, -layer.field));
    else cliffTop = Math.max(cliffTop, 1 - smoothstep(8, 75, layer.field));
  }
  const cx = x - terrain.worldSize / 2,
    cz = z - terrain.worldSize / 2;
  const hearth = (1 - smoothstep(60, 180, Math.hypot(cx, cz))) * 0.7;
  const road =
    (1 - smoothstep(14, 48 + patch * 35, Math.abs(cz))) *
    smoothstep(-150, 150, cx) *
    (1 - smoothstep(1450, 1600, cx));
  return {
    moisture,
    exposure,
    grove,
    shore,
    cliffFoot,
    cliffTop,
    wear: Math.max(hearth, road * 0.65),
    patch,
  };
}

/** Seven existing channels: healthy grass, soil, stone, dry grass, snow, ice, gravel. */
export function terrainMaterialWeights(
  terrain: ComposedTerrain,
  height: number,
  normalY: number,
  habitat: TerrainHabitat,
): readonly number[] {
  const snow = terrain.snowAt(height, normalY);
  const arid = terrain.region.scene.vegetation === 'desert';
  const rock = clamp01(
    smoothstep(0.12, 0.62, 1 - normalY) +
      habitat.cliffTop * 0.3 +
      smoothstep(0.68, 0.88, habitat.patch) * habitat.exposure * 0.55,
  );
  const soil = clamp01(
    habitat.wear * 0.75 + smoothstep(0.5, 0.77, habitat.patch) * 0.5 + (arid ? 0.55 : 0.04),
  );
  const gravel = clamp01(habitat.shore * 0.6 + habitat.cliffFoot * 0.7 + (arid ? 0.15 : 0));
  const dry = clamp01(0.85 - habitat.moisture * 1.25 + habitat.exposure * 0.25 + (arid ? 0.2 : 0));
  const ground = (1 - rock) * (1 - snow);
  const grass = ground * (1 - soil) * (1 - gravel);
  return [
    grass * (1 - dry),
    ground * soil,
    rock * (1 - snow),
    grass * dry,
    snow * 0.94,
    snow * 0.06,
    ground * (1 - soil) * gravel,
  ];
}
