import { GAME } from '../config';
import type { PatronId, UpgradeDefinition } from '../types';
export type Technology = Omit<UpgradeDefinition, 'patron' | 'category' | 'subtitle' | 'icon'>;
const S = GAME.patrons.specializations;

/** The existing capstone now follows one focused practice, with an equally priced alternative. */
export const CAPSTONE_PARENTS: Record<PatronId, string> = {
  'borte-chino': 'culling-bite',
  'etugen-eke': 'measured-herds',
  'khukhedei-mergen': 'wide-quiver',
  golomt: 'carried-embers',
  lus: 'reed-beds',
  ongod: 'remembered-aim',
  sulde: 'rallying-banner',
  'burkhan-guardian': 'stone-shelter',
};
export const SPECIALIZATIONS: Record<PatronId, readonly Technology[]> = {
  'borte-chino': [
    {
      id: 'wind-rider',
      title: 'Ride ahead of the storm',
      maxStacks: 1,
      requires: [{ id: 'pursuit-gallop', rank: 1 }],
      description: 'Ride 10% faster; attacks above half momentum deal 20% more damage.',
      apply: (r) => {
        r.stats.speed *= S.windSpeed;
        r.patrons.hunt.movingDamage *= S.windDamage;
      },
    },
  ],
  'etugen-eke': [
    {
      id: 'hands-of-the-steppe',
      title: 'Hands that build a people',
      maxStacks: 1,
      requires: [{ id: 'shared-labour', rank: 1 }],
      description: 'Gather 40% more materials, strengthening the travelling camp economy.',
      apply: (r) => {
        r.patrons.land.materials *= S.craftMaterials;
      },
    },
  ],
  'khukhedei-mergen': [
    {
      id: 'wide-quiver',
      title: 'Arrows across the steppe',
      kind: 'practice',
      maxStacks: 1,
      requires: [{ id: 'power', rank: 1 }],
      description:
        'One additional Khan arrow per volley; shared damage falls 10%, and friendly volley spacing widens 20%.',
      apply: (r) => {
        r.stats.projectiles += S.wideArrows;
        r.stats.damage *= S.wideDamage;
        r.patrons.bow.spread *= S.wideSpread;
      },
    },
    {
      id: 'one-perfect-shot',
      title: 'The unerring bow',
      maxStacks: 1,
      requires: [{ id: 'haste', rank: 1 }],
      description:
        'Shared attack damage +60%; Khan and rider targeting range +60 paces. Focus on powerful, precise volleys.',
      apply: (r) => {
        r.stats.damage *= S.precisionDamage;
        r.patrons.bow.range += S.precisionRange;
      },
    },
    {
      id: 'through-the-horde',
      title: 'Through the gathered shadows',
      maxStacks: 1,
      requires: [{ id: 'piercing-shaft', rank: 1 }],
      description:
        'Friendly arrows pierce two additional enemies. Focus on deep ranks of approaching enemies.',
      apply: (r) => {
        r.patrons.bow.pierce += S.piercingBonus;
      },
    },
  ],
  golomt: [
    {
      id: 'unbroken-hearth',
      title: 'Shelter the living Khan',
      maxStacks: 1,
      requires: [{ id: 'felt-and-fire', rank: 1 }],
      description:
        'Maximum Khan health +40; Khan damage taken falls a further 15%. Choose steady protection over Last Ember.',
      apply: (r) => {
        r.stats.maxHealth += S.bulwarkHealth;
        r.patrons.hearth.damageTaken *= S.bulwarkProtection;
      },
    },
  ],
  lus: [
    {
      id: 'still-waters',
      title: 'Quiet ground beneath the storm',
      maxStacks: 1,
      requires: [{ id: 'turned-earth', rank: 1 }],
      description:
        'Slowing fields gain 18 percentage points of slow; eruption warnings last another half-second.',
      apply: (r) => {
        r.patrons.water.slow += S.stillSlow;
        r.patrons.water.warning += S.stillWarning;
      },
    },
  ],
  ongod: [
    {
      id: 'keeper-of-names',
      title: 'Gather the scattered memory',
      maxStacks: 1,
      requires: [{ id: 'spirit-thread', rank: 1 }],
      description:
        'Shard attraction radius +30%; Spirit gained from kills +50%. Keep two echoes and invest in the clan economy.',
      apply: (r) => {
        r.stats.pickupRadius *= S.memoryPickup;
        r.patrons.ancestors.spiritGain *= S.memorySpirit;
      },
    },
  ],
  sulde: [
    {
      id: 'caravan-vanguard',
      title: 'Every wagon reaches the dawn',
      maxStacks: 1,
      requires: [{ id: 'ordered-march', rank: 1 }],
      description:
        'Migration mobility +25%; clan damage taken falls a further 25%. Choose a protected crossing over more riders.',
      apply: (r) => {
        r.patrons.banner.mobility *= S.vanguardMobility;
        r.patrons.guardian.protection *= S.vanguardProtection;
      },
    },
  ],
  'burkhan-guardian': [
    {
      id: 'rolling-fortress',
      title: 'A fortress on the road',
      maxStacks: 1,
      requires: [{ id: 'watchfires', rank: 1 }],
      description:
        'Wagon circle arrow damage +50%, while stationary and migrating. Requires a Wagon circle to fire.',
      apply: (r) => {
        r.clan.campEffects.multipliers.wagonDamage *= S.fortressDamage;
      },
    },
  ],
};
