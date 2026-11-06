import { GAME } from '../config';
import { REGIONS } from '../data/clan';
import type { CrossingRoute } from '../data/crossings';
import type { FieldObjectiveKind } from '../data/fieldObjectives';
import { NOMADIC_BUILDINGS } from '../data/nomadicCamp';
import { currentLocation } from './journey';
import type { CrossingRecord, LocationId, RunState } from '../types';

const STAGE_NAMES: Record<RunState['clan']['stage'], string> = {
  camp: 'Encampment',
  migration: 'Crossing',
  final: 'Final stand',
};

/** How the caravan travelled each approach, for departure and arrival memories. */
export const ROUTE_ACCOUNTS: Record<CrossingRoute, { departed: string; arrived: string }> = {
  river: { departed: 'They followed the river.', arrived: 'by the river road' },
  ridge: { departed: 'They took the high ridge.', arrived: 'over the high ridge' },
  refuge: {
    departed: 'They rode out to answer the blue banners.',
    arrived: 'after answering the blue banners',
  },
};

/** What a completed crossing objective accomplished, before its reward is listed. */
export const CROSSING_OBJECTIVE_ACCOUNTS: Record<CrossingRoute, string> = {
  river: 'The ford held against the attackers on both banks.',
  ridge: 'The ridge attackers were defeated.',
  refuge: 'The households under the blue banners were brought safely into the column.',
};

/** What a completed field objective accomplished, before its reward is listed. */
export const FIELD_OBJECTIVE_ACCOUNTS: Record<FieldObjectiveKind, string> = {
  supplies: 'The cart was cleared and its load gathered.',
  herd: 'The loose horses were ridden back to camp.',
  refugees: 'The stranded households were escorted back to camp.',
  gathering: 'The raiding band was beaten.',
};

export interface KhanRecord {
  trait?: import('../data/successors').SuccessorTrait;
  generation: number;
  chosenAt: number;
  region: number;
  locationId?: LocationId;
  people: number;
  killsAtStart: number;
  fallenAt?: number;
  fallenRegion?: number;
  fallenLocationId?: LocationId;
  killsAtFall?: number;
}

export interface ClanMemory {
  sequence: number;
  elapsed: number;
  region: number;
  locationId?: LocationId;
  population: number;
  title: string;
  detail: string;
}

export interface ClanLegacy {
  outcome?: 'won' | 'dead';
  khans: KhanRecord[];
  memories: ClanMemory[];
  totalMemories: number;
  crossings: CrossingRecord[];
  peopleLost: number;
}

export interface JourneyResults {
  outcome: 'Refuge reached' | 'Clan lost';
  location: string;
  stage: string;
  elapsed: number;
  survivors: number;
  herd: number;
  pastures: string;
  crossings: number;
  peopleLost: number;
  fallenKhans: number;
  skybreaker: 'Defeated' | 'Undefeated' | 'Not reached';
}

export function createLegacy(): ClanLegacy {
  return {
    khans: [{ generation: 1, chosenAt: 0, region: 0, people: 8, killsAtStart: 0 }],
    memories: [],
    totalMemories: 0,
    crossings: [],
    peopleLost: 0,
  };
}

function normalizeMemoryText(value: string): string {
  return value
    .replace(/[\u2018\u2019`]/g, "'")
    .trim()
    .replace(/\s+/g, ' ');
}

function parseBuildingMemory(
  title: string,
  detail: string,
): { id: string; title: string; detail: string; level: number } | undefined {
  const normalizedTitle = normalizeMemoryText(title);
  const normalizedDetail = normalizeMemoryText(detail);
  const householdMatch =
    /^The clan (?:established|improved) this household to level (\d+)\.$/i.exec(normalizedDetail);
  const titleLevelMatch = /^(.*?)\s*[·-]\s*Lv\.?\s*(\d+)$/i.exec(normalizedTitle);
  const reachedMatch = /^(.*?)\s+reach(?:ed|es) level (\d+)\.$/i.exec(normalizedDetail);
  const rawBuilding = householdMatch
    ? normalizedTitle
    : titleLevelMatch
      ? normalizeMemoryText(titleLevelMatch[1]!)
      : reachedMatch
        ? normalizeMemoryText(reachedMatch[1]!)
        : undefined;
  const level = Number(householdMatch?.[1] ?? titleLevelMatch?.[2] ?? reachedMatch?.[2]);
  if (!rawBuilding || !Number.isInteger(level) || level < 1) return undefined;
  const definition = NOMADIC_BUILDINGS.find(
    (entry) => normalizeMemoryText(entry.title).toLowerCase() === rawBuilding.toLowerCase(),
  );
  const canonicalTitle = definition?.title ?? rawBuilding;
  return {
    id: definition?.id ?? canonicalTitle.toLowerCase(),
    title: canonicalTitle,
    detail: `The clan ${level > 1 ? 'improved' : 'established'} this household to level ${level}.`,
    level,
  };
}

export function memoryEventKey(
  memory: Pick<ClanMemory, 'title' | 'detail' | 'region' | 'elapsed' | 'population'>,
): string {
  const building = parseBuildingMemory(memory.title, memory.detail);
  if (building) return `building:${building.id}:${building.level}`;
  const title = normalizeMemoryText(memory.title);
  const detail = normalizeMemoryText(memory.detail);
  const khanMatch = /^Khan (\d+) (fell|took the banner)$/i.exec(title);
  if (khanMatch) return `khan:${khanMatch[1]}:${khanMatch[2]!.toLowerCase()}`;
  if (title.toLowerCase() === 'the skybreaker fell') return 'skybreaker';
  if (
    detail === 'The households raised it in the travelling camp.' ||
    detail === 'The households learned a new craft for the travelling camp.' ||
    detail === 'Organised within the travelling camp.' ||
    detail === 'Deepened within the travelling camp.' ||
    detail.startsWith('The camp grew to ')
  ) {
    return `development:${title.toLowerCase()}:${detail.toLowerCase()}`;
  }
  if (
    title === 'The camp packed for the road' ||
    title === 'New households at the fire' ||
    title === 'The caravan arrived' ||
    title === 'Every household arrived'
  ) {
    return `crossing:${memory.region}:${title.toLowerCase()}`;
  }
  return `moment:${memory.region}:${memory.elapsed}:${memory.population}:${title.toLowerCase()}:${detail.toLowerCase()}`;
}

export function normalizeLegacyMemories(legacy: ClanLegacy): void {
  const originalCount = legacy.memories.length;
  const seen = new Set<string>();
  const deduplicated: ClanMemory[] = [];
  for (const memory of legacy.memories) {
    const building = parseBuildingMemory(memory.title, memory.detail);
    const normalized: ClanMemory = building
      ? { ...memory, title: building.title, detail: building.detail }
      : memory;
    const key = memoryEventKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    deduplicated.push(normalized);
  }
  const kept = deduplicated.slice(-GAME.legacy.memoryLimit);
  const evicted =
    kept.length >= GAME.legacy.memoryLimit ? Math.max(0, legacy.totalMemories - originalCount) : 0;
  legacy.totalMemories = kept.length + evicted;
  legacy.memories = kept.map((memory, index) => ({
    ...memory,
    sequence: evicted + index + 1,
  }));
}

/** Records a factual clan moment in the chronicle. */
export function rememberClan(run: RunState, title: string, detail: string): void {
  const legacy = run.legacy;
  const building = parseBuildingMemory(title, detail);
  const candidate = {
    elapsed: run.elapsed,
    region: run.clan.region,
    locationId: currentLocation(run).id,
    population: run.clan.population,
    title: building ? building.title : title,
    detail: building ? building.detail : detail,
  };
  const key = memoryEventKey(candidate);
  if (legacy.memories.some((existing) => memoryEventKey(existing) === key)) return;
  legacy.totalMemories =
    Math.max(legacy.totalMemories, legacy.memories.length, legacy.memories.at(-1)?.sequence ?? 0) +
    1;
  legacy.memories.push({
    sequence: legacy.totalMemories,
    ...candidate,
  });
  if (legacy.memories.length > GAME.legacy.memoryLimit) legacy.memories.shift();
}

export function rememberFallenKhan(run: RunState): void {
  const khan = run.legacy.khans.at(-1)!;
  if (khan.fallenAt !== undefined) return;
  khan.fallenAt = run.elapsed;
  khan.fallenRegion = run.clan.region;
  khan.fallenLocationId = currentLocation(run).id;
  khan.killsAtFall = run.kills;
  rememberClan(
    run,
    `Khan ${run.khan.generation} fell`,
    'The clan began choosing another leader while its defenses fought on.',
  );
}

export function rememberChosenKhan(run: RunState): void {
  run.legacy.khans.push({
    generation: run.khan.generation,
    ...(run.khan.trait ? { trait: run.khan.trait } : {}),
    chosenAt: run.elapsed,
    region: run.clan.region,
    locationId: currentLocation(run).id,
    people: run.clan.population,
    killsAtStart: run.kills,
  });
  if (run.legacy.khans.length > GAME.legacy.khanRecordLimit) run.legacy.khans.shift();
  rememberClan(
    run,
    `Khan ${run.khan.generation} took the banner`,
    `${run.clan.population} people carried their camp, traditions, and journey forward under the new Khan.`,
  );
}

export function journeyResults(run: RunState): JourneyResults {
  return {
    outcome: run.legacy.outcome === 'won' || run.phase === 'won' ? 'Refuge reached' : 'Clan lost',
    location: currentLocation(run).name,
    stage: STAGE_NAMES[run.clan.stage],
    elapsed: run.elapsed,
    survivors: run.clan.population,
    herd: run.clan.herd,
    pastures: `${run.clan.region + 1}/${REGIONS.length}`,
    crossings: run.legacy.crossings.length,
    peopleLost: run.legacy.peopleLost,
    fallenKhans: Math.max(
      run.legacy.khans.filter((khan) => khan.fallenAt !== undefined).length,
      run.khan.generation - 1 + (run.khan.successionRemaining > 0 ? 1 : 0),
    ),
    skybreaker: run.clan.finalBossDefeated
      ? 'Defeated'
      : run.clan.stage === 'final' || run.clan.finalBossSpawned
        ? 'Undefeated'
        : 'Not reached',
  };
}
