import { expect, it } from 'vitest';
import { GAME } from '../../src/game/config';
import { STARTING_TRADITIONS } from '../../src/game/data/clan';
import { PACING_PLAYSTYLES, pacingBenchmark } from '../../src/game/dev/pacingBenchmark';
for (const style of PACING_PLAYSTYLES)
  for (const tradition of STARTING_TRADITIONS)
    it(`${style} / ${tradition.id} runs a bounded, repeatable pressure window with real migrations`, () => {
      const { run, outcome } = pacingBenchmark(style, tradition.id);
      expect(pacingBenchmark(style, tradition.id).run).toEqual(run);
      expect([undefined, 'lost']).toContain(outcome);
      expect(run.elapsed).toBeLessThanOrEqual(GAME.pacing.maximumSeconds);
      if (outcome === undefined) expect(run.clan.population).toBeGreaterThan(0);
      expect(run.legacy.crossings.length).toBeGreaterThanOrEqual(3);
      expect(run.metrics!.stages.length).toBeGreaterThan(0);
      expect(run.metrics!.stages.some((s) => s.damage > 0)).toBe(true);
    });
it('exposes different kill rates, travel and population outcomes rather than one dominant schedule', () => {
  const a = pacingBenchmark('riding', 'shared-hearth').run;
  const b = pacingBenchmark('guarding', 'shared-hearth').run;
  const c = pacingBenchmark('migrating', 'shared-hearth').run;
  expect(a.kills / a.elapsed).toBeGreaterThan(b.kills / b.elapsed);
  expect(b.clan.population).toBeGreaterThan(c.clan.population);
  expect(c.legacy.crossings.length).toBeGreaterThan(b.legacy.crossings.length);
  for (const run of [a, b, c]) expect(run.level - 1).toBeGreaterThanOrEqual(45);
});
