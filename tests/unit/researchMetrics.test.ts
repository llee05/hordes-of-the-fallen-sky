import { UPGRADES } from '../../src/game/data/upgrades';
import { describe, expect, it } from 'vitest';
import { RESEARCH } from '../../src/game/data/research';
import { PATRONS } from '../../src/game/data/patrons';
import { applyResearch, createRun, gainExperience } from '../../src/game/state/run';
import {
  purchaseResearch,
  researchSpend,
  researchState,
  validateResearchPurchase,
  type ResearchState,
} from '../../src/game/state/research';
import {
  researchSummary,
  observeResearchFrame,
  recordResearchDamage,
} from '../../src/game/state/researchMetrics';
import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { world } from './fixtures/expedition';
import {
  echoInterval,
  recordResearchShard,
  researchEchoRelease,
} from '../../src/game/state/researchRuntime';
import { researchPreviewById } from '../../src/game/state/progressionPreview';

describe('research accounting and observation', () => {
  it('conserves awarded points and records purchases once, without preview events', () => {
    const r = createRun();
    gainExperience(r, 3 * 20 ** 2 + 5 * 20);
    expect(r.pendingUpgrades).toBe(20);
    r.elapsed = 10;
    const before = structuredClone(r);
    researchPreviewById(r, 'power');
    expect(r).toEqual(before);
    expect(applyResearch(r, 'power', 0)).toBe(true);
    expect(applyResearch(r, 'power', 0)).toBe(false);
    expect(r.researchPurchases).toEqual([{ id: 'power', rank: 1, cost: 1, at: 10 }]);
    const summary = researchSummary(r);
    expect(summary.accountedKnowledge).toBe(20);
    expect(summary.knowledgeFromLevels).toBe(20);
    expect(summary.totalSpent).toBe(1);
    expect(summary.unspent).toBe(19);
    expect(researchSummary(createRun()).sampledFrames).toBe(0);
  });
  it('uses actual receipts, with authored-price fallback only for legacy ranks', () => {
    const s: ResearchState = {
      upgrades: { power: 2, haste: 1, 'hy-galloping-barrage': 1 },
      pendingUpgrades: 3,
      completedCrossings: 0,
      researchPurchases: [{ id: 'power', rank: 1, cost: 2, at: 0 }],
    };
    expect(researchSpend(s)['khukhedei-mergen']).toBe(4);
  });
  it('records only active frames and effective positive damage; survives saves', () => {
    const r = createRun();
    r.phase = 'playing';
    r.elapsed = 10;
    observeResearchFrame(r, 16);
    observeResearchFrame(r, 24);
    recordResearchDamage(r, 'khan', 8);
    recordResearchDamage(r, 'allied-arrows', 4);
    r.phase = 'paused';
    observeResearchFrame(r, 1000);
    recordResearchDamage(r, 'khan', 50);
    const before = structuredClone(r);
    const summary = researchSummary(r);
    expect(r).toEqual(before);
    expect(summary.meanFrameMilliseconds).toBe(20);
    expect(summary.worstFrameMilliseconds).toBe(24);
    expect(summary.damage).toEqual({ khan: 8, 'allied-arrows': 4, 'support-and-other': 0 });
    expect(decodeExpedition(captureExpedition(r, world())).run.researchObservations).toEqual(
      r.researchObservations,
    );
    delete r.researchObservations;
    expect(
      decodeExpedition(captureExpedition(r, world())).run.researchObservations,
    ).toBeUndefined();
  });
  it('counts each echo actual targeted attack independently', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-ancestral-archers'] = 1;
    expect(researchEchoRelease(r, 0)).toBe(false);
    expect(researchEchoRelease(r, 1)).toBe(false);
    expect(researchEchoRelease(r, 0)).toBe(false);
    expect(researchEchoRelease(r, 0)).toBe(false);
    expect(researchEchoRelease(r, 1)).toBe(false);
    expect(researchEchoRelease(r, 0)).toBe(true);
    expect(researchEchoRelease(r, 1)).toBe(false);
    expect(researchEchoRelease(r, 1)).toBe(true);
    expect(researchEchoRelease(r, 999)).toBe(false);
  });
  it('shows combined conditional recovery rather than omitting the existing Refuge bonus', () => {
    const r = createRun();
    r.upgrades = { 'hy-stillwater-refuge': 1, vitality: 1 };
    r.patrons.water.slow = 0.12;
    r.pendingUpgrades = 1;
    const changes = researchPreviewById(r, 'carried-embers');
    expect(changes.find((c) => c.label === 'Khan recovery')).toMatchObject({
      before: '0.25/s',
      after: '0.55/s',
    });
    r.phase = 'playing';
    r.upgrades['on-memory-vessels'] = 1;
    recordResearchShard(r);
    expect(echoInterval(r)).toBeLessThan(r.patrons.ancestors.interval);
  });
});

describe('research authoring acceptance and adversarial sequences', () => {
  it('locks the original immutable IDs and canonical global tier gates', () => {
    const ids =
      'wolf-trail culling-bite pursuit-gallop blood-of-the-hunt wind-rider tended-pasture shared-labour measured-herds living-earth hands-of-the-steppe power haste piercing-shaft sky-volley wide-quiver one-perfect-shot through-the-horde vitality carried-embers felt-and-fire last-ember unbroken-hearth watercourse reed-beds turned-earth returning-current still-waters ancestral-companion remembered-aim spirit-thread council-of-ancestors keeper-of-names sworn-riders rallying-banner ordered-march unbroken-standard caravan-vanguard caravan-foundations watchfires stone-shelter hold-the-passage rolling-fortress'.split(
        ' ',
      );
    expect(UPGRADES.map((t) => t.id).sort()).toEqual(ids.sort());
    for (const t of RESEARCH) {
      const gate = ({ t2: 3, t3: 6, t4: 10, mythic: 14 } as Record<string, number>)[t.tier];
      if (gate) expect(t.minSpendByPatron).toEqual({ [t.patronIds[0]!]: gate });
      if (t.tier === 'hybrid') {
        expect(new Set(t.patronIds).size).toBe(2);
        expect(Object.values(t.minSpendByPatron)).toEqual([
          t.pointCostPerRank[0] === 2 ? 2 : 5,
          t.pointCostPerRank[0] === 2 ? 2 : 5,
        ]);
      }
    }
  });
  it('keeps exact patron expansion counts and only sells effects with real adapters', () => {
    for (const p of PATRONS)
      expect(
        RESEARCH.filter(
          (t) =>
            t.patronIds.length === 1 &&
            t.patronIds[0] === p.id &&
            ['t2', 't3', 't4', 'mythic'].includes(t.tier),
        ),
      ).toHaveLength(12);
    expect(RESEARCH.filter((t) => !t.unavailableReason)).toHaveLength(53);
    for (const t of RESEARCH) expect(t.effects.length > 0).toBe(!t.unavailableReason);
  });
  it('checks exact tier threshold and threshold-minus-one before the candidate purchase', () => {
    const cases: [string, Record<string, number>, string][] = [
      ['km-draw-to-breath', { power: 2, haste: 1 }, 'power'],
      [
        'km-eagle-eye',
        { power: 2, haste: 1, 'one-perfect-shot': 1, 'km-draw-to-breath': 1 },
        'power',
      ],
      [
        'km-still-hand',
        {
          power: 2,
          haste: 1,
          'piercing-shaft': 1,
          'wide-quiver': 1,
          'one-perfect-shot': 1,
          'km-draw-to-breath': 1,
          'km-eagle-eye': 1,
        },
        'wide-quiver',
      ],
      [
        'km-one-arrow-one-fate',
        {
          power: 2,
          haste: 1,
          'piercing-shaft': 1,
          'wide-quiver': 1,
          'one-perfect-shot': 1,
          'km-draw-to-breath': 1,
          'km-barbed-flight': 1,
          'km-feathered-fan': 1,
          'km-eagle-eye': 1,
          'km-still-hand': 1,
        },
        'km-barbed-flight',
      ],
    ];
    for (const [id, upgrades, remove] of cases) {
      const s: ResearchState = {
        upgrades: { ...upgrades },
        pendingUpgrades: 100,
        completedCrossings: 0,
      };
      expect(validateResearchPurchase(s, id, 0).reasonCodes, id).not.toContain('patron-spend');
      s.upgrades[remove]!--;
      expect(validateResearchPurchase(s, id, 0).reasonCodes, id).toContain('patron-spend');
    }
  });
  it('keeps random accepted sequences legal and refused transactions completely unchanged', () => {
    let seed = 71;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed;
    };
    for (let sample = 0; sample < 25; sample++) {
      const s: ResearchState = {
        upgrades: {},
        pendingUpgrades: 75,
        completedCrossings: sample % 4,
      };
      for (let i = 0; i < 200; i++) {
        const t = RESEARCH[next() % RESEARCH.length]!;
        const expected = (s.upgrades[t.id] ?? 0) + (next() % 7 === 0 ? 1 : 0);
        const before = structuredClone(s);
        const result = purchaseResearch(s, t.id, expected);
        if (!result.allowed) expect(s).toEqual(before);
        const spent = (s.researchPurchases ?? []).reduce((sum, p) => sum + p.cost, 0);
        expect(spent + s.pendingUpgrades).toBe(75);
        for (const group of new Set(RESEARCH.map((t) => t.exclusiveGroup).filter(Boolean)))
          expect(
            RESEARCH.filter((t) => t.exclusiveGroup === group && (s.upgrades[t.id] ?? 0) > 0)
              .length,
          ).toBeLessThanOrEqual(1);
      }
    }
  });
  it('rejects duplicated and unowned receipts rather than allowing fake patron spend', () => {
    const r = createRun();
    r.pendingUpgrades = 2;
    applyResearch(r, 'power');
    const save = captureExpedition(r, world());
    const duplicate = structuredClone(save);
    (duplicate.run as any).researchPurchases.push((duplicate.run as any).researchPurchases[0]);
    expect(() => decodeExpedition(duplicate)).toThrow();
    const unowned = structuredClone(save);
    (unowned.run as any).researchPurchases[0].id = 'haste';
    expect(() => decodeExpedition(unowned)).toThrow();
  });
  it('retains actual purchase receipts through a version-1 save', () => {
    const r = createRun();
    r.pendingUpgrades = 2;
    applyResearch(r, 'power');
    const loaded = decodeExpedition(captureExpedition(r, world())).run;
    expect(loaded.researchPurchases).toEqual(r.researchPurchases);
    expect(researchSummary(loaded).totalSpent).toBe(1);
    expect(researchState(loaded).researchPurchases).toEqual(r.researchPurchases);
  });
});
