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
      'Hunt the way the wolf hunts. Keep moving, finish what is wounded, and let every kill on the run carry you into the next.',
  },
  {
    id: 'etugen-eke',
    name: 'Etügen Eke',
    playstyle: 'Civilisation',
    symbol: 'grain',
    description:
      'Look after the ground that feeds you. Make the pasture last, feed more households, and build a camp that can survive the long road.',
  },
  {
    id: 'khukhedei-mergen',
    name: 'Khükhedei Mergen',
    playstyle: 'Archery',
    symbol: 'bow',
    description:
      'Make every shot count. Reach farther, drive shafts through the unreturned, and darken the approach with arrows.',
  },
  {
    id: 'golomt',
    name: 'Golomt',
    playstyle: 'Survival',
    symbol: 'hearth',
    description:
      'Carry the hearth through the dark. Heal from wounds, shelter the Khan, and hold one last ember in reserve against defeat.',
  },
  {
    id: 'lus',
    name: 'Lus',
    playstyle: 'Terrain',
    symbol: 'river',
    description:
      'Pay attention to the ground and the water. Slow the enemy’s approach, read the earth before it breaks, and turn the current against the horde.',
  },
  {
    id: 'ongod',
    name: 'Ongod',
    playstyle: 'Summoning',
    symbol: 'spirit',
    description:
      'Let the remembered ride beside the living. Ancestral echoes draw the bow with you, help gather what the fallen leave, and ride together as a council.',
  },
  {
    id: 'sulde',
    name: 'Sülde',
    playstyle: 'Leadership',
    symbol: 'banner',
    description:
      'One people under one standard. Raise a mounted host, sharpen its volleys, and keep spirits up until every wagon is through.',
  },
  {
    id: 'burkhan-guardian',
    name: 'Guardian of Burkhan Khaldun',
    playstyle: 'Construction',
    symbol: 'mountain',
    description:
      'Make shelter wherever the clan stops. This imagined guardian of the mountain inspires thrifty building, watchfires, and a passage held against the dark.',
  },
];
