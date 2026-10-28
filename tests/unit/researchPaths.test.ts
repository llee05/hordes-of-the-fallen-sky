import { describe, expect, it } from 'vitest';
import { RESEARCH } from '../../src/game/data/research';
import { planResearch } from '../../src/game/state/researchPaths';
import { validateResearchPurchase, type ResearchState } from '../../src/game/state/research';
const state = (): ResearchState => ({ upgrades: {}, pendingUpgrades: 75, completedCrossings: 3 });
describe('legal research route search', () => {
  it('finds and validates every authored Mythic and hybrid, including tier-spend fillers', () => {
    for (const t of RESEARCH.filter((t) => t.tier === 'mythic' || t.tier === 'hybrid')) {
      const s = state(),
        p = planResearch(s, t.id, true);
      expect(p.reasons, t.id).toEqual([]);
      expect(p.steps.length, t.id).toBeGreaterThan(0);
      for (const step of p.steps) {
        const validation = validateResearchPurchase(s, step.id, step.rank - 1);
        expect(
          validation.reasonCodes.filter((c) => c !== 'unimplemented'),
          `${t.id}: ${step.id}`,
        ).toEqual([]);
        s.upgrades[step.id] = step.rank;
        s.pendingUpgrades -= step.cost;
      }
      expect(s.upgrades[t.id], t.id).toBe(1);
      expect(p.cost, t.id).toBeLessThanOrEqual(45);
    }
  }, 30000);
  it('keeps unavailable goals and exclusive conflicts truthful', () => {
    const s = state();
    expect(planResearch(s, 'km-world-piercer').reasons[0]).toContain('Unavailable');
    s.upgrades = { power: 2, haste: 1, 'one-perfect-shot': 1 };
    expect(planResearch(s, 'km-world-piercer', true).reasons[0]).toContain('specialization');
  });
  it('plans a legal implemented early hybrid and accounts for both independently funded patrons', () => {
    const s = state(),
      p = planResearch(s, 'hy-galloping-barrage');
    expect(p.reasons).toEqual([]);
    expect(p.cost).toBe(6);
    for (const step of p.steps) {
      expect(validateResearchPurchase(s, step.id, step.rank - 1).allowed).toBe(true);
      s.upgrades[step.id] = step.rank;
      s.pendingUpgrades -= step.cost;
    }
    expect(s.upgrades['hy-galloping-barrage']).toBe(1);
  });
  it('reports general crossing milestones independently of price and prerequisites', () => {
    const s = state();
    s.completedCrossings = 0;
    expect(planResearch(s, 'gen-great-gathering', true).reasons).toEqual([
      'Complete 3 crossings first',
    ]);
  });
});
