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
      'When Fire arrows meet Wind shamans, every volley from your side gains two curving, burning arrows.',
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
      'The wolf’s trail makes volleys loosed on the move hit harder, and Riders of one standard puts more archers in the saddle to loose them.',
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
      'The measured bow raises shared arrow damage, and Hands remember the bow raises the share the ancestral echoes deal. Their arrows get both.',
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
      'Felt armor and Foundations we can carry each cut the damage the clan takes, and the two reductions multiply.',
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
      'Winter stores and Take only what we need both cut what the clan eats, and together they buy more time before it must move.',
    requirements: [
      { kind: 'camp', building: 'herd', path: 'winter-stores' },
      { kind: 'research', id: 'measured-herds', rank: 1 },
    ],
  },
];
