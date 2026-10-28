import { GAME } from '../config';
import type { PatronId, UpgradeDefinition } from '../types';
export type Technology = Omit<UpgradeDefinition, 'patron' | 'category' | 'subtitle' | 'icon'>;
const S = GAME.patrons.specializations;

export const SPECIALIZATIONS: Record<PatronId, readonly Technology[]> = {
  'borte-chino': [
    {
      id: 'wind-rider',
      title: 'Ride ahead of the storm',
      maxStacks: 1,
      requires: [{ id: 'pursuit-gallop', rank: 1 }],
      description: 'Ride 10% faster. Above half momentum, attacks deal 20% more damage.',
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
      description: 'Gather 40% more materials to keep the travelling camp growing.',
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
        'Each Khan volley carries one more arrow and your volleys fan out 20% wider, but shared damage drops 10%.',
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
        'Shared attack damage rises 60%, and the Khan and riders can target enemies 60 paces farther out. For heavier, truer volleys.',
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
      description: 'Your arrows pass through two more enemies. Best against deep ranks closing in.',
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
        'The Khan gains 40 maximum health and takes a further 15% less damage. Steady protection, in place of the last ember.',
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
        'The slowing fields slow enemies by a further 18 percentage points, and eruption warnings last another half-second.',
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
        'Shards are drawn in from 30% farther away, and kills store 50% more Spirit. Keep two echoes and put the gain into the camp.',
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
        'Migration mobility rises 25%, and the clan takes a further 25% less damage. A safer crossing, in place of more riders.',
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
        'Wagon defence deals 50% more damage, in camp and on the march. Without a Wagon circle, this also strengthens the short-range guard shot.',
      apply: (r) => {
        r.clan.campEffects.multipliers.wagonDamage *= S.fortressDamage;
      },
    },
  ],
};
