import { expect, it } from 'vitest';
import { edgeWarnings, incomingTime } from '../../src/game/systems/combatReadability';
import { majorLossMessage, dangerWarningsContent } from '../../src/ui/combatReadabilityContent';
import { createRun } from '../../src/game/state/run';
import { damageClan } from '../../src/game/state/clan';

it('predicts incoming shots but rejects moving-away, stationary, late and safe passing trajectories', () => {
  const target = { x: 0, y: 0 };
  expect(incomingTime({ x: 300, y: 0 }, { x: -100, y: 0 }, target, 20)).toBe(3);
  expect(incomingTime({ x: 300, y: 0 }, { x: 100, y: 0 }, target, 20)).toBeUndefined();
  expect(incomingTime({ x: 300, y: 40 }, { x: -100, y: 0 }, target, 20)).toBeUndefined();
  expect(incomingTime({ x: 500, y: 0 }, { x: -100, y: 0 }, target, 20)).toBeUndefined();
  expect(incomingTime({ x: 0, y: 0 }, { x: 0, y: 0 }, target, 20)).toBeUndefined();
});
it('groups volleys, prioritizes imminent danger and bounds every edge marker inside small viewports', () => {
  const warnings = edgeWarnings(
    Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      label: 'Arrow',
      x: i % 2 ? 1200 : -100,
      y: i % 3 ? 300 : -100,
      eta: i / 100,
    })),
    800,
    600,
  );
  expect(warnings.length).toBeLessThanOrEqual(4);
  expect(warnings[0]!.eta).toBe(0);
  for (const w of warnings) {
    expect(w.x).toBeGreaterThan(0);
    expect(w.x).toBeLessThan(1);
    expect(w.y).toBeGreaterThan(0);
    expect(w.y).toBeLessThan(1);
  }
  expect(edgeWarnings([{ id: 'x', label: '', x: 20, y: 20, eta: 1 }], 800, 600)).toEqual([]);
  expect(dangerWarningsContent([{ ...warnings[0]!, label: '<img src=x>' }])).not.toContain('<img');
});
it('retains the major cause through minor hits, gives useful advice, and expires only on active time', () => {
  const run = createRun();
  run.elapsed = 25;
  damageClan(run, 30, undefined, 'attack', 'Skybreaker');
  damageClan(run, 0.1, undefined, 'area');
  expect(majorLossMessage(run)).toContain('Skybreaker');
  expect(majorLossMessage(run)).toContain('1 person lost');
  expect(majorLossMessage(run)).toContain('Guard the threatened approach');
  run.phase = 'paused';
  expect(majorLossMessage(run)).toContain('Skybreaker');
  run.elapsed = 37;
  expect(majorLossMessage(run)).toBe('');
});
