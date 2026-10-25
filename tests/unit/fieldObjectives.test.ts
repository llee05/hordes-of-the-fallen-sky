import { describe, expect, it } from 'vitest';
import { createRun } from '../../src/game/state/run';
import {
  advanceFieldObjective,
  completeFieldObjective,
  fieldObjectiveDue,
  startFieldObjective,
  syncFieldState,
} from '../../src/game/state/fieldObjectives';
import { GAME } from '../../src/game/config';
const camp = { x: 2600, y: 2600 },
  point = { x: 3200, y: 2600 };
function objective(kind: 'supplies' | 'herd' | 'refugees' | 'gathering') {
  const r = createRun();
  r.phase = 'playing';
  r.clan.stageTime = 20;
  syncFieldState(r);
  expect(startFieldObjective(r, point, kind)).toBe(true);
  return r;
}
describe('optional field objectives', () => {
  it('requires a living Khan and a cleared cart, grants rewards once, and bounds objectives per camp', () => {
    const r = objective('supplies'),
      food = r.clan.food;
    advanceFieldObjective(r, 5, point, camp, 1);
    expect(r.clan.food).toBe(food);
    r.phase = 'paused';
    advanceFieldObjective(r, 5, point, camp, 0);
    expect(r.field.objective!.progress).toBe(0);
    r.phase = 'playing';
    r.health = 0;
    advanceFieldObjective(r, 5, point, camp, 0);
    expect(r.clan.food).toBe(food);
    r.health = 100;
    advanceFieldObjective(r, 2, point, camp, 0);
    expect(r.clan.food).toBe(food + GAME.field.rewards.supplies.food);
    expect(completeFieldObjective(r)).toBe(false);
    expect(fieldObjectiveDue(r)).toBe(false);
    r.clan.stageTime += GAME.field.between;
    expect(startFieldObjective(r, point, 'herd')).toBe(true);
    completeFieldObjective(r);
    r.clan.stageTime += 100;
    expect(fieldObjectiveDue(r)).toBe(false);
  });
  it('requires escorts to return, respects population/herd caps, and waits for all marked raiders', () => {
    for (const kind of ['herd', 'refugees'] as const) {
      const r = objective(kind);
      r.clan.population = GAME.clan.maxPopulation - 1;
      r.clan.herd = GAME.clan.maxHerd - 1;
      advanceFieldObjective(r, 2, point, camp, 0);
      expect(r.field.objective!.status).toBe('returning');
      advanceFieldObjective(r, 2, point, camp, 0);
      expect(r.field.objective!.status).toBe('returning');
      Object.assign(r.field.objective!, camp);
      advanceFieldObjective(r, 0.1, camp, camp, 0);
      expect(r.field.objective!.status).toBe('complete');
      expect(r.clan.population).toBeLessThanOrEqual(GAME.clan.maxPopulation);
      expect(r.clan.herd).toBeLessThanOrEqual(GAME.clan.maxHerd);
    }
    const r = objective('gathering');
    r.field.objective!.guards = GAME.field.guards;
    advanceFieldObjective(r, 2, point, camp, 0);
    expect(r.clan.spirit).toBe(0);
    r.field.objective!.defeated = GAME.field.guards;
    advanceFieldObjective(r, 2, point, camp, 0);
    expect(r.clan.spirit).toBe(10);
  });
  it('abandons unclaimed rewards on departure and resets per-area opportunities on arrival', () => {
    const r = objective('supplies'),
      before = r.clan.food;
    r.clan.stage = 'migration';
    syncFieldState(r);
    expect(r.field.objective).toBeUndefined();
    expect(fieldObjectiveDue(r)).toBe(false);
    expect(r.clan.food).toBe(before);
    r.clan.region = 1;
    r.clan.stage = 'camp';
    syncFieldState(r);
    expect(r.field.issued).toBe(0);
    expect(fieldObjectiveDue(r)).toBe(true);
  });
});
