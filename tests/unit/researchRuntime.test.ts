import {
  gallopingBarrage,
  researchGallop,
  researchWaterRadius,
} from '../../src/game/state/researchRuntime';
import { advancePatrons } from '../../src/game/state/patrons';
import { damageKhan } from '../../src/game/state/khan';
import { economyRates } from '../../src/game/state/economy';
import { wagonResearchDefence } from '../../src/game/state/researchRuntime';
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
  it('limits barrage to personal shots in the two seconds after a real Gallop', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['hy-galloping-barrage'] = 1;
    expect(gallopingBarrage(r, true).damage).toBe(1);
    researchGallop(r);
    expect(gallopingBarrage(r, true)).toEqual({ damage: 1.1, speed: 1.2 });
    expect(gallopingBarrage(r, false).damage).toBe(1);
    r.elapsed = 2.01;
    expect(gallopingBarrage(r, true).damage).toBe(1);
  });
  it('caps River of Spirits radius, expires on active time and never changes base stats', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['hy-river-of-spirits'] = 1;
    const base = r.patrons.water.radius;
    for (let i = 0; i < 10; i++) recordResearchShard(r);
    expect(researchWaterRadius(r)).toBe(base + 25);
    expect(r.patrons.water.radius).toBe(base);
    r.elapsed = 4;
    expect(researchWaterRadius(r)).toBe(base);
  });
  it('applies Stillwater Refuge only to a living Khan with an active slowing field', () => {
    const r = createRun();
    r.phase = 'playing';
    r.health = 90;
    r.upgrades['hy-stillwater-refuge'] = 1;
    advancePatrons(r, 1);
    expect(r.health).toBe(90);
    r.patrons.water.slow = 0.12;
    advancePatrons(r, 1);
    expect(r.health).toBe(90.25);
    damageKhan(r, 10);
    expect(r.health).toBe(80.75);
    r.health = 0;
    r.khan.successionRemaining = 5;
    advancePatrons(r, 1);
    expect(r.health).toBe(0);
  });
  it('applies Deep Roots to food exhaustion, with no production on the road', () => {
    const r = createRun();
    const full = economyRates(r).foodProduction;
    r.clan.pasture = 0;
    expect(economyRates(r).foodProduction).toBe(0);
    r.upgrades['ee-deep-roots'] = 1;
    expect(economyRates(r).foodProduction).toBeCloseTo(full * 0.2);
    r.clan.stage = 'migration';
    expect(economyRates(r).foodProduction).toBe(0);
  });
  it('reduces subsequent hits within three active seconds, resets across succession', () => {
    const r = createRun();
    r.phase = 'playing';
    r.upgrades['go-layered-felt'] = 1;
    damageKhan(r, 10);
    expect(r.health).toBe(90);
    r.elapsed = 1;
    damageKhan(r, 10);
    expect(r.health).toBe(81);
    r.elapsed = 4;
    damageKhan(r, 10);
    expect(r.health).toBe(71);
    r.khan.generation++;
    damageKhan(r, 10);
    expect(r.health).toBe(61);
    r.phase = 'paused';
    damageKhan(r, 10);
    expect(r.health).toBe(61);
  });
  it('protects resolve only above 80% living Khan health', () => {
    const r = createRun();
    const base = clanDamageMultiplier(r);
    r.upgrades['go-common-fire'] = 1;
    expect(clanDamageMultiplier(r)).toBeCloseTo(base * 0.9);
    r.health = 80;
    expect(clanDamageMultiplier(r)).toBe(base);
    r.health = 100;
    r.khan.successionRemaining = 1;
    expect(clanDamageMultiplier(r)).toBe(base);
  });
  it('gives guardian research real baseline defence with zero optional buildings', () => {
    const r = createRun();
    expect(wagonResearchDefence(r).active).toBe(false);
    r.pendingUpgrades = 10;
    for (const id of [
      'caravan-foundations',
      'caravan-foundations',
      'watchfires',
      'rolling-fortress',
    ])
      expect(applyResearch(r, id)).toBe(true);
    expect(wagonResearchDefence(r)).toMatchObject({ active: true, fallback: true, range: 260 });
    expect(wagonResearchDefence(r).damage).toBeCloseTo(0.525);
    expect(r.clan.buildings.wagon).toBe(0);
    r.clan.buildings.wagon = 1;
    expect(wagonResearchDefence(r).fallback).toBe(false);
    expect(wagonResearchDefence(r).damage).toBe(2.25);
  });
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
