import { GAME } from '../config';
import type { LocationId, RunState } from '../types';
import type { StoryLine } from '../story/types';
import { currentLocation } from './journey';
import {
  CHOSEN_KHAN_REMNANT,
  FALLEN_KHAN_REMNANT,
  chosenKhanReaction,
  clanVoiceLine,
  fallenKhanReaction,
} from '../data/storyReactions';

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
  line?: StoryLine;
}

export interface ClanLegacy {
  outcome?: 'won' | 'dead';
  khans: KhanRecord[];
  memories: ClanMemory[];
  totalMemories: number;
  reactionUntil: number;
}

export function createLegacy(): ClanLegacy {
  return {
    khans: [{ generation: 1, chosenAt: 0, region: 0, people: 8, killsAtStart: 0 }],
    memories: [],
    totalMemories: 0,
    reactionUntil: 0,
  };
}

/** Facts are retained even with camp scenes off. Only a reaction actually shown gets a transcript. */
export function rememberClan(
  run: RunState,
  title: string,
  detail: string,
  reaction: StoryLine,
  remnant: string,
): void {
  const legacy = run.legacy;
  const canSpeak =
    run.clan.population > 0 && run.story.enabled && run.elapsed >= legacy.reactionUntil;
  const line = canSpeak ? (run.clan.population < 5 ? clanVoiceLine(remnant) : reaction) : undefined;
  legacy.totalMemories += 1;
  legacy.memories.push({
    sequence: legacy.totalMemories,
    elapsed: run.elapsed,
    region: run.clan.region,
    locationId: currentLocation(run).id,
    population: run.clan.population,
    title,
    detail,
    line,
  });
  if (line) legacy.reactionUntil = run.elapsed + GAME.story.reactionDuration;
  if (legacy.memories.length > GAME.story.memoryLimit) legacy.memories.shift();
}

export function currentReaction(run: RunState): ClanMemory | undefined {
  if (run.elapsed >= run.legacy.reactionUntil) return;
  for (let i = run.legacy.memories.length - 1; i >= 0; i -= 1) {
    const memory = run.legacy.memories[i]!;
    if (memory.line) return memory;
  }
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
    fallenKhanReaction(run),
    FALLEN_KHAN_REMNANT,
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
  if (run.legacy.khans.length > GAME.story.khanRecordLimit) run.legacy.khans.shift();
  rememberClan(
    run,
    `Khan ${run.khan.generation} took the banner`,
    `${run.clan.population} people carried their camp, traditions, and journey forward under the new Khan.`,
    chosenKhanReaction(run),
    CHOSEN_KHAN_REMNANT,
  );
}
