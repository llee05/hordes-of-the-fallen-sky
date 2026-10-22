import type { PatronId } from '../types';

export interface PatronDefinition {
  id: PatronId;
  name: string;
  playstyle: string;
  symbol: string;
  description: string;
}

/** The clan's fictional patron traditions; contextual writing boundaries live in lore.md. */
export const PATRONS: readonly PatronDefinition[] = [
  {
    id: 'borte-chino',
    name: 'Börte Chino',
    playstyle: 'Hunting',
    symbol: 'wolf',
    description:
      'Run with the hunt. Keep momentum, finish wounded enemies, and turn each moving kill into strength for the next pursuit.',
  },
  {
    id: 'etugen-eke',
    name: 'Etügen Eke',
    playstyle: 'Civilisation',
    symbol: 'grain',
    description:
      'Care for the living ground. Sustain the pasture, feed more households, and build a civilisation that can survive the long road.',
  },
  {
    id: 'khukhedei-mergen',
    name: 'Khükhedei Mergen',
    playstyle: 'Archery',
    symbol: 'bow',
    description:
      'Make every shot count. Extend the host’s reach, send shafts through the unreturned, and fill the approach with arrows.',
  },
  {
    id: 'golomt',
    name: 'Golomt',
    playstyle: 'Survival',
    symbol: 'hearth',
    description:
      'Carry the hearth through darkness. Recover from wounds, shelter the commander, and keep one last ember against defeat.',
  },
  {
    id: 'lus',
    name: 'Lus',
    playstyle: 'Terrain',
    symbol: 'river',
    description:
      'Shape the ground of the battle. Slow the enemy approach, read eruptions before they strike, and turn the current against the horde.',
  },
  {
    id: 'ongod',
    name: 'Ongod',
    playstyle: 'Summoning',
    symbol: 'spirit',
    description:
      'Let remembered riders travel beside the living. Ancestral echoes answer the bow, gather scattered vitality, and ride as a council.',
  },
  {
    id: 'sulde',
    name: 'Sülde',
    playstyle: 'Leadership',
    symbol: 'banner',
    description:
      'A people beneath one standard. Recruit a mounted host, strengthen its volleys, and bring every wagon through with resolve.',
  },
  {
    id: 'burkhan-guardian',
    name: 'Guardian of Burkhan Khaldun',
    playstyle: 'Construction',
    symbol: 'mountain',
    description:
      'Raise a shelter wherever the clan stops. This imagined mountain guardian inspires economical construction, watchfires, and a defended passage.',
  },
];
