import { GAME } from '../config';
import { STARTING_TRADITIONS, type StartingTraditionId } from '../data/clan';
import { UPGRADES } from '../data/upgrades';
import { advanceClan, beginMigration, buildStructure } from '../state/clan';
import { createRun, gainExperience, applyUpgrade, upgradeBlocker } from '../state/run';
import { damageClan } from '../state/clan';
import { observeExpedition, markExpedition, metricStage } from '../state/expeditionMetrics';

export const PACING_PLAYSTYLES = ['riding', 'guarding', 'migrating'] as const;
/** A deterministic economy/progression pressure model, not a replacement for physical combat playtests. */
export function pacingBenchmark(
  style: (typeof PACING_PLAYSTYLES)[number],
  tradition: StartingTraditionId,
) {
  const run = createRun(tradition),
    config = GAME.pacing,
    plan = config[style];
  run.phase = 'playing';
  run.story.enabled = false;
  metricStage(run);
  let nextKill: number = config.firstContact,
    nextContact: number = config.contactEvery;
  let outcome: 'saved' | 'lost' | undefined;
  const buy = (id: 'archery' | 'ger', path?: string) => {
    run.phase = 'building';
    buildStructure(run, id, path);
    run.phase = 'playing';
  };
  while (!outcome && run.elapsed < config.maximumSeconds) {
    if (run.clan.stage === 'camp') {
      if (!run.clan.buildings.archery) buy('archery');
      if (style === 'guarding' && !run.clan.paths.ger?.includes('hearthkeepers'))
        buy('ger', 'hearthkeepers');
      if (run.clan.stageTime >= plan.departAt) {
        run.phase = 'route';
        beginMigration(
          run,
          style === 'migrating' ? 'river' : style === 'riding' ? 'ridge' : 'refuge',
        );
        run.phase = 'playing';
      }
    }
    if (run.elapsed >= nextKill) {
      markExpedition(run, 'fight');
      run.kills++;
      gainExperience(run, 3);
      nextKill += plan.killEvery;
      const choice = UPGRADES.find((u) => !upgradeBlocker(run, u));
      if (choice) applyUpgrade(run, choice);
    }
    if (run.elapsed >= nextContact) {
      const exposure =
        run.clan.stage === 'migration'
          ? config.crossingExposure
          : run.clan.stage === 'final'
            ? config.finalExposure
            : plan.exposure;
      damageClan(run, 10 * GAME.camp.enemyAttack.damageMultiplier * exposure);
      nextContact += config.contactEvery;
    }
    const riding = (run.elapsed % 10) / 10 < plan.ridingShare;
    observeExpedition(run, config.sampleStep, riding, !riding);
    run.elapsed += config.sampleStep;
    const result = advanceClan(run, config.sampleStep);
    if (result === 'saved' || result === 'lost') outcome = result;
  }
  return { run, outcome };
}
export function pacingBenchmarkLines(): string[] {
  return PACING_PLAYSTYLES.flatMap((style) =>
    STARTING_TRADITIONS.map(({ id }) => {
      const { run, outcome } = pacingBenchmark(style, id);
      return `${style}/${id}: ${outcome ?? 'timeout'}, ${run.elapsed.toFixed(0)}s, ${run.clan.population} people, ${run.clan.integrity.toFixed(0)} resolve, ${run.clan.food.toFixed(0)} food, ${run.level - 1} knowledge earned.`;
    }),
  );
}
