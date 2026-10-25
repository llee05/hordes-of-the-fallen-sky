import type { LocationId } from '../types';
import { LANDSCAPES, type LandscapeDefinition } from './landscapes';
import { composedRegion, type ComposedRegion, type SceneShelf } from './worldRegions';

/** Route geography reuses the area's palette and current terrain/water renderer. */
export function crossingLandscape(
  id: LocationId,
  route?: string,
): { landscape: LandscapeDefinition; terrain: ComposedRegion } {
  const landscape = LANDSCAPES[id],
    terrain = composedRegion(id);
  if (route === 'river')
    return {
      landscape: {
        ...landscape,
        water: {
          kind: landscape.water?.kind === 'frozen' ? 'frozen' : 'stream',
          width: 190,
          color: landscape.water?.color ?? 0x719c94,
          bank: landscape.water?.bank ?? 0x98a873,
          course: [-1800, -900, 500, -650, 820, 0, 1000, 700, 2200, 1200],
        },
      },
      terrain,
    };
  if (route === 'ridge') {
    const shoulder = (side: number): SceneShelf => ({
      id: `crossing-shoulder-${side}`,
      x: 700,
      z: side * 620,
      width: 500,
      depth: 240,
      rise: 120,
      turn: side * 8,
      fracture: 75,
      ramp: {
        start: { x: 250, y: side * 340 },
        end: { x: 700, y: side * 600 },
        halfWidth: 160,
        shoulder: 280,
      },
    });
    return {
      landscape,
      terrain: {
        ...terrain,
        scene: {
          ...terrain.scene,
          shelves: [...terrain.scene.shelves.slice(0, 6), shoulder(-1), shoulder(1)],
        },
      },
    };
  }
  return { landscape, terrain };
}
