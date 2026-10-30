import type {
  CoreCampBuildingId,
  NomadicBuildingId,
  OptionalCampBuildingId,
} from '../shared/nomadicCamp.js';
import { CAMP_BUILDING_MAX_LEVEL, OPTIONAL_CAMP_SLOTS } from '../shared/nomadicCamp.js';

/**
 * The Khan's camp is a composited painting: one permanent landscape plus one
 * separately painted illustration per building level and per empty optional
 * site. Anchors are percentages of the 2:1 scene and mark the ground point at
 * the bottom centre of each illustration, so artwork and labels stay aligned
 * at every display size. See docs/camp-scene-assets.md for the asset slots.
 */
export interface CampSceneSite {
  /** Ground anchor, percent of scene width. */
  x: number;
  /** Ground anchor, percent of scene height. */
  y: number;
  /** Illustration width, percent of scene width. */
  width: number;
}

export const CAMP_SCENE_ASPECT = 2;
export const CAMP_SCENE_BACKGROUND = 'art/camp-scene/background.webp';

/** Permanent buildings sit on the painted clearings around the central ger. */
export const CORE_CAMP_SITES: Readonly<Record<CoreCampBuildingId, CampSceneSite>> = {
  'khans-ger': { x: 50, y: 55, width: 20 },
  'horse-lines': { x: 14.5, y: 37, width: 15 },
  'communal-hearth': { x: 87, y: 37, width: 14 },
  'herding-grounds': { x: 12.5, y: 79, width: 15 },
  'wagon-yard': { x: 87.5, y: 80, width: 15 },
};

/** Optional sites keep their persistent slot index; any workplace may occupy any site. */
export const OPTIONAL_CAMP_SITES: readonly CampSceneSite[] = [
  { x: 37, y: 32.5, width: 13 },
  { x: 64.5, y: 32.5, width: 13 },
  { x: 34, y: 80.5, width: 13 },
  { x: 68, y: 81, width: 13 },
  { x: 49.5, y: 92, width: 13 },
];

if (OPTIONAL_CAMP_SITES.length !== OPTIONAL_CAMP_SLOTS)
  throw Error('Every optional camp slot needs a painted site');

/** Workplace footprints differ, so optional illustrations scale within their site. */
const OPTIONAL_WIDTH: Partial<Record<OptionalCampBuildingId, number>> = {
  'scouts-watchpost': 0.6,
  'sacred-ovoo': 0.85,
  'ancestral-standard': 0.65,
};

export function campSceneSite(id: NomadicBuildingId, slot?: number): CampSceneSite {
  const core = (CORE_CAMP_SITES as Partial<Record<NomadicBuildingId, CampSceneSite>>)[id];
  if (core) return core;
  const site = OPTIONAL_CAMP_SITES[slot ?? 0]!;
  const scale = OPTIONAL_WIDTH[id as OptionalCampBuildingId] ?? 1;
  return { ...site, width: site.width * scale };
}

/** Each building level has its own replaceable illustration slot. */
export function campBuildingArt(id: NomadicBuildingId, level: number): string {
  const shown = Math.min(CAMP_BUILDING_MAX_LEVEL, Math.max(1, level));
  return `art/camp-scene/${id}-${shown}.webp`;
}

/** Unclaimed optional sites show a subtle surveyed plot until something is built. */
export function campEmptySiteArt(slot: number): string {
  return `art/camp-scene/empty-site-${slot + 1}.webp`;
}
