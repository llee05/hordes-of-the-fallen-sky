import type {
  CharacterAgeId,
  CharacterBackgroundId,
  CharacterClassId,
  CharacterOathId,
  CharacterVoiceId,
} from '../../shared/characterProfile';

export const CREATOR_AGE_LABELS: Record<CharacterAgeId, string> = {
  'young-adult': 'Young Adult',
  seasoned: 'Seasoned',
  elder: 'Elder',
};

export const CREATOR_VOICE_LABELS: Record<CharacterVoiceId, string> = {
  'voice-a': 'Voice A',
  'voice-b': 'Voice B',
  'voice-c': 'Voice C',
};

export const CREATOR_ORIGINS: Record<
  CharacterBackgroundId,
  { title: string; description: string; bonuses: readonly string[] }
> = {
  'steppe-herder': {
    title: 'Steppe Herder',
    description:
      'Raised among the herds, you know the land, the animals, and the ways of the steppe.',
    bonuses: ['Horsemanship +1', 'Survival +1', 'Supply Capacity +10%'],
  },
  'imperial-retainer': {
    title: 'Imperial Retainer',
    description:
      'You learned command and ceremony while serving beneath the banners of a great court.',
    bonuses: ['Leadership +1', 'Discipline +1', 'Clan Renown +5%'],
  },
  artisan: {
    title: 'Artisan',
    description:
      'Forge, loom, and careful hands taught you to waste little and repair what others abandon.',
    bonuses: ['Crafting +1', 'Repair +1', 'Material Yield +10%'],
  },
  'caravan-trader': {
    title: 'Caravan Trader',
    description:
      'Long roads and harder bargains made you fluent in routes, prices, and the moods of strangers.',
    bonuses: ['Trade +1', 'Pathfinding +1', 'Starting Silver +10%'],
  },
  'ritual-apprentice': {
    title: 'Ritual Apprentice',
    description:
      'You kept the old songs and watched the sky for signs carried by smoke, wind, and flame.',
    bonuses: ['Lore +1', 'Resolve +1', 'Spirit Ward +5%'],
  },
};

export const CREATOR_CLASS_TRAITS: Record<CharacterClassId, readonly string[]> = {
  'mounted-archer': ['Ranged Harassment', 'High Mobility', 'Hit-and-Fade'],
  lancer: ['Shock Charge', 'Reach', 'Breakthrough'],
  'iron-pagoda': ['Heavy Armour', 'Line Anchor', 'Guard Stance'],
  'spirit-caller': ['Spirit Bolts', 'Warding', 'Battlefield Control'],
};

export const CREATOR_OATHS: Record<CharacterOathId, { title: string; description: string }> = {
  'oath-of-the-steppe': {
    title: 'Oath of the Steppe',
    description: 'To honour the steppe, its people, and the freedom of the open sky.',
  },
  'oath-of-the-khan': {
    title: 'Oath of the Khan',
    description: 'To bind your strength to the clan and answer honour with steadfast service.',
  },
  'oath-of-the-spirits': {
    title: 'Oath of the Spirits',
    description:
      'To heed the old signs and keep faith with the unseen powers beyond the firelight.',
  },
};
