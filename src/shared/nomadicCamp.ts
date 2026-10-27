/** Portable camp ownership. Layout and effects belong to the renderer content registry. */
export const CORE_CAMP_BUILDINGS = [
  'khans-ger',
  'horse-lines',
  'herding-grounds',
  'communal-hearth',
  'wagon-yard',
] as const;
export const OPTIONAL_CAMP_BUILDINGS = [
  'archery-range',
  'smiths-forge',
  'warriors-training-ground',
  'scouts-watchpost',
  'fletchers-workshop',
  'palisade-watchfires',
  'hunting-lodge',
  'artisans-ger',
  'trading-post',
  'healers-ger',
  'sacred-ovoo',
  'shamans-ger',
  'ancestral-standard',
  'storytellers-hearth',
] as const;
export type CoreCampBuildingId = (typeof CORE_CAMP_BUILDINGS)[number];
export type OptionalCampBuildingId = (typeof OPTIONAL_CAMP_BUILDINGS)[number];
export type NomadicBuildingId = CoreCampBuildingId | OptionalCampBuildingId;
export const OPTIONAL_CAMP_SLOTS = 5;
export const CAMP_BUILDING_MAX_LEVEL = 3;
export interface NomadicCamp {
  version: 1;
  core: Record<CoreCampBuildingId, number>;
  slots: ({ id: OptionalCampBuildingId; level: number } | null)[];
}
export function createNomadicCamp(): NomadicCamp {
  return {
    version: 1,
    core: Object.fromEntries(CORE_CAMP_BUILDINGS.map((id) => [id, 1])) as NomadicCamp['core'],
    slots: Array.from({ length: OPTIONAL_CAMP_SLOTS }, () => null),
  };
}
export function isNomadicCamp(value: unknown): value is NomadicCamp {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some((key) => !['version', 'core', 'slots'].includes(key))) return false;
  if (v.version !== 1 || !v.core || typeof v.core !== 'object' || Array.isArray(v.core))
    return false;
  const core = v.core as Record<string, unknown>;
  const level = (n: unknown) =>
    typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= CAMP_BUILDING_MAX_LEVEL;
  if (
    Object.keys(core).length !== CORE_CAMP_BUILDINGS.length ||
    !CORE_CAMP_BUILDINGS.every((id) => level(core[id]))
  )
    return false;
  if (!Array.isArray(v.slots) || v.slots.length !== OPTIONAL_CAMP_SLOTS) return false;
  const seen = new Set<string>();
  return v.slots.every((slot: unknown) => {
    if (slot === null) return true;
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) return false;
    const s = slot as Record<string, unknown>;
    if (
      Object.keys(s).some((key) => !['id', 'level'].includes(key)) ||
      typeof s.id !== 'string' ||
      !(OPTIONAL_CAMP_BUILDINGS as readonly string[]).includes(s.id) ||
      !level(s.level) ||
      seen.has(s.id)
    )
      return false;
    seen.add(s.id);
    return true;
  });
}
