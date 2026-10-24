import type { TerrainBounds } from '../terrain/types';
import { coherentNoise } from '../terrain/noise';
import { ComposedTerrain } from './ComposedTerrain';

export type SceneProp = 'pine' | 'larch' | 'willow' | 'boulders' | 'scrub' | 'crag';
export interface SceneDressing {
  x: number;
  z: number;
  kind: SceneProp;
  width: number;
  flip: boolean;
}

/** Clusters follow vegetation zones and shelf feet, leaving the camp and road readable. */
export function sceneDressing(terrain: ComposedTerrain, bounds: TerrainBounds): SceneDressing[] {
  const result: SceneDressing[] = [];
  const vegetation = terrain.region.scene.vegetation;
  for (let row = Math.floor(bounds.y / 128); row * 128 < bounds.y + bounds.height; row++)
    for (
      let column = Math.floor(bounds.x / 128);
      column * 128 < bounds.x + bounds.width;
      column++
    ) {
      const random = (offset: number) =>
        coherentNoise(column, row, terrain.seed + 91 + offset * 1663);
      const x = column * 128 + 24 + random(1) * 80;
      const z = row * 128 + 24 + random(2) * 80;
      if (
        x < bounds.x ||
        z < bounds.y ||
        x >= bounds.x + bounds.width ||
        z >= bounds.y + bounds.height ||
        terrain.protection(x, z) > 0.15
      )
        continue;
      if (
        terrain.river &&
        terrain.river.distance(x, z) < terrain.river.definition.width * 0.65 + 25
      )
        continue;
      const node = terrain.node(x, z);
      const sample = terrain.sample(x, z);
      const height = sample.elevation * terrain.region.biome.heightScale;
      if (sample.slope > 0.7 || terrain.snowAt(height, 1) > 0.75) continue;
      const foot = node.layers!.some(
        (layer) => layer.field < 0 && layer.field > -140 && layer.rise > 100,
      );
      const noise = random(4);
      let kind: SceneProp;
      let width: number;
      if (foot && noise < 0.4) {
        kind = 'boulders';
        width = 55 + random(5) * 55;
      } else if (vegetation === 'desert') {
        if (noise < 0.72) continue;
        kind = noise > 0.86 ? 'crag' : 'scrub';
        width = kind === 'crag' ? 90 : 36;
      } else if (vegetation === 'woodland' && noise > 0.35) {
        kind = random(5) > 0.57 ? 'larch' : 'pine';
        width = 105 + random(6) * 65;
      } else if (
        vegetation === 'meadow' &&
        noise > 0.65 &&
        coherentNoise(x / 450, z / 450, terrain.seed + 89) > 0.48
      ) {
        kind = random(5) > 0.55 ? 'larch' : 'willow';
        width = 115 + random(6) * 55;
      } else if (vegetation === 'river' && noise > 0.45) {
        kind = random(5) > 0.65 ? 'willow' : 'scrub';
        width = kind === 'willow' ? 140 : 40;
      } else if (
        vegetation === 'alpine' &&
        noise > 0.8 &&
        height < terrain.region.scene.snowLine - 40
      ) {
        kind = 'pine';
        width = 90 + random(6) * 35;
      } else if (noise > 0.73) {
        kind = noise > 0.92 ? 'boulders' : 'scrub';
        width = kind === 'boulders' ? 65 : 38;
      } else continue;
      result.push({ x, z, kind, width, flip: random(7) > 0.5 });
    }
  return result.slice(0, 14);
}
