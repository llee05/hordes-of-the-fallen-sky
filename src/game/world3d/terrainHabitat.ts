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
  /** 1 across the open ground around the camp, fading to 0 by 1000 units out. */
  clearing: number;
}

/**
 * The two smooth inputs of moisture that depend only on ground position: broad coherent noise
 * and nearness to the river. Orkhon bakes them into its ground mask (`orkhonGround.ts`).
 */
export function habitatFields(
  terrain: ComposedTerrain,
  x: number,
  z: number,
): { broad: number; shore: number } {
  const bank = terrain.river?.sample(x, z);
  return {
    broad: coherentNoise(x / 870, z / 870, terrain.seed + 307),
    shore: bank ? 1 - smoothstep(10, 110, bank.shoreDistance) : 0,
  };
}

/** Moisture from the position fields, height above the scene floor and the surface normal. */
export function habitatMoisture(
  broad: number,
  shore: number,
  elevation: number,
  normalY: number,
  desert: boolean,
): { moisture: number; exposure: number } {
  const exposure = clamp01(
    smoothstep(120, 650, elevation) * 0.55 + (1 - normalY) * 0.8 + (1 - broad) * 0.25,
  );
  const moisture = clamp01(
    0.18 + broad * 0.48 + shore * 0.64 - exposure * 0.26 - (desert ? 0.42 : 0),
  );
  return { moisture, exposure };
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
  const { broad, shore } = habitatFields(terrain, x, z);
  const wx = x + (broad - 0.5) * 180;
  const patch = coherentNoise(wx / 170, z / 210, seed + 311);
  const grove = coherentNoise(wx / 390, z / 440, seed + 313);
  const { moisture, exposure } = habitatMoisture(
    broad,
    shore,
    height - scene.floor,
    normalY,
    scene.vegetation === 'desert',
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
  const clearing = 1 - smoothstep(750, 1000, Math.hypot(cx, cz));
  const ground = scene.ground;
  const road = ground
    ? Math.max(
        1 - smoothstep(ground.width * 0.2, ground.width * 0.8, pathDistance(ground.paths, cx, cz)),
        rampWear(ground.ramps ?? [], cx, cz),
      )
    : (1 - smoothstep(14, 48 + patch * 35, Math.abs(cz))) *
      smoothstep(-150, 150, cx) *
      (1 - smoothstep(1450, 1600, cx));
  return {
    moisture,
    exposure,
    grove,
    shore,
    cliffFoot,
    cliffTop,
    wear: Math.max(hearth, road * (ground ? 0.9 : 0.65)),
    patch,
    clearing,
  };
}

/** Graded ramps are worn bare across their whole walkable width. */
export function rampWear(
  ramps: readonly {
    foot: { x: number; y: number };
    top: { x: number; y: number };
    halfWidth: number;
  }[],
  x: number,
  z: number,
): number {
  let wear = 0;
  for (const ramp of ramps) {
    const dx = ramp.top.x - ramp.foot.x,
      dz = ramp.top.y - ramp.foot.y;
    const t = ((x - ramp.foot.x) * dx + (z - ramp.foot.y) * dz) / (dx * dx + dz * dz || 1);
    const distance = pathDistance([[ramp.foot, ramp.top]], x, z);
    wear = Math.max(
      wear,
      (1 - smoothstep(ramp.halfWidth * 0.6, ramp.halfWidth * 0.95, distance)) *
        smoothstep(-0.2, 0.05, t) *
        (1 - smoothstep(0.95, 1.2, t)),
    );
  }
  return wear;
}

export function pathDistance(
  paths: readonly (readonly { x: number; y: number }[])[],
  x: number,
  z: number,
): number {
  let best = Infinity;
  for (const path of paths)
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!,
        b = path[i]!;
      const dx = b.x - a.x,
        dz = b.y - a.y;
      const t = clamp01(((x - a.x) * dx + (z - a.y) * dz) / (dx * dx + dz * dz || 1));
      best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.y - dz * t));
    }
  return best;
}

/**
 * Authored ground uses the same seven channels for the terrain kit tiles: valley grass (calm with
 * olive regions), trail dirt, scree, sun-cured straw and plateau moss; the last two channels are
 * unused because the kit's painted bank bands line the river (`orkhonBanks`). Most of the valley is calm grass; straw forms a few broad, rare
 * regions on the valley floor, away from the camp. Elevation reads from tone alone: plateau tops are the darker moss
 * right up to the cliff's inked lip.
 */
export function authoredMaterialWeights(
  terrain: ComposedTerrain,
  height: number,
  normalY: number,
  habitat: TerrainHabitat,
): readonly number[] {
  const scene = terrain.region.scene;
  const rise = Math.max(1, ...scene.shelves.map((shelf) => shelf.rise));
  const top = smoothstep(rise * 0.55, rise * 0.85, height - scene.floor);
  // Scree gathers below the cliffs; plateau tops stay grassy up to the painted lip.
  const stone = clamp01(
    smoothstep(0.3, 0.62, 1 - normalY) + Math.pow(habitat.cliffFoot, 4) * (1 - top) * 0.6,
  );
  const soil = (1 - stone) * habitat.wear;
  const cover = (1 - stone) * (1 - habitat.wear);
  // Straw is warmer and busier than the calm grass, so the camp's open fighting ground keeps none.
  const dry = (1 - smoothstep(0.24, 0.3, habitat.moisture)) * (1 - top) * (1 - habitat.clearing);
  const grass = cover * (1 - dry);
  return [grass * (1 - top), soil, stone, cover * dry, grass * top, 0, 0];
}

/** Seven existing channels: healthy grass, soil, stone, dry grass, snow, ice, gravel. */
export function terrainMaterialWeights(
  terrain: ComposedTerrain,
  height: number,
  normalY: number,
  habitat: TerrainHabitat,
): readonly number[] {
  if (terrain.region.scene.ground)
    return authoredMaterialWeights(terrain, height, normalY, habitat);
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
