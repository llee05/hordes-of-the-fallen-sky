import { LANDSCAPES, type SceneryProp } from '../data/landscapes';
import type { LocationId } from '../types';

export function isLandscapeVegetation(prop: SceneryProp): boolean {
  return ['pine', 'larch', 'willow', 'reeds'].includes(prop);
}

export function landscapeLandmarks(id: LocationId) {
  const definition = LANDSCAPES[id];
  return definition.landmarks.filter(
    (landmark) => !definition.mountains || isLandscapeVegetation(landmark.prop),
  );
}
