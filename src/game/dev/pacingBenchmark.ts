import type { NomadicBuildingId } from '../../shared/nomadicCamp.js';
import { GAME } from '../config';
import { STARTING_TRADITIONS, type StartingTraditionId } from '../data/clan';
import { advanceClan, beginMigration, damageClan } from '../state/clan';
import { encounterEnemy } from '../state/encounters';
import { markExpedition, metricStage, observeExpedition } from '../state/expeditionMetrics';
import { nomadicBuildingLevel, purchaseNomadicBuilding } from '../state/nomadicCamp';
import { createRun, gainExperience } from '../state/run';

function createPacingRng(seed = 0x42): () => number {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PACING_PLAYSTYLES = ['riding', 'guarding', 'migrating'] as const;
/** A deterministic economy/progression pressure model, not a replacement for physical combat playtests. */
export function pacingBenchmark(
  style: (typeof PACING_PLAYSTYLES)[number],
  tradition: StartingTraditionId,
  random: () => number = createPacingRng(),
) {
  const run = createRun(tradition),
    config = GAME.pacing,
    plan = config[style];
  run.phase = 'playing';
  metricStage(run);
  let nextKill: number = config.firstContact,
    nextContact: number = config.contactEvery;
  let outcome: 'lost' | undefined;
  const buy = (id: NomadicBuildingId) => {
    run.phase = 'building';
    purchaseNomadicBuilding(run, id);
    run.phase = 'playing';
  };
  while (!outcome && run.elapsed < config.maximumSeconds) {
    if (run.clan.stage === 'camp') {
      if (!nomadicBuildingLevel(run.clan.nomadicCamp!, 'archery-range')) buy('archery-range');
      if (style === 'guarding') {
        if (run.clan.nomadicCamp!.core['khans-ger'] < 2) buy('khans-ger');
        else if (run.clan.nomadicCamp!.core['communal-hearth'] < 2) buy('communal-hearth');
        else if (!nomadicBuildingLevel(run.clan.nomadicCamp!, 'palisade-watchfires'))
          buy('palisade-watchfires');
      }
      if (run.clan.stageTime >= plan.departAt) {
        run.phase = 'route';
        beginMigration(
          run,
          style === 'migrating' ? 'river' : style === 'riding' ? 'ridge' : 'refuge',
        );
        run.phase = 'playing';
      }
    }
    while (run.elapsed >= nextKill) {
      markExpedition(run, 'fight');
      run.kills++;
      const enemy = encounterEnemy(run, random);
      gainExperience(run, enemy.definition.xp);
      nextKill += plan.killEvery;
    }
    if (run.elapsed >= nextContact) {
      const exposure = run.clan.stage === 'migration' ? config.journeyExposure : plan.exposure;
      damageClan(run, 10 * GAME.camp.enemyAttack.damageMultiplier * exposure);
      nextContact += config.contactEvery;
    }
    const riding = (run.elapsed % 10) / 10 < plan.ridingShare;
    observeExpedition(run, config.sampleStep, riding, !riding);
    run.elapsed += config.sampleStep;
    const result = advanceClan(run, config.sampleStep);
    if (result === 'lost') outcome = result;
  }
  return { run, outcome };
}
export function pacingBenchmarkLines(): string[] {
  return PACING_PLAYSTYLES.flatMap((style) =>
    STARTING_TRADITIONS.map(({ id }) => {
      const { run, outcome } = pacingBenchmark(style, id);
      return `${style}/${id}: ${outcome ?? 'survived'}, ${run.elapsed.toFixed(0)}s, ${run.clan.population} people, ${run.clan.integrity.toFixed(0)} resolve, ${run.clan.food.toFixed(0)} food, ${run.level - 1} levels earned.`;
    }),
  );
}
