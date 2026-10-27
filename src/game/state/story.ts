import { restoreResolve } from './clan';
import { GAME } from '../config';
import { STORY_ORDER, storyEncounter } from '../data/story';
import { storyConsequence } from '../data/storyConsequences';
import { applyCampEffects } from './camp';
import type { RunState } from '../types';
import type { StoryBeat, StoryState } from '../story/types';

export function createStory(enabled = true): StoryState {
  return { enabled, records: [], crossings: [], peopleLost: 0 };
}

function due(run: RunState, beat: StoryBeat): boolean {
  const { region, stageTime, stage } = run.clan;
  if (stage === 'migration') return false;
  switch (beat) {
    case 'fire':
      return true;
    case 'departure':
      return region > 0 || stageTime >= GAME.clan.minimumCamp;
    case 'river':
      return region >= 1;
    case 'promise':
      return region >= 2;
    case 'earth':
      return region > 2 || (region === 2 && stageTime >= GAME.story.campBeatDelay);
    case 'court':
      return region > 2 || (region === 2 && stageTime >= GAME.clan.minimumCamp);
    case 'opening':
      return region === 3;
    case 'road':
      return region === 3 && stageTime >= GAME.story.finalBeatTime;
  }
}

/** Scene owns phases and physics; this module owns bounded, once-only story progression. */
export function openNextStory(run: RunState): boolean {
  if (!['playing', 'journal'].includes(run.phase) || run.story.active) return false;
  for (const beat of STORY_ORDER) {
    if (run.story.records.some((record) => record.encounter.id === beat) || !due(run, beat))
      continue;
    const encounter = storyEncounter(run, beat);
    if (run.story.enabled) {
      run.story.active = encounter;
      return true;
    }
    run.story.records.push({
      encounter: { ...encounter, lines: [] },
      elapsed: run.elapsed,
      population: run.clan.population,
      status: 'passed',
    });
  }
  return false;
}

export function resolveStory(run: RunState, choiceId?: string): boolean {
  const encounter = run.story.active;
  if (!encounter || run.story.records.some((record) => record.encounter.id === encounter.id))
    return false;
  const selected = encounter.choices.find((choice) => choice.id === choiceId);
  if (choiceId !== undefined && !selected) return false;
  // Clear the active encounter before granting anything: repeated input cannot pay twice.
  run.story.active = undefined;
  if (selected) {
    const amount = GAME.story.gifts[selected.benefit];
    if (selected.benefit === 'resolve') restoreResolve(run, amount);
    else run.clan[selected.benefit] += amount;
    run.clan.identity[selected.doctrine] += GAME.story.identityPerChoice;
    applyCampEffects(run.clan.campEffects, storyConsequence(selected.id)?.lasting?.effects);
    run.clan.message = selected.response;
  }
  run.story.records.push({
    encounter,
    choice: selected,
    status: selected ? 'chosen' : 'skipped',
    elapsed: run.elapsed,
    population: run.clan.population,
  });
  return true;
}
