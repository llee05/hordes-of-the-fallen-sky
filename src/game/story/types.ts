import type { Doctrine } from '../types';

export type StoryBeat =
  'fire' | 'departure' | 'river' | 'promise' | 'earth' | 'court' | 'opening' | 'road';
export type Speaker = 'saran' | 'boro' | 'erden' | 'nara' | 'clan';
export type StoryBenefit = 'food' | 'materials' | 'spirit' | 'resolve';

export interface StoryLine {
  speaker: Speaker;
  text: string;
}

export interface StoryChoice {
  id: string;
  label: string;
  description: string;
  response: string;
  benefit: StoryBenefit;
  doctrine: Doctrine;
}

export interface StoryEncounter {
  id: StoryBeat;
  act: 1 | 2;
  title: string;
  image: string;
  setting: string;
  lines: readonly StoryLine[];
  choices: readonly StoryChoice[];
}

export interface StoryRecord {
  encounter: StoryEncounter;
  elapsed: number;
  population: number;
  status: 'chosen' | 'skipped' | 'passed';
  choice?: StoryChoice;
}

export interface StoryCrossing {
  route: string;
  region: number;
  population: number;
}

export interface StoryState {
  enabled: boolean;
  active?: StoryEncounter;
  records: StoryRecord[];
  crossings: StoryCrossing[];
  peopleLost: number;
}
