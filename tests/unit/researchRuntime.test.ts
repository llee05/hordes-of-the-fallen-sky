import { captureExpedition, decodeExpedition } from '../../src/game/state/expeditionArchive';
import { world } from './fixtures/expedition';
import { describe, expect, it } from 'vitest';
import { createRun, applyResearch } from '../../src/game/state/run';
import {
  echoInterval,
  echoPrefers,
  recordKhanTarget,
  recordResearchShard,
  researchEchoRelease,
  updateEchoGuard,
  wideVolleyResearch,
} from '../../src/game/state/researchRuntime';
import { clanDamageMultiplier } from '../../src/game/state/clan';
import { researchPreviewById } from '../../src/game/state/progressionPreview';

describe('supported V2 combat slice', () => {
  it('round-trips runtime timers in version-1 saves and accepts older saves', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-memory-vessels'] = 1;
    recordResearchShard(r);
    expect(decodeExpedition(captureExpedition(r, world())).run.researchRuntime).toEqual(
      r.researchRuntime,
    );
    delete r.researchRuntime;
    expect(decodeExpedition(captureExpedition(r, world())).run.researchRuntime).toBeUndefined();
  });
  it('limits target priority to the hit generation and three active seconds', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-spirit-signal'] = 1;
    recordKhanTarget(r, 2, 4);
    expect(echoPrefers(r, 2, 4)).toBe(true);
    expect(echoPrefers(r, 2, 5)).toBe(false);
    r.elapsed = 3;
    expect(echoPrefers(r, 2, 4)).toBe(false);
    r.phase = 'paused';
    recordKhanTarget(r, 3, 8);
    expect(r.researchRuntime?.targetSlot).toBe(2);
  });
  it('caps shard cadence bonuses and expires rather than stacking forever', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-memory-vessels'] = 1;
    const base = echoInterval(r);
    for (let i = 0; i < 30; i++) recordResearchShard(r);
    expect(r.researchRuntime?.memoryStacks).toBe(15);
    expect(echoInterval(r)).toBeCloseTo(base / 1.15);
    r.elapsed = 4;
    expect(echoInterval(r)).toBe(base);
    recordResearchShard(r);
    expect(r.researchRuntime?.memoryStacks).toBe(1);
    r.phase = 'paused';
    recordResearchShard(r);
    expect(r.researchRuntime?.memoryStacks).toBe(1);
    expect(createRun().researchRuntime).toBeUndefined();
  });
  it('releases a capped twin every fourth echo volley, never in menus', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-ancestral-archers'] = 1;
    expect(Array.from({ length: 8 }, () => researchEchoRelease(r))).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
    r.phase = 'paused';
    expect(researchEchoRelease(r)).toBe(false);
    expect(r.researchRuntime?.echoReleases).toBe(8);
  });
  it('protects resolve only with a real echo near camp', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['on-quiet-council'] = 1;
    const base = clanDamageMultiplier(r);
    updateEchoGuard(r, true);
    expect(clanDamageMultiplier(r)).toBe(base);
    r.patrons.ancestors.count = 1;
    updateEchoGuard(r, true);
    expect(clanDamageMultiplier(r)).toBeCloseTo(base * 0.95);
    updateEchoGuard(r, false);
    expect(clanDamageMultiplier(r)).toBe(base);
  });
  it('widens only personal multi-arrow volleys and keeps previews free of runtime events', () => {
    const r = createRun();
    r.pendingUpgrades = 20;
    r.upgrades = { power: 2, 'wide-quiver': 1 };
    const before = structuredClone(r);
    researchPreviewById(r, 'km-feathered-fan');
    expect(r).toEqual(before);
    expect(applyResearch(r, 'km-feathered-fan')).toBe(true);
    expect(r.stats).toEqual(before.stats);
    expect(wideVolleyResearch(r, 2, true)).toEqual({ damage: 0.95, spread: 1.1 });
    expect(wideVolleyResearch(r, 1, true)).toEqual({ damage: 1, spread: 1 });
    expect(wideVolleyResearch(r, 2, false)).toEqual({ damage: 1, spread: 1 });
  });
});
