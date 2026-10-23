import { LANDSCAPES, type SceneryProp } from '../data/landscapes';
import type { LocationId } from '../types';
import { GAME } from '../config';
import { isRiverWater, riverChannels } from './riverGeometry';

export interface LandscapeProp {
  prop: SceneryProp;
  x: number;
  y: number;
  width: number;
  flip: boolean;
}

/** Keep the camp and the complete eastbound caravan corridor clear of tall scenery. */
export function isLandscapeClearing(x: number, y: number): boolean {
  return x > -280 && x < 1480 && y > -210 && y < 255;
}

export function landscapeRandom(id: LocationId): () => number {
  let seed = 2166136261;
  for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed += 0x6d2b79f5;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bounded, reproducible dressing; no Phaser, physics, or simulation state. */
export function landscapeCover(id: LocationId): readonly LandscapeProp[] {
  const definition = LANDSCAPES[id];
  const random = landscapeRandom(id);
  const channels = definition.water ? riverChannels(definition.water) : [];
  const half = GAME.worldSize / 2 - 120;
  const props: LandscapeProp[] = [];
  for (const cover of definition.cover) {
    for (let i = 0; i < cover.count; i += 1) {
      const width = cover.width[0] + random() * (cover.width[1] - cover.width[0]);
      for (let attempt = 0; attempt < 30; attempt += 1) {
        // A few authored-neighborhood representatives keep the opening view and crossing dressed.
        const x =
          i < 16
            ? random() * 1500 - 750
            : i < 26
              ? random() * 1100 + 450
              : (random() * 2 - 1) * half;
        const y = i < 26 ? random() * 1060 - 460 : (random() * 2 - 1) * half;
        if (isLandscapeClearing(x, y)) continue;
        if (isRiverWater(channels, x, y, width * 0.2 + 14)) continue;
        // Keep complete painted silhouettes apart, including the space above their ground anchors.
        if (
          definition.landmarks.some(
            (landmark) =>
              Math.abs(x - landmark.x) < (width + landmark.width) / 2 + 16 &&
              y > landmark.y - landmark.width * 0.94 - 16 &&
              y - width * 0.94 < landmark.y + 16,
          )
        )
          continue;
        props.push({
          prop: cover.prop,
          x,
          y,
          width,
          flip: random() > 0.5,
        });
        break;
      }
    }
  }
  return props;
}
