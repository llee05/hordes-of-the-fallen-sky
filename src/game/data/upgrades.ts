import { GAME } from '../config';
import { PATRONS } from './patrons';
import type { PatronId, UpgradeDefinition } from '../types';

type Technology = Omit<UpgradeDefinition, 'patron' | 'category' | 'subtitle' | 'icon'>;
const P = GAME.patrons;
const need = (id: string, rank = 1): { id: string; rank: number } => ({ id, rank });

/** Each patron has a repeatable foundation, two complementary practices, and a capstone. */
const PATHS: readonly { patron: PatronId; technologies: readonly Technology[] }[] = [
  {
    patron: 'borte-chino',
    technologies: [
      {
        id: 'wolf-trail',
        title: 'The wolf’s trail',
        maxStacks: 2,
        description: 'Each rank: +15% friendly damage above half momentum; Khan rides 4% faster.',
        apply: (run) => {
          run.patrons.hunt.movingDamage *= P.wolf.movingDamage;
          run.stats.speed *= P.wolf.speed;
        },
      },
      {
        id: 'culling-bite',
        title: 'The culling bite',
        maxStacks: 1,
        requires: [need('wolf-trail', 2)],
        description: 'Friendly attacks deal 30% more damage to enemies below half health.',
        apply: (run) => {
          run.patrons.hunt.executeDamage *= P.wolf.execute;
        },
      },
      {
        id: 'pursuit-gallop',
        title: 'Never lose the quarry',
        maxStacks: 1,
        requires: [need('wolf-trail', 2)],
        description: 'Gallop cooldown falls by 25%, from 3 seconds to 2.25.',
        apply: (run) => {
          run.patrons.hunt.gallopCooldown *= P.wolf.gallop;
        },
      },
      {
        id: 'blood-of-the-hunt',
        title: 'Blood of the hunt',
        maxStacks: 1,
        requires: [need('culling-bite'), need('pursuit-gallop')],
        description: 'Every kill above half momentum restores 2 Khan health.',
        apply: (run) => {
          run.patrons.hunt.killHeal += P.wolf.killHeal;
        },
      },
    ],
  },
  {
    patron: 'etugen-eke',
    technologies: [
      {
        id: 'tended-pasture',
        title: 'Tend the living ground',
        maxStacks: 2,
        description: 'Each rank: food production +15%; pasture depletion falls by 15%.',
        apply: (run) => {
          run.patrons.land.food *= P.earth.food;
          run.patrons.land.pastureUse *= P.earth.pasture;
        },
      },
      {
        id: 'shared-labour',
        title: 'Many hands, one camp',
        maxStacks: 1,
        requires: [need('tended-pasture', 2)],
        description: 'Camp material gathering increases by 25%.',
        apply: (run) => {
          run.patrons.land.materials *= P.earth.materials;
        },
      },
      {
        id: 'measured-herds',
        title: 'Take only what we need',
        maxStacks: 1,
        requires: [need('tended-pasture', 2)],
        description: 'People consume 20% less food, including during migration.',
        apply: (run) => {
          run.patrons.land.consumption *= P.earth.consumption;
        },
      },
      {
        id: 'living-earth',
        title: 'The earth remembers care',
        maxStacks: 1,
        requires: [need('shared-labour'), need('measured-herds')],
        description:
          'Regrow 0.12 pasture percentage points each active second while stationary, offsetting depletion.',
        apply: (run) => {
          run.patrons.land.pastureRecovery += P.earth.recovery;
        },
      },
    ],
  },
  {
    patron: 'khukhedei-mergen',
    technologies: [
      {
        id: 'power',
        title: 'The measured bow',
        maxStacks: 2,
        description:
          'Each rank: shared attack damage +25%; Khan and rider targeting range +30 paces.',
        apply: (run) => {
          run.stats.damage *= P.bow.damage;
          run.patrons.bow.range += P.bow.range;
        },
      },
      {
        id: 'haste',
        title: 'An unbroken volley',
        maxStacks: 1,
        requires: [need('power', 2)],
        description: 'The mounted host’s firing interval falls by 15%.',
        apply: (run) => {
          run.stats.attackInterval *= P.bow.interval;
        },
      },
      {
        id: 'piercing-shaft',
        title: 'One shaft, two shadows',
        maxStacks: 1,
        requires: [need('power', 2)],
        description:
          'Friendly arrows pierce one additional enemy. A single arrow cannot hit the same creature twice.',
        apply: (run) => {
          run.patrons.bow.pierce += P.bow.pierce;
        },
      },
      {
        id: 'sky-volley',
        title: 'A sky full of arrows',
        maxStacks: 1,
        requires: [need('haste'), need('piercing-shaft')],
        description: 'Add two arrows to every Khan volley.',
        apply: (run) => {
          run.stats.projectiles += P.bow.volley;
        },
      },
    ],
  },
  {
    patron: 'golomt',
    technologies: [
      {
        id: 'vitality',
        title: 'Keep the hearth alive',
        maxStacks: 2,
        description:
          'Each rank: +20 maximum Khan health. A living Khan immediately recovers 35 health.',
        apply: (run) => {
          run.stats.maxHealth += P.fire.health;
          run.health = Math.min(run.stats.maxHealth, run.health + P.fire.heal);
        },
      },
      {
        id: 'carried-embers',
        title: 'The carried embers',
        maxStacks: 1,
        requires: [need('vitality', 2)],
        description: 'Recover 0.3 Khan health per active second.',
        apply: (run) => {
          run.patrons.hearth.regeneration += P.fire.regeneration;
        },
      },
      {
        id: 'felt-and-fire',
        title: 'Felt around the flame',
        maxStacks: 1,
        requires: [need('vitality', 2)],
        description: 'Khan damage taken falls by 15%.',
        apply: (run) => {
          run.patrons.hearth.damageTaken *= P.fire.protection;
        },
      },
      {
        id: 'last-ember',
        title: 'The last ember',
        maxStacks: 1,
        requires: [need('carried-embers'), need('felt-and-fire')],
        description:
          'Once this expedition, a lethal hit instead restores 40% of maximum Khan health.',
        apply: (run) => {
          run.patrons.hearth.revives += 1;
        },
      },
    ],
  },
  {
    patron: 'lus',
    technologies: [
      {
        id: 'watercourse',
        title: 'Find the watercourse',
        maxStacks: 2,
        description: 'Each rank: enemies within 165 paces of Khan or camp move 12% slower.',
        apply: (run) => {
          run.patrons.water.slow += P.water.slow;
        },
      },
      {
        id: 'reed-beds',
        title: 'Shelter among the reeds',
        maxStacks: 1,
        requires: [need('watercourse', 2)],
        description: 'The slowing fields extend 65 paces farther.',
        apply: (run) => {
          run.patrons.water.radius += P.water.radiusBonus;
        },
      },
      {
        id: 'turned-earth',
        title: 'Read the shifting ground',
        maxStacks: 1,
        requires: [need('watercourse', 2)],
        description:
          'Eruption warnings last one second longer. Eruptions deal half damage to Khan and clan.',
        apply: (run) => {
          run.patrons.water.warning += P.water.warning;
          run.patrons.water.hazardDamage *= P.water.hazardDamage;
        },
      },
      {
        id: 'returning-current',
        title: 'The returning current',
        maxStacks: 1,
        requires: [need('reed-beds'), need('turned-earth')],
        description:
          'Every 4 active seconds, the Khan’s field deals 75% shared damage and pushes enemies back 80 paces.',
        apply: (run) => {
          run.patrons.water.pulseDamage += P.water.pulseDamage;
        },
      },
    ],
  },
  {
    patron: 'ongod',
    technologies: [
      {
        id: 'ancestral-companion',
        title: 'A rider remembered',
        maxStacks: 2,
        description:
          'Each rank summons one ancestral echo. Echoes follow the Khan and fire at 55% shared damage every 1.1 seconds.',
        apply: (run) => {
          run.patrons.ancestors.count += 1;
        },
      },
      {
        id: 'remembered-aim',
        title: 'Hands remember the bow',
        maxStacks: 1,
        requires: [need('ancestral-companion', 2)],
        description: 'Ancestral arrows rise from 55% to 90% shared damage.',
        apply: (run) => {
          run.patrons.ancestors.damage += P.ancestors.damageBonus;
        },
      },
      {
        id: 'spirit-thread',
        title: 'Follow the spirit thread',
        maxStacks: 1,
        requires: [need('ancestral-companion', 2)],
        description:
          'Shard attraction radius +40%; kills grant 25% more stored Spirit for camp construction.',
        apply: (run) => {
          run.stats.pickupRadius *= P.ancestors.pickup;
          run.patrons.ancestors.spiritGain *= P.ancestors.spiritGain;
        },
      },
      {
        id: 'council-of-ancestors',
        title: 'The council rides with us',
        maxStacks: 1,
        requires: [need('remembered-aim'), need('spirit-thread')],
        description: 'Summon a third ancestral echo. Echo firing intervals fall by 30%.',
        apply: (run) => {
          run.patrons.ancestors.count += 1;
          run.patrons.ancestors.interval *= P.ancestors.capInterval;
        },
      },
    ],
  },
  {
    patron: 'sulde',
    technologies: [
      {
        id: 'sworn-riders',
        title: 'Riders of one standard',
        maxStacks: 2,
        description: 'Each rank recruits one accompanying rider, independent of Khan arrow count.',
        apply: (run) => {
          run.patrons.banner.riders += 1;
        },
      },
      {
        id: 'rallying-banner',
        title: 'Rally to the blue cloth',
        maxStacks: 1,
        requires: [need('sworn-riders', 2)],
        description: 'Accompanying riders deal 25% more arrow damage.',
        apply: (run) => {
          run.patrons.banner.damage *= P.banner.damage;
        },
      },
      {
        id: 'ordered-march',
        title: 'No wagon left behind',
        maxStacks: 1,
        requires: [need('sworn-riders', 2)],
        description: 'Caravan migration mobility increases by 15%.',
        apply: (run) => {
          run.patrons.banner.mobility *= P.banner.mobility;
        },
      },
      {
        id: 'unbroken-standard',
        title: 'The unbroken standard',
        maxStacks: 1,
        requires: [need('rallying-banner'), need('ordered-march')],
        description: 'Recruit two more riders. Every enemy kill restores 0.15 clan resolve.',
        apply: (run) => {
          run.patrons.banner.riders += P.banner.capRiders;
          run.patrons.banner.resolveOnKill += P.banner.resolveOnKill;
        },
      },
    ],
  },
  {
    patron: 'burkhan-guardian',
    technologies: [
      {
        id: 'caravan-foundations',
        title: 'Foundations we can carry',
        maxStacks: 2,
        description: 'Each rank: camp material costs fall by 10%; clan damage taken falls by 10%.',
        apply: (run) => {
          run.patrons.guardian.cost *= P.guardian.cost;
          run.patrons.guardian.protection *= P.guardian.protection;
        },
      },
      {
        id: 'watchfires',
        title: 'Watchfires on the ridge',
        maxStacks: 1,
        requires: [need('caravan-foundations', 2)],
        description: 'Wagon circle firing intervals fall by 25%. Requires a Wagon circle to fire.',
        apply: (run) => {
          run.patrons.guardian.wagonInterval *= P.guardian.wagonInterval;
        },
      },
      {
        id: 'stone-shelter',
        title: 'A circle of sheltered ground',
        maxStacks: 1,
        requires: [need('caravan-foundations', 2)],
        description:
          'A camp ward strikes enemies within 125 paces for 65% shared damage every 2 active seconds, even while migrating.',
        apply: (run) => {
          run.patrons.guardian.wardDamage += P.guardian.wardDamage;
        },
      },
      {
        id: 'hold-the-passage',
        title: 'Hold the passage',
        maxStacks: 1,
        requires: [need('watchfires'), need('stone-shelter')],
        description:
          'Reduce all clan damage by a further 20%, stacking with formations and camp armor.',
        apply: (run) => {
          run.patrons.guardian.protection *= P.guardian.capProtection;
        },
      },
    ],
  },
];

export const UPGRADES: readonly UpgradeDefinition[] = PATHS.flatMap((path) => {
  const patron = PATRONS.find((entry) => entry.id === path.patron)!;
  return path.technologies.map((technology) => ({
    ...technology,
    patron: patron.id,
    category: patron.playstyle,
    subtitle: patron.name,
    icon: '◇',
  }));
});
