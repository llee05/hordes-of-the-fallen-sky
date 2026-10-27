import { describe, expect, it } from 'vitest';
import { RESEARCH, RESEARCH_BY_ID, researchRegistryErrors } from '../../src/game/data/research';
import { UPGRADES } from '../../src/game/data/upgrades';
import {
  previewResearchPurchase,
  purchaseResearch,
  researchSpend,
  validateResearchPurchase,
  type ResearchState,
} from '../../src/game/state/research';
const state = (): ResearchState => ({ upgrades: {}, pendingUpgrades: 100, completedCrossings: 0 });

describe('V2 research registry and transaction', () => {
  it('contains the canonical 166 technologies, 174 ranks and unchanged legacy IDs', () => {
    expect(RESEARCH).toHaveLength(166);
    expect(RESEARCH.reduce((sum, t) => sum + t.maxRank, 0)).toBe(174);
    expect(RESEARCH.filter((t) => t.maxRank === 2)).toHaveLength(8);
    expect(RESEARCH.filter((t) => t.tier === 'mythic')).toHaveLength(24);
    expect(RESEARCH.filter((t) => t.tier === 'hybrid')).toHaveLength(16);
    expect(RESEARCH.filter((t) => t.tier === 'general')).toHaveLength(12);
    expect(researchRegistryErrors()).toEqual([]);
    for (const u of UPGRADES) {
      const t = RESEARCH_BY_ID.get(u.id)!;
      expect(t.maxRank).toBe(u.maxStacks);
      expect(t.requiresAll).toEqual(u.requires ?? []);
      expect(t.pointCostPerRank).toEqual(Array(u.maxStacks).fill(u.knowledgeCost ?? 1));
    }
  });
  it('atomically rejects unknown, stale, missing budget and replayed purchases', () => {
    const s = state();
    const original = structuredClone(s);
    expect(purchaseResearch(s, 'unknown', 0).allowed).toBe(false);
    expect(purchaseResearch(s, 'power', 1).reasonCodes).toContain('stale-rank');
    expect(s).toEqual(original);
    const p = previewResearchPurchase(s, 'power', 0);
    expect(s).toEqual(original);
    expect(purchaseResearch(s, 'power', 0).allowed).toBe(true);
    expect(s).toEqual(p.projected);
    expect(purchaseResearch(s, 'power', 0).allowed).toBe(false);
    expect(purchaseResearch(s, 'power', 1).allowed).toBe(true);
    expect(purchaseResearch(s, 'power', 2).reasonCodes).toContain('max-rank');
    s.pendingUpgrades = 0;
    expect(purchaseResearch(s, 'haste', 0).reasonCodes).toContain('knowledge');
  });
  it('keeps all three Archery doctrines exclusive and patrons independent', () => {
    const s = state();
    s.upgrades = { power: 2, haste: 1, 'piercing-shaft': 1, 'wide-quiver': 1 };
    expect(purchaseResearch(s, 'one-perfect-shot', 0).allowed).toBe(true);
    for (const id of ['through-the-horde', 'sky-volley'])
      expect(validateResearchPurchase(s, id, 0).reasonCodes).toContain('exclusive');
    s.upgrades['ancestral-companion'] = 2;
    s.upgrades['remembered-aim'] = 1;
    expect(purchaseResearch(s, 'council-of-ancestors', 0).allowed).toBe(true);
  });
  it('checks pre-purchase tier spend, required ranks, ANY and crossing milestones independently', () => {
    const s = state();
    s.upgrades = { power: 1, haste: 1 };
    expect(validateResearchPurchase(s, 'km-draw-to-breath', 0).reasonCodes).toContain(
      'patron-spend',
    );
    s.upgrades.power = 2;
    expect(validateResearchPurchase(s, 'km-draw-to-breath', 0).reasonCodes).not.toContain(
      'patron-spend',
    );
    expect(validateResearchPurchase(s, 'on-quiet-council', 0).missingRequirements).toEqual([
      { id: 'ancestral-companion', rank: 2 },
    ]);
    expect(validateResearchPurchase(s, 'on-whispered-orders', 0).reasonCodes).toContain(
      'any-prerequisite',
    );
    s.upgrades['keeper-of-names'] = 1;
    expect(validateResearchPurchase(s, 'on-whispered-orders', 0).reasonCodes).not.toContain(
      'any-prerequisite',
    );
    s.upgrades['gen-field-discipline'] = 1;
    expect(validateResearchPurchase(s, 'gen-watchful-night', 0).reasonCodes).toContain('crossings');
    s.completedCrossings = 1;
    expect(validateResearchPurchase(s, 'gen-watchful-night', 0).reasonCodes).not.toContain(
      'crossings',
    );
  });
  it('never sells an unimplemented effect or counts hybrid/general spend toward patrons', () => {
    const s = state();
    s.upgrades = { power: 2, haste: 1, 'hy-galloping-barrage': 1, 'gen-mapmaker': 1 };
    expect(researchSpend(s)['khukhedei-mergen']).toBe(3);
    expect(validateResearchPurchase(s, 'km-world-piercer', 0).reasonCodes).toContain(
      'unimplemented',
    );
    const before = structuredClone(s);
    expect(purchaseResearch(s, 'km-world-piercer', 0).allowed).toBe(false);
    expect(s).toEqual(before);
  });
});
