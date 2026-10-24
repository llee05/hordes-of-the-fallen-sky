import type { MountainTerrain } from './MountainTerrain';
import { smoothstep } from './noise';
import type { TerrainSample } from './types';

/** Broad landform light plus short, soft upper-left horizon shadows. No bitmap is generated. */
export function terrainLighting(terrain: MountainTerrain, sample: TerrainSample): number {
  const { x, y, elevation } = sample;
  const scale = terrain.region.biome.heightScale;
  const radius = 128;
  const dx =
    ((terrain.height(x + radius, y) - terrain.height(x - radius, y)) * scale) / (radius * 2);
  const dy =
    ((terrain.height(x, y + radius) - terrain.height(x, y - radius)) * scale) / (radius * 2);
  const diffuse = Math.max(0, (dx * 0.48 + dy * 0.57 + 0.67) / Math.hypot(dx, dy, 1));
  let shadow = 0;
  for (const distance of [112, 256]) {
    const occlusion =
      (terrain.height(x - distance * 0.64, y - distance * 0.77) - elevation) * scale -
      distance * 0.72;
    shadow = Math.max(shadow, smoothstep(-25, 110, occlusion));
  }
  // A bright ambient floor preserves painted detail and readable enemies in shaded valleys.
  return Math.max(0.56, Math.min(1.06, (0.7 + diffuse * 0.36) * (1 - shadow * 0.2)));
}
