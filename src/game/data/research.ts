import { RESEARCH_BLOCKERS } from './researchIntegration';
import { UPGRADES } from './upgrades';
import { RESEARCH_EXPANSIONS } from './researchCatalogue';
import type { ResearchDefinition } from './researchTypes';

const TAGS: Readonly<Record<string, readonly string[]>> = {
  'borte-chino': ['projectile', 'migration', 'sustain'],
  'etugen-eke': ['camp', 'migration'],
  'khukhedei-mergen': ['projectile'],
  golomt: ['sustain', 'camp'],
  lus: ['terrain'],
  ongod: ['companion', 'spirit'],
  sulde: ['companion', 'migration'],
  'burkhan-guardian': ['camp', 'projectile'],
};
const IMPLEMENTED_HANDLERS = [
  'hy-galloping-barrage',
  'hy-stillwater-refuge',
  'hy-river-of-spirits',
  'ee-deep-roots',
  'go-layered-felt',
  'go-common-fire',
  'km-feathered-fan',
  'on-spirit-signal',
  'on-memory-vessels',
  'on-quiet-council',
  'on-ancestral-archers',
  'bc-scent-of-fear',
  'bc-bounding-charge',
  'bc-pack-instinct',
  'bc-hounds-of-the-horizon',
  'bc-wind-cutting-hooves',
  'bc-throat-of-the-prey',
  'bc-storm-chaser',
  'bc-call-of-the-pack',
  'bc-endless-pursuit',
  'ee-vigilant-herders',
  'ee-camp-of-craftspeople',
  'ee-bounty-in-scarcity',
  'ee-wandering-city',
  'ee-unbroken-seasons',
  'km-draw-to-breath',
  'km-barbed-flight',
  'km-eagle-eye',
  'km-drilling-shafts',
  'km-arrow-rain',
  'km-still-hand',
  'km-sunder-the-ranks',
  'km-circle-of-shafts',
  'km-one-arrow-one-fate',
  'km-world-piercer',
  'km-sky-darkener',
] as const;

export const RESEARCH: readonly ResearchDefinition[] = [
  ...UPGRADES.map((u): ResearchDefinition => ({
    id: u.id,
    title: u.title,
    description: u.description,
    tier: u.kind === 'capstone' ? 'doctrine' : (u.kind ?? 'practice'),
    patronIds: [u.patron],
    maxRank: u.maxStacks,
    pointCostPerRank: Array.from({ length: u.maxStacks }, () => u.knowledgeCost ?? 1),
    requiresAll: u.requires ?? [],
    requiresAny: [],
    minSpendByPatron: {},
    minCompletedCrossings: 0,
    exclusiveGroup: u.exclusiveGroup ? `doctrine:${u.patron}` : undefined,
    tags: TAGS[u.patron] ?? [],
    effects: [{ kind: 'legacy', upgradeId: u.id }],
  })),
  ...RESEARCH_EXPANSIONS.map((t): ResearchDefinition => {
    const handler = IMPLEMENTED_HANDLERS.find((id) => id === t.id);
    const tags = [
      ...new Set(
        t.patronIds.length ? t.patronIds.flatMap((p) => TAGS[p] ?? []) : ['camp', 'migration'],
      ),
    ];
    return handler
      ? { ...t, tags, unavailableReason: undefined, effects: [{ kind: 'runtime', handler }] }
      : {
          ...t,
          tags,
          unavailableReason:
            RESEARCH_BLOCKERS[t.id] ??
            `${t.title}: runtime effect is deferred at the failed patron integration gate`,
        };
  }),
];
export const RESEARCH_BY_ID: ReadonlyMap<string, ResearchDefinition> = new Map(
  RESEARCH.map((t) => [t.id, t]),
);

/** Authoring validation runs in CI; data is never executable text. */
export function researchRegistryErrors(registry = RESEARCH): string[] {
  const errors: string[] = [],
    ids = new Map(registry.map((t) => [t.id, t]));
  if (ids.size !== registry.length) errors.push('Duplicate research ID');
  const active = new Set<string>(),
    done = new Set<string>();
  function visit(t: ResearchDefinition): void {
    if (active.has(t.id)) {
      errors.push(`Cycle: ${t.id}`);
      return;
    }
    if (done.has(t.id)) return;
    active.add(t.id);
    if (
      t.pointCostPerRank.length !== t.maxRank ||
      t.pointCostPerRank.some((c) => !Number.isInteger(c) || c < 1)
    )
      errors.push(`Invalid rank costs: ${t.id}`);
    for (const r of [...t.requiresAll, ...t.requiresAny]) {
      const parent = ids.get(r.id);
      if (!parent || !Number.isInteger(r.rank) || r.rank < 1 || r.rank > parent.maxRank)
        errors.push(`Invalid prerequisite: ${t.id}:${r.id}`);
      else visit(parent);
    }
    active.delete(t.id);
    done.add(t.id);
  }
  registry.forEach(visit);
  return errors;
}
