import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// Runs state simulations without WebGL, wall-clock gameplay or a listening server.
const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true } });
try {
  const { pacingBenchmark, PACING_PLAYSTYLES } = await server.ssrLoadModule(
    '/src/game/dev/pacingBenchmark.ts',
  );
  const { STARTING_TRADITIONS } = await server.ssrLoadModule('/src/game/data/clan.ts');
  const { RESEARCH } = await server.ssrLoadModule('/src/game/data/research.ts');
  const { validateResearchPurchase } = await server.ssrLoadModule('/src/game/state/research.ts');
  const { planResearch } = await server.ssrLoadModule('/src/game/state/researchPaths.ts');
  const modelledJourneys = STARTING_TRADITIONS.flatMap((t) =>
    PACING_PLAYSTYLES.map((style) => {
      const { run, outcome } = pacingBenchmark(style, t.id);
      return {
        tradition: t.id,
        style,
        outcome,
        seconds: run.elapsed,
        knowledgeEarned: run.level - 1,
        kills: run.kills,
        people: run.clan.population,
        resolve: run.clan.integrity,
      };
    }),
  );
  const cataloguePaths = RESEARCH.filter((t) => t.tier === 'mythic' || t.tier === 'hybrid').map(
    (t) => {
      const path = planResearch(
        { upgrades: {}, pendingUpgrades: 75, completedCrossings: 3 },
        t.id,
        true,
      );
      return {
        id: t.id,
        cost: path.cost,
        reasons: path.reasons,
        runtimeAvailable: !t.unavailableReason,
      };
    },
  );
  const examples = [
    {
      name: 'Focused Storm Archer',
      goals: ['km-one-arrow-one-fate', 'hy-galloping-barrage', 'gen-tested-formation'],
    },
    {
      name: 'Two-patron Thousand Arrows',
      goals: ['km-sky-darkener', 'su-great-kurultai', 'hy-thousand-arrows', 'gen-great-gathering'],
    },
    {
      name: 'Three-patron generalist',
      goals: ['bc-great-hunt', 'go-eternal-hearth', 'lu-land-in-motion', 'gen-tested-formation'],
    },
  ];
  const exampleBuilds = examples.flatMap((example) => {
    const state = { upgrades: {}, pendingUpgrades: 999, completedCrossings: 3 };
    let purchases = 0;
    for (const goal of example.goals) {
      const path = planResearch(state, goal, true);
      if (path.reasons.length) throw new Error(`${goal}: ${path.reasons.join('; ')}`);
      for (const step of path.steps) {
        const check = validateResearchPurchase(state, step.id, step.rank - 1);
        if (check.reasonCodes.some((c) => c !== 'unimplemented'))
          throw new Error(`Illegal authoring allocation: ${goal}/${step.id}`);
        state.upgrades[step.id] = step.rank;
        state.pendingUpgrades -= step.cost;
        purchases++;
      }
    }
    const cost = 999 - state.pendingUpgrades;
    return [45, 60, 75].map((knowledge) => ({
      name: example.name,
      goals: example.goals,
      knowledge,
      cost,
      purchases,
      fits: cost <= knowledge,
      remaining: knowledge - cost,
      authoringOnly: true,
    }));
  });
  const allocationBudgets = [45, 60, 75].map((knowledge) => ({
    knowledge,
    xpRequired: 3 * knowledge ** 2 + 5 * knowledge,
    authoredMythicsWithinBudget: cataloguePaths.filter(
      (p) => !p.id.startsWith('hy-') && p.cost <= knowledge && !p.reasons.length,
    ).length,
    authoredHybridsWithinBudget: cataloguePaths.filter(
      (p) => p.id.startsWith('hy-') && p.cost <= knowledge && !p.reasons.length,
    ).length,
    note: 'Individual goals, not simultaneous ownership of exclusive alternatives; unavailable effects remain unpurchasable.',
  }));
  console.log(
    JSON.stringify(
      {
        modelledJourneys,
        allocationBudgets,
        exampleBuilds,
        cataloguePaths,
        limitations: [
          'Combat exposure and kills are modelled, not observed player runs.',
          'Legacy purchases are used by the pacing benchmark.',
          'No source-damage or projectile frame-time claim is made by this state simulation.',
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await server.close();
}
