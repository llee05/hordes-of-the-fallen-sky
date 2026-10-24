import type { BuildingId } from '../types';

export type SynergyRequirement =
  | { kind: 'research'; id: string; rank: number }
  | { kind: 'camp'; building: BuildingId; path: string };
export interface SynergyDefinition {
  id: string;
  title: string;
  icon: string;
  description: string;
  requirements: readonly SynergyRequirement[];
}
/** Discoverable recipes describe existing interactions, without granting hidden bonuses. */
export const SYNERGIES: readonly SynergyDefinition[] = [
  {
    id: 'burning-tempest',
    title: 'Burning Tempest',
    icon: 'hearth',
    description:
      'Fire arrows meet Wind shamans: every friendly volley gains two curving, burning arrows.',
    requirements: [
      { kind: 'camp', building: 'archery', path: 'fire-arrows' },
      { kind: 'camp', building: 'sanctuary', path: 'wind-shamans' },
    ],
  },
  {
    id: 'moving-host',
    title: 'The moving hunt',
    icon: 'horse',
    description:
      'The wolf’s trail strengthens moving volleys. Riders of one standard adds more living archers to carry those volleys across the battlefield.',
    requirements: [
      { kind: 'research', id: 'wolf-trail', rank: 1 },
      { kind: 'research', id: 'sworn-riders', rank: 1 },
    ],
  },
  {
    id: 'remembered-bow',
    title: 'The remembered bow',
    icon: 'bow',
    description:
      'The measured bow raises shared arrow damage; Remembered Aim increases the share dealt by ancestral echoes. Both multipliers apply to their arrows.',
    requirements: [
      { kind: 'research', id: 'power', rank: 1 },
      { kind: 'research', id: 'remembered-aim', rank: 1 },
    ],
  },
  {
    id: 'caravan-bulwark',
    title: 'Caravan bulwark',
    icon: 'wagon',
    description:
      'Felt armor and Caravan Foundations multiply clan protection together, sheltering the same people and wagons.',
    requirements: [
      { kind: 'camp', building: 'wagon', path: 'felt-armor' },
      { kind: 'research', id: 'caravan-foundations', rank: 2 },
    ],
  },
  {
    id: 'sustained-pasture',
    title: 'A longer pasture',
    icon: 'grain',
    description:
      'Winter stores and Measured Herds combine their food-consumption reductions, giving the clan more time before it must move.',
    requirements: [
      { kind: 'camp', building: 'herd', path: 'winter-stores' },
      { kind: 'research', id: 'measured-herds', rank: 1 },
    ],
  },
];
