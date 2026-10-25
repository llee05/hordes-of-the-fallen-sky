import { GAME } from '../config';
import { storyConsequence } from '../data/storyConsequences';
import type { RunState } from '../types';
import type { Companion, StoryBeat } from '../story/types';

export const COMPANION_IDS: readonly Companion[] = ['saran', 'boro', 'erden', 'nara'];
export type Standing = 'close' | 'steady' | 'strained';

/** The response actually chosen at a beat, if the scene was played and answered. */
export function storyChoice(run: RunState, beat: StoryBeat): string | undefined {
  return run.story.records.find((record) => record.encounter.id === beat)?.choice?.id;
}

export function choseStory(run: RunState, choiceId: string): boolean {
  return run.story.records.some((record) => record.choice?.id === choiceId);
}

/** Trust is derived from retained records, so saves and transcripts stay the single source. */
export function companionBonds(run: RunState): Record<Companion, number> {
  const bonds: Record<Companion, number> = { saran: 0, boro: 0, erden: 0, nara: 0 };
  for (const record of run.story.records)
    for (const [companion, amount] of Object.entries(
      storyConsequence(record.choice?.id)?.bonds ?? {},
    ))
      bonds[companion as Companion] += amount;
  return bonds;
}

export function companionStanding(run: RunState, companion: Companion): Standing {
  const bond = companionBonds(run)[companion];
  if (bond >= GAME.story.bonds.close) return 'close';
  if (bond <= GAME.story.bonds.strained) return 'strained';
  return 'steady';
}
