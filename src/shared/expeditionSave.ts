/** Fixed capabilities, never filenames supplied by the renderer. */
export const SAVE_SLOTS = ['auto', 'slot-1', 'slot-2', 'slot-3'] as const;
export type SaveSlot = (typeof SAVE_SLOTS)[number];
export const MAX_SAVE_BYTES = 2_000_000;
export interface ExpeditionSave {
  version: 1;
  savedAt: number;
  summary: { location: string; elapsed: number; population: number; level: number; stage: string };
  run: Record<string, unknown>;
  world: Record<string, unknown>;
}
export interface SaveListing {
  slot: SaveSlot;
  status: 'ready' | 'recovered' | 'damaged' | 'incompatible';
  savedAt?: number;
  summary?: ExpeditionSave['summary'];
}
export function isSaveSlot(value: unknown): value is SaveSlot {
  return SAVE_SLOTS.includes(value as SaveSlot);
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Untrusted saves are bounded plain data; content-specific validation also runs before hydration. */
export function isSaveData(value: unknown): boolean {
  let budget = 60_000;
  let textBudget = MAX_SAVE_BYTES / 2;
  const visit = (entry: unknown, depth: number): boolean => {
    if (--budget < 0 || depth > 24) return false;
    if (entry === null || typeof entry === 'boolean') return true;
    if (typeof entry === 'number')
      return Number.isFinite(entry) && Math.abs(entry) <= Number.MAX_SAFE_INTEGER;
    if (typeof entry === 'string') {
      textBudget -= entry.length;
      return entry.length <= 8192 && textBudget >= 0;
    }
    if (Array.isArray(entry))
      return entry.length <= 2000 && entry.every((v) => visit(v, depth + 1));
    if (!isRecord(entry) || ![Object.prototype, null].includes(Object.getPrototypeOf(entry)))
      return false;
    const keys = Object.keys(entry);
    return (
      keys.length <= 500 &&
      keys.every(
        (key) =>
          key.length <= 128 &&
          !['__proto__', 'constructor', 'prototype'].includes(key) &&
          visit(entry[key], depth + 1),
      )
    );
  };
  return visit(value, 0);
}
export function isExpeditionSave(value: unknown): value is ExpeditionSave {
  if (!isRecord(value) || value.version !== 1 || !isSaveData(value)) return false;
  const { savedAt, summary, run, world } = value;
  return (
    typeof savedAt === 'number' &&
    Number.isSafeInteger(savedAt) &&
    savedAt > 0 &&
    isRecord(summary) &&
    typeof summary.location === 'string' &&
    summary.location.length <= 80 &&
    typeof summary.elapsed === 'number' &&
    summary.elapsed >= 0 &&
    summary.elapsed <= 86400 &&
    typeof summary.population === 'number' &&
    summary.population >= 0 &&
    summary.population <= 10000 &&
    typeof summary.level === 'number' &&
    summary.level >= 1 &&
    summary.level <= 10000 &&
    ['camp', 'migration', 'final'].includes(summary.stage as string) &&
    isRecord(run) &&
    isRecord(world)
  );
}
export function saveListing(slot: SaveSlot, save: ExpeditionSave, recovered = false): SaveListing {
  return {
    slot,
    status: recovered ? 'recovered' : 'ready',
    savedAt: save.savedAt,
    summary: save.summary,
  };
}
