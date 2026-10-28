import { GAME } from '../config';
import { PATRONS } from './patrons';
import type { PatronId, UpgradeDefinition } from '../types';

import { SPECIALIZATIONS, type Technology } from './specializations';
const P = GAME.patrons;
const need = (id: string, rank = 1): { id: string; rank: number } => ({ id, rank });

/** Authored prerequisites and roles determine each connected patron tradition. */
const PATHS: readonly { patron: PatronId; technologies: readonly Technology[] }[] = [
  {
    patron: 'borte-chino',
    technologies: [
      {
        id: 'wolf-trail',
        kind: 'foundation',
        title: 'The wolf’s trail',
        maxStacks: 2,
        description:
          'Each rank: while momentum is above half, your side deals 15% more damage. The Khan also rides 4% faster.',
        apply: (run) => {
          run.patrons.hunt.movingDamage *= P.wolf.movingDamage;
          run.stats.speed *= P.wolf.speed;
        },
      },
      {
        id: 'culling-bite',
        kind: 'practice',
        title: 'The culling bite',
        maxStacks: 1,
        requires: [need('wolf-trail')],
        description: 'Your side deals 30% more damage to enemies below half health.',
        apply: (run) => {
          run.patrons.hunt.executeDamage *= P.wolf.execute;
        },
      },
      {
        id: 'pursuit-gallop',
        kind: 'practice',
        title: 'Never lose the quarry',
        maxStacks: 1,
        requires: [need('wolf-trail')],
        description: 'The gallop cooldown is 25% shorter: 2.25 seconds instead of 3.',
        apply: (run) => {
          run.patrons.hunt.gallopCooldown *= P.wolf.gallop;
        },
      },
      {
        id: 'blood-of-the-hunt',
        kind: 'capstone',
        title: 'Blood of the hunt',
        maxStacks: 1,
        requires: [need('wolf-trail', 2), need('culling-bite')],
        description: 'Each kill made above half momentum heals the Khan for 2.',
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
        kind: 'foundation',
        title: 'Tend the living ground',
        maxStacks: 2,
        description:
          'Each rank: the camp produces 15% more food, and the pasture wears out 15% more slowly.',
        apply: (run) => {
          run.patrons.land.food *= P.earth.food;
          run.patrons.land.pastureUse *= P.earth.pasture;
        },
      },
      {
        id: 'shared-labour',
        kind: 'practice',
        title: 'Many hands, one camp',
        maxStacks: 1,
        requires: [need('tended-pasture')],
        description: 'The camp gathers 25% more materials.',
        apply: (run) => {
          run.patrons.land.materials *= P.earth.materials;
        },
      },
      {
        id: 'measured-herds',
        kind: 'practice',
        title: 'Take only what we need',
        maxStacks: 1,
        requires: [need('tended-pasture')],
        description: 'Everyone eats 20% less food, on the road as well as in camp.',
        apply: (run) => {
          run.patrons.land.consumption *= P.earth.consumption;
        },
      },
      {
        id: 'living-earth',
        kind: 'capstone',
        title: 'The earth remembers care',
        maxStacks: 1,
        requires: [need('tended-pasture', 2), need('measured-herds')],
        description:
          'While the camp stays put, the pasture regrows 0.12 percentage points every active second, offsetting what the herds take.',
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
        kind: 'foundation',
        title: 'The measured bow',
        maxStacks: 2,
        description:
          'Each rank: shared attack damage rises 25%, and the Khan and riders can target enemies 30 paces farther out.',
        apply: (run) => {
          run.stats.damage *= P.bow.damage;
          run.patrons.bow.range += P.bow.range;
        },
      },
      {
        id: 'haste',
        kind: 'practice',
        title: 'An unbroken volley',
        maxStacks: 1,
        requires: [need('power')],
        description:
          'The mounted host’s firing interval is 15% shorter. On every fourth volley, the riders with you loose paired arrows.',
        apply: (run) => {
          run.stats.attackInterval *= P.bow.interval;
        },
      },
      {
        id: 'piercing-shaft',
        kind: 'practice',
        title: 'One shaft, two shadows',
        maxStacks: 1,
        requires: [need('power')],
        description:
          'Your arrows pass through one more enemy. A charged Khan volley briefly pins ordinary enemies and breaks their charges. No arrow can strike the same creature twice.',
        apply: (run) => {
          run.patrons.bow.pierce += P.bow.pierce;
        },
      },
      {
        id: 'sky-volley',
        kind: 'capstone',
        title: 'A sky full of arrows',
        maxStacks: 1,
        requires: [need('power', 2), need('wide-quiver')],
        description:
          'Every Khan volley carries two more arrows, and your volleys fan out a further 35%.',
        apply: (run) => {
          run.stats.projectiles += P.bow.volley;
          run.patrons.bow.spread *= P.specializations.stormSpread;
        },
      },
    ],
  },
  {
    patron: 'golomt',
    technologies: [
      {
        id: 'vitality',
        kind: 'foundation',
        title: 'Keep the hearth alive',
        maxStacks: 2,
        description:
          'Each rank: the Khan gains 20 maximum health and, if alive, recovers 35 health at once.',
        apply: (run) => {
          run.stats.maxHealth += P.fire.health;
          run.health = Math.min(run.stats.maxHealth, run.health + P.fire.heal);
        },
      },
      {
        id: 'carried-embers',
        kind: 'practice',
        title: 'The carried embers',
        maxStacks: 1,
        requires: [need('vitality')],
        description: 'The Khan recovers 0.3 health every active second.',
        apply: (run) => {
          run.patrons.hearth.regeneration += P.fire.regeneration;
        },
      },
      {
        id: 'felt-and-fire',
        kind: 'practice',
        title: 'Felt around the flame',
        maxStacks: 1,
        requires: [need('vitality')],
        description: 'The Khan takes 15% less damage.',
        apply: (run) => {
          run.patrons.hearth.damageTaken *= P.fire.protection;
        },
      },
      {
        id: 'last-ember',
        kind: 'capstone',
        title: 'The last ember',
        maxStacks: 1,
        requires: [need('vitality', 2), need('carried-embers')],
        description:
          'Once per expedition, a hit that would kill the Khan instead restores 40% of maximum health.',
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
        kind: 'foundation',
        title: 'Find the watercourse',
        maxStacks: 2,
        description: 'Each rank: enemies within 165 paces of the Khan or the camp move 12% slower.',
        apply: (run) => {
          run.patrons.water.slow += P.water.slow;
        },
      },
      {
        id: 'reed-beds',
        kind: 'practice',
        title: 'Shelter among the reeds',
        maxStacks: 1,
        requires: [need('watercourse')],
        description: 'The slowing fields reach 65 paces farther.',
        apply: (run) => {
          run.patrons.water.radius += P.water.radiusBonus;
        },
      },
      {
        id: 'turned-earth',
        kind: 'practice',
        title: 'Read the shifting ground',
        maxStacks: 1,
        requires: [need('watercourse')],
        description:
          'Eruption warnings last one second longer, and eruptions deal half damage. Galloping leaves a short-lived slowing wake behind you.',
        apply: (run) => {
          run.patrons.water.warning += P.water.warning;
          run.patrons.water.hazardDamage *= P.water.hazardDamage;
        },
      },
      {
        id: 'returning-current',
        kind: 'capstone',
        title: 'The returning current',
        maxStacks: 1,
        requires: [need('watercourse', 2), need('reed-beds')],
        description:
          'Every 4 active seconds, the Khan’s field strikes for 75% shared damage and pushes enemies back 80 paces.',
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
        kind: 'foundation',
        title: 'A rider remembered',
        maxStacks: 2,
        description:
          'Each rank calls one ancestral echo to ride with the Khan. Echoes fire for 55% shared damage every 1.1 seconds.',
        apply: (run) => {
          run.patrons.ancestors.count += 1;
        },
      },
      {
        id: 'remembered-aim',
        kind: 'practice',
        title: 'Hands remember the bow',
        maxStacks: 1,
        requires: [need('ancestral-companion')],
        description: 'Ancestral arrows deal 90% shared damage instead of 55%.',
        apply: (run) => {
          run.patrons.ancestors.damage += P.ancestors.damageBonus;
        },
      },
      {
        id: 'spirit-thread',
        kind: 'practice',
        title: 'Follow the spirit thread',
        maxStacks: 1,
        requires: [need('ancestral-companion')],
        description:
          'Shards are drawn in from 40% farther away, and kills store 25% more Spirit for building the camp.',
        apply: (run) => {
          run.stats.pickupRadius *= P.ancestors.pickup;
          run.patrons.ancestors.spiritGain *= P.ancestors.spiritGain;
        },
      },
      {
        id: 'council-of-ancestors',
        kind: 'capstone',
        title: 'The council rides with us',
        maxStacks: 1,
        requires: [need('ancestral-companion', 2), need('remembered-aim')],
        description:
          'A third ancestral echo joins the others, and every echo’s firing interval is 30% shorter.',
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
        kind: 'foundation',
        title: 'Riders of one standard',
        maxStacks: 2,
        description:
          'Each rank brings one more rider to ride with you, whatever the Khan’s arrow count.',
        apply: (run) => {
          run.patrons.banner.riders += 1;
        },
      },
      {
        id: 'rallying-banner',
        kind: 'practice',
        title: 'Rally to the blue cloth',
        maxStacks: 1,
        requires: [need('sworn-riders')],
        description: 'The riders with you deal 25% more arrow damage.',
        apply: (run) => {
          run.patrons.banner.damage *= P.banner.damage;
        },
      },
      {
        id: 'ordered-march',
        kind: 'practice',
        title: 'No wagon left behind',
        maxStacks: 1,
        requires: [need('sworn-riders')],
        description: 'The caravan’s migration mobility rises 15%.',
        apply: (run) => {
          run.patrons.banner.mobility *= P.banner.mobility;
        },
      },
      {
        id: 'unbroken-standard',
        kind: 'capstone',
        title: 'The unbroken standard',
        maxStacks: 1,
        requires: [need('sworn-riders', 2), need('rallying-banner')],
        description: 'Two more riders join you, and every enemy kill restores 0.15 clan resolve.',
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
        kind: 'foundation',
        title: 'Foundations we can carry',
        maxStacks: 2,
        description:
          'Each rank: camp building costs 10% fewer materials, and the clan takes 10% less damage.',
        apply: (run) => {
          run.patrons.guardian.cost *= P.guardian.cost;
          run.patrons.guardian.protection *= P.guardian.protection;
        },
      },
      {
        id: 'watchfires',
        kind: 'practice',
        title: 'Watchfires on the ridge',
        maxStacks: 1,
        requires: [need('caravan-foundations')],
        description:
          'Wagon defence fires 25% faster. Without a Wagon circle, a short-range guard shot deals 35% shared damage.',
        apply: (run) => {
          run.patrons.guardian.wagonInterval *= P.guardian.wagonInterval;
        },
      },
      {
        id: 'stone-shelter',
        kind: 'practice',
        title: 'A circle of sheltered ground',
        maxStacks: 1,
        requires: [need('caravan-foundations')],
        description:
          'A ward around the camp strikes enemies within 125 paces for 65% shared damage every 2 active seconds, even on the march.',
        apply: (run) => {
          run.patrons.guardian.wardDamage += P.guardian.wardDamage;
        },
      },
      {
        id: 'hold-the-passage',
        kind: 'capstone',
        title: 'Hold the passage',
        maxStacks: 1,
        requires: [need('caravan-foundations', 2), need('stone-shelter')],
        description:
          'The clan takes a further 20% less damage, on top of formations and camp armor.',
        apply: (run) => {
          run.patrons.guardian.protection *= P.guardian.capProtection;
        },
      },
    ],
  },
];

const TECHNOLOGY_ICONS: Readonly<Record<string, string>> = {
  'blood-of-the-hunt': 'wolf',
  'wind-rider': 'horse',
  'living-earth': 'grain',
  'hands-of-the-steppe': 'materials',
  'sky-volley': 'volley',
  'one-perfect-shot': 'bow',
  'through-the-horde': 'pierce',
  'wide-quiver': 'volley',
  'last-ember': 'hearth',
  'unbroken-hearth': 'healer',
  'returning-current': 'river',
  'still-waters': 'mountain',
  'council-of-ancestors': 'spirit',
  'keeper-of-names': 'journal',
  'unbroken-standard': 'banner',
  'caravan-vanguard': 'horse',
  'hold-the-passage': 'mountain',
  'rolling-fortress': 'wagon',
};

export const UPGRADES: readonly UpgradeDefinition[] = PATHS.flatMap((path) => {
  const patron = PATRONS.find((entry) => entry.id === path.patron)!;
  const foundation = path.technologies.find((t) => t.kind === 'foundation')!;
  const originals = path.technologies.map((technology): Technology =>
    technology.kind === 'capstone'
      ? { ...technology, knowledgeCost: P.specializations.capstoneCost, exclusiveGroup: 'capstone' }
      : technology,
  );
  const alternatives = SPECIALIZATIONS[path.patron].map((technology): Technology =>
    technology.kind === 'practice'
      ? technology
      : {
          ...technology,
          kind: 'capstone',
          knowledgeCost: P.specializations.capstoneCost,
          exclusiveGroup: 'capstone',
          requires: [need(foundation.id, 2), ...(technology.requires ?? [])],
        },
  );
  return [...originals, ...alternatives].map((technology) => ({
    ...technology,
    patron: patron.id,
    category: patron.playstyle,
    subtitle: patron.name,
    icon: TECHNOLOGY_ICONS[technology.id] ?? patron.symbol,
  }));
});
