import { isNomadicCamp, type NomadicCamp } from './nomadicCamp.js';
/** Bounded save payload; contains no renderer objects, functions, or filesystem capabilities. */
export interface CampArchive {
  version: 1;
  nomadicCamp?: NomadicCamp;
  tier: number;
  slots: (string | null)[];
  buildings: string[];
  paths: Record<string, string[]>;
  internals: Record<string, number>;
  supplies: {
    food: number;
    materials: number;
    spirit: number;
    population: number;
    herd: number;
    integrity: number;
  };
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const id = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const integer = (value: unknown, low: number, high: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;
const ids = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= 64 &&
  value.every(id) &&
  new Set(value).size === value.length;
export function isCampArchive(value: unknown): value is CampArchive {
  if (
    !record(value) ||
    value.version !== 1 ||
    (value.nomadicCamp !== undefined && !isNomadicCamp(value.nomadicCamp)) ||
    !integer(value.tier, 1, 5) ||
    !ids(value.buildings) ||
    !Array.isArray(value.slots) ||
    value.slots.length > 32 ||
    !value.slots.every((v) => v === null || id(v)) ||
    !record(value.paths) ||
    Object.keys(value.paths).length > 32 ||
    !Object.entries(value.paths).every(([key, paths]) => id(key) && ids(paths)) ||
    !record(value.internals) ||
    Object.keys(value.internals).length > 32 ||
    !Object.entries(value.internals).every(([key, rank]) => id(key) && integer(rank, 1, 2)) ||
    !record(value.supplies)
  )
    return false;
  const supplies = value.supplies;
  return ['food', 'materials', 'spirit', 'population', 'herd', 'integrity'].every((key) => {
    const n = supplies[key];
    return (
      typeof n === 'number' &&
      Number.isFinite(n) &&
      n >= 0 &&
      n <= 1000000000 &&
      (!['population', 'herd'].includes(key) || Number.isInteger(n)) &&
      (key !== 'integrity' || n <= 100)
    );
  });
}

export function normalizeCampArchive(value: unknown): CampArchive | undefined {
  if (!isCampArchive(value)) return undefined;
  return {
    version: 1,
    ...(value.nomadicCamp ? { nomadicCamp: structuredClone(value.nomadicCamp) } : {}),
    tier: value.tier,
    slots: [...value.slots],
    buildings: [...value.buildings],
    paths: Object.fromEntries(Object.entries(value.paths).map(([key, paths]) => [key, [...paths]])),
    internals: { ...value.internals },
    supplies: {
      food: value.supplies.food,
      materials: value.supplies.materials,
      spirit: value.supplies.spirit,
      population: value.supplies.population,
      herd: value.supplies.herd,
      integrity: value.supplies.integrity,
    },
  };
}
