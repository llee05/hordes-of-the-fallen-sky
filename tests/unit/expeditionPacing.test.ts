import { expect, it } from 'vitest';
import { pacingBenchmark, PACING_PLAYSTYLES } from '../../src/game/dev/pacingBenchmark';
import { STARTING_TRADITIONS } from '../../src/game/data/clan';
for (const style of PACING_PLAYSTYLES)
  for (const tradition of STARTING_TRADITIONS)
    it(`${style} / ${tradition.id} completes four stages and three legal crossings with distinct risks`, () => {
      const { run, outcome } = pacingBenchmark(style, tradition.id);
      expect(outcome).toBe('saved');
      expect(run.clan.population).toBeGreaterThan(0);
      expect(run.clan.integrity).toBeGreaterThan(0);
      expect(run.story.crossings).toHaveLength(3);
      expect(run.metrics?.stages).toHaveLength(7);
      const first = run.metrics!.stages[0]!;
      expect(first.marks.fight).toBe(6);
      expect(first.marks.knowledge).toBeLessThanOrEqual(20);
      expect(first.marks.research).toBeLessThanOrEqual(20);
      expect(first.marks.departure).toBe(style === 'riding' ? 90 : style === 'guarding' ? 125 : 45);
      expect(run.metrics!.stages.some((s) => s.damage > 0)).toBe(true);
    });
it('exposes different knowledge, danger, travel and population outcomes rather than one dominant schedule', () => {
  const a = pacingBenchmark('riding', 'shared-hearth').run;
  const b = pacingBenchmark('guarding', 'shared-hearth').run;
  const c = pacingBenchmark('migrating', 'shared-hearth').run;
  expect(a.kills / a.elapsed).toBeGreaterThan(b.kills / b.elapsed);
  expect(b.clan.population).toBeGreaterThan(c.clan.population);
  expect(c.elapsed).toBeLessThan(a.elapsed);
  expect(a.metrics!.stages[0]!.damage).toBeGreaterThan(b.metrics!.stages[0]!.damage);
  expect(a.level - 1).toBeGreaterThanOrEqual(45);
  expect(b.level - 1).toBeGreaterThanOrEqual(45);
  expect(c.level - 1).toBeGreaterThanOrEqual(45);
  expect(a.level).toBeGreaterThan(b.level);
  expect(b.level).toBeGreaterThan(c.level);
});
