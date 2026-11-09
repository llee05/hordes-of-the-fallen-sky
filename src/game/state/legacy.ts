import { GAME } from '../config';
import { REGIONS } from '../data/clan';
import type { ROUTES } from '../data/clan';
import type { FieldObjectiveKind } from '../data/fieldObjectives';
import { currentLocation } from './journey';
import type { CrossingRecord, LocationId, RunState } from '../types';

const STAGE_NAMES: Record<RunState['clan']['stage'], string> = {
  camp: 'Encampment',
  migration: 'Crossing',
  final: 'Final stand',
};

/** How the caravan travelled each approach, for departure and arrival memories. */
export const ROUTE_ACCOUNTS: Record<
  (typeof ROUTES)[number]['id'],
  { departed: string; arrived: string }
> = {
  river: { departed: 'They followed the river.', arrived: 'by the river road' },
  ridge: { departed: 'They took the high ridge.', arrived: 'over the high ridge' },
  refuge: {
    departed: 'They rode out to answer the blue banners.',
    arrived: 'after answering the blue banners',
  },
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

/** Records a factual clan moment in the chronicle. */
export function rememberClan(run: RunState, title: string, detail: string): void {
  const legacy = run.legacy;
  legacy.totalMemories += 1;
  legacy.memories.push({
    sequence: legacy.totalMemories,
    elapsed: run.elapsed,
    region: run.clan.region,
    locationId: currentLocation(run).id,
    population: run.clan.population,
    title,
    detail,
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
