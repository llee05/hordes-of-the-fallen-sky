import type { TerrainPoint } from '../terrain/types';
import type { MountainHeightfield } from './MountainHeightfield';

/** Ground-following combat keeps its 2D range; arrows stop at a discontinuous wall. */
export function projectileTerrainClear(
  terrain: MountainHeightfield,
  from: TerrainPoint,
  to: TerrainPoint,
): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 8));
  let previous = terrain.height(from.x, from.y) * terrain.region.biome.heightScale;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const next =
      terrain.height(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t) *
      terrain.region.biome.heightScale;
    if (Math.abs(next - previous) > 48) return false;
    previous = next;
  }
  return true;
}
